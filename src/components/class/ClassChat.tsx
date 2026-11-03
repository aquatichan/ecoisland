// Class chat: one live room per class, with no private messages. The server
// writes every message (worker/chat.ts) after checking membership, mutes,
// language, harassment, links, contact details and flood limits. The teacher
// turns chat on, and can delete anything, mute a student, review reports and
// read the moderation log.
import { Clock, Flag, HeartHandshake, History, MessageCircle, MessageCircleOff, MoreHorizontal, SendHorizontal, ShieldCheck, Trash2, Volume2, VolumeX } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { EmptyState, Skeleton } from "@/components/ui/empty";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { Switch } from "@/components/ui/switch";
import { track } from "@/lib/analytics";
import { api, errorMessage } from "@/lib/api";
import { useCollection, type WithId } from "@/lib/data";
import { useToast } from "@/lib/toast";
import { cn, storageGet, storageSet } from "@/lib/utils";
import type { ClassDoc, MemberDoc, MessageDoc, ModerationDoc } from "@/shared/types";

export const CHAT_MAX_CHARS = 500;
const RETENTION_DAYS = 90;

const REASONS: { value: string; label: string }[] = [
  { value: "harassment", label: "Bullying or harassment" },
  { value: "inappropriate", label: "Inappropriate or offensive" },
  { value: "personal_info", label: "Shares someone's personal information" },
  { value: "wellbeing", label: "I'm worried about this person" },
  { value: "spam", label: "Spam" },
  { value: "other", label: "Something else" },
];
const REASON_LABEL: Record<string, string> = Object.fromEntries(REASONS.map((r) => [r.value, r.label]));
const GROUP_MS = 5 * 60_000;

const readKey = (classId: string) => `eco.chat.read.${classId}`;

/** The newest message in a class, for the unread dot on the Chat tab. */
export function useChatUnread(classId: string, enabled: boolean, viewing: boolean): boolean {
  const { items } = useCollection<Omit<MessageDoc, "id">>(enabled ? `classes/${classId}/messages` : null, { orderBy: ["created_at", "desc"], limit: 1 });
  const latest = items[0]?.created_at ?? "";
  const [read, setRead] = useState(() => storageGet(readKey(classId)) ?? "");
  useEffect(() => {
    if (viewing && latest && latest > read) {
      storageSet(readKey(classId), latest);
      setRead(latest);
    }
  }, [viewing, latest, read, classId]);
  return !viewing && !!latest && latest > read;
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export function ClassChat({ cls, teacher, meId, members }: { cls: WithId<ClassDoc>; teacher: boolean; meId: string; members: WithId<MemberDoc>[] }) {
  const toast = useToast();
  const enabled = cls.chat_enabled === true;
  const { items, loading, error } = useCollection<Omit<MessageDoc, "id">>(`classes/${cls.id}/messages`, { orderBy: ["created_at", "desc"], limit: 150 });
  const messages = useMemo(() => [...items].reverse(), [items]);
  const muted = useMemo(() => new Set(members.filter((m) => m.muted).map((m) => m.uid)), [members]);
  const meMuted = !teacher && muted.has(meId);
  const reported = messages.filter((m) => m.reported && !m.deleted);
  const [toggling, setToggling] = useState(false);
  const [reporting, setReporting] = useState<WithId<Omit<MessageDoc, "id">> | null>(null);
  const [showLog, setShowLog] = useState(false);

  const setChat = async (on: boolean) => {
    setToggling(true);
    try {
      await api("chat/toggle", { classId: cls.id, enabled: on });
      track("class_chat_toggled", { on });
    } catch (err) {
      toast.show({ tone: "error", title: "Couldn't change chat", body: errorMessage(err) });
    } finally {
      setToggling(false);
    }
  };

  const act = async (route: string, body: Record<string, unknown>, done?: string) => {
    try {
      await api(route, { classId: cls.id, ...body });
      if (done) toast.show({ tone: "success", title: done });
    } catch (err) {
      toast.show({ tone: "error", title: "That didn't work", body: errorMessage(err) });
    }
  };

  if (!enabled && !teacher) {
    return (
      <Card>
        <EmptyState icon={MessageCircleOff} title="Chat is off" body={`${cls.teacher_name} hasn't turned on class chat. When they do, you can talk with your class here.`} />
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_300px] gap-6">
      <Card className="flex h-[min(680px,calc(100dvh-330px))] min-h-[460px] flex-col overflow-hidden">
        {!enabled ? (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState
              icon={MessageCircle}
              title="Class chat is off"
              body="Turn it on to give your class one place to ask questions and share what they find. Only this class can see it, and you can remove anything."
              action={
                <Button onClick={() => setChat(true)} loading={toggling}>
                  <MessageCircle /> Turn on chat
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <MessageList
              messages={messages}
              loading={loading}
              error={error}
              meId={meId}
              teacher={teacher}
              muted={muted}
              onDelete={(m) => act("chat/delete", { messageId: m.id })}
              onReport={(m) => setReporting(m)}
              onDismiss={(m) => act("chat/dismiss", { messageId: m.id }, "Kept the message")}
              onMute={(uid, on) => act("chat/mute", { uid, muted: on }, on ? "Muted in this chat" : "Unmuted")}
            />
            <Composer classId={cls.id} disabled={meMuted} disabledReason={meMuted ? "Your teacher has muted you in this chat. You can still read messages." : null} />
          </>
        )}
      </Card>

      <div className="space-y-4 self-start">
        {teacher ? (
          <Card className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[15px] font-semibold text-fg">Class chat</h2>
                <p className="mt-1 text-[13px] text-fg-3">{enabled ? "On. Students can post." : "Off. Nobody can post."}</p>
              </div>
              <Switch checked={enabled} onChange={setChat} label="Class chat" disabled={toggling} />
            </div>
            <ul className="mt-5 space-y-2.5 text-[13px] text-fg-3">
              <li className="flex gap-2.5">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden /> Only you and this class can read it.
              </li>
              <li className="flex gap-2.5">
                <Trash2 className="mt-0.5 size-4 shrink-0 text-fg-4" aria-hidden /> Delete any message from its menu.
              </li>
              <li className="flex gap-2.5">
                <VolumeX className="mt-0.5 size-4 shrink-0 text-fg-4" aria-hidden /> Mute a student to stop them posting.
              </li>
              <li className="flex gap-2.5">
                <Flag className="mt-0.5 size-4 shrink-0 text-fg-4" aria-hidden /> Reported messages, and ones suggesting a student may be struggling, are flagged for you.
              </li>
              <li className="flex gap-2.5">
                <Clock className="mt-0.5 size-4 shrink-0 text-fg-4" aria-hidden /> Messages are deleted after {RETENTION_DAYS} days. The moderation log keeps a copy for a year.
              </li>
            </ul>
            <Button variant="secondary" size="sm" className="mt-5 w-full" onClick={() => setShowLog(true)}>
              <History /> Moderation log
            </Button>
            {reported.length > 0 && (
              <p className="mt-5 rounded-lg bg-coral-soft px-3.5 py-2.5 text-[13px] font-semibold text-coral">
                {reported.length} reported {reported.length === 1 ? "message needs" : "messages need"} review
              </p>
            )}
            {muted.size > 0 && (
              <div className="mt-5 border-t border-line pt-4">
                <p className="text-[12.5px] font-semibold text-fg-3">Muted</p>
                <ul className="mt-2 space-y-1.5">
                  {members
                    .filter((m) => m.muted)
                    .map((m) => (
                      <li key={m.uid} className="flex items-center justify-between gap-2 text-[13.5px] text-fg-2">
                        <span className="truncate">{m.username}</span>
                        <Button size="sm" variant="ghost" onClick={() => act("chat/mute", { uid: m.uid, muted: false }, "Unmuted")}>
                          <Volume2 /> Unmute
                        </Button>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </Card>
        ) : (
          <Card className="p-6">
            <h2 className="text-[15px] font-semibold text-fg">Chat guidelines</h2>
            <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-fg-3">
              <li>Be kind and keep it about class.</li>
              <li>Everything here is visible to the whole class and to {cls.teacher_name}. There are no private messages.</li>
              <li>Phone numbers, emails, social media, addresses and outside links aren't allowed. Links to course sites like College Board, Khan Academy and .gov pages are fine.</li>
              <li>See something wrong, or worried about someone? Use the message menu to report it. Only your teacher sees who reported.</li>
              <li>Messages are deleted after {RETENTION_DAYS} days.</li>
            </ul>
            <div className="mt-4 flex gap-2.5 rounded-lg bg-surface-2/70 p-3 text-[12.5px] leading-relaxed text-fg-3">
              <HeartHandshake className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
              <span>
                Going through something hard? Talk to a trusted adult, or call or text <span className="font-semibold text-fg-2">988</span> (US) any time.
              </span>
            </div>
          </Card>
        )}
      </div>
      {reporting && (
        <ReportDialog
          message={reporting}
          onClose={() => setReporting(null)}
          onReport={async (reason) => {
            await act("chat/report", { messageId: reporting.id, reason }, "Reported. Only your teacher sees who reported it.");
            setReporting(null);
          }}
        />
      )}
      {showLog && <ModerationLog classId={cls.id} members={members} onClose={() => setShowLog(false)} />}
    </div>
  );
}

function ReportDialog({ message, onClose, onReport }: { message: WithId<Omit<MessageDoc, "id">>; onClose: () => void; onReport: (reason: string) => Promise<void> }) {
  const [reason, setReason] = useState("harassment");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Report this message" description="Your teacher will see the message and why you reported it. Classmates won't know it was you.">
        <blockquote className="rounded-lg border-l-2 border-line-strong bg-surface-2/60 px-4 py-3 text-[14px] text-fg-2">
          <span className="font-semibold text-fg">{message.name}:</span> {message.text}
        </blockquote>
        <fieldset className="mt-4 space-y-1.5">
          <legend className="mb-2 text-[13px] font-semibold text-fg-2">What's wrong?</legend>
          {REASONS.map((r) => (
            <label key={r.value} className="flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2 text-[14px] text-fg-2 hover:bg-surface-2">
              <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} className="size-4 accent-[var(--brand)]" />
              {r.label}
            </label>
          ))}
        </fieldset>
        {reason === "wellbeing" && (
          <p className="mt-3 rounded-lg bg-brand-soft/60 p-3 text-[13px] text-fg-2">
            Thank you for looking out for them. If someone is in danger right now, tell a trusted adult. In the US you can call or text 988 any time.
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={busy}
            onClick={async () => {
              setBusy(true);
              await onReport(reason);
              setBusy(false);
            }}
          >
            <Flag /> Report
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const ACTION_LABEL: Record<ModerationDoc["action"], string> = {
  deleted: "Deleted",
  reported: "Reported",
  dismissed: "Kept after review",
  muted: "Muted",
  unmuted: "Unmuted",
  blocked: "Blocked before posting",
  flagged: "Flagged automatically",
  chat_on: "Chat turned on",
  chat_off: "Chat turned off",
};

/** The teacher-only record of every moderation event, newest first. */
function ModerationLog({ classId, members, onClose }: { classId: string; members: WithId<MemberDoc>[]; onClose: () => void }) {
  const nameOf = (uid: string) => members.find((m) => m.uid === uid)?.username ?? "a former member";
  const { items, loading } = useCollection<Omit<ModerationDoc, "id">>(`classes/${classId}/moderation`, { orderBy: ["at", "desc"], limit: 100 });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent wide title="Moderation log" description="Every delete, report, mute and blocked message in this chat, with a copy of the text. Only you can see this. Records are kept for one year.">
        {loading ? (
          <Skeleton className="h-40" />
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-[14px] text-fg-3">Nothing yet.</p>
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line">
            {items.map((r) => (
              <li key={r.id} className="px-4 py-3 text-[13.5px]">
                <div className="flex items-center gap-2">
                  <Badge tone={r.action === "blocked" || r.action === "flagged" || r.action === "reported" ? "coral" : r.action === "deleted" || r.action === "muted" ? "sun" : "neutral"}>{ACTION_LABEL[r.action] ?? r.action}</Badge>
                  {r.author_name && <span className="font-semibold text-fg">{r.author_name}</span>}
                  {r.reason && <span className="text-fg-3">· {REASON_LABEL[r.reason] ?? r.reason}</span>}
                  <time className="ml-auto text-[12px] text-fg-4" dateTime={r.at}>
                    {new Date(r.at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </time>
                </div>
                {r.text && <p className="mt-1.5 whitespace-pre-wrap text-fg-2">{r.text}</p>}
                {r.action === "reported" && <p className="mt-1 text-[12px] text-fg-4">Reported by {nameOf(r.actor_uid)}</p>}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MessageList({
  messages,
  loading,
  error,
  meId,
  teacher,
  muted,
  onDelete,
  onReport,
  onDismiss,
  onMute,
}: {
  messages: WithId<Omit<MessageDoc, "id">>[];
  loading: boolean;
  error: boolean;
  meId: string;
  teacher: boolean;
  muted: Set<string>;
  onDelete: (m: WithId<Omit<MessageDoc, "id">>) => void;
  onReport: (m: WithId<Omit<MessageDoc, "id">>) => void;
  onDismiss: (m: WithId<Omit<MessageDoc, "id">>) => void;
  onMute: (uid: string, on: boolean) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const last = messages[messages.length - 1];

  // Stay pinned to the newest message unless the reader scrolled up.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (nearBottom.current || last?.uid === meId) el.scrollTop = el.scrollHeight;
  }, [last?.id, last?.uid, meId, loading]);

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-6">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="h-12 w-3/5" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <EmptyState icon={MessageCircleOff} title="Couldn't load the chat" body="Check your connection and refresh the page." />
      </div>
    );
  }
  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <EmptyState icon={MessageCircle} title="No messages yet" body="Start the conversation. Ask about today's lesson, or share something you noticed outside." />
      </div>
    );
  }

  return (
    <div
      ref={scroller}
      onScroll={(e) => {
        const el = e.currentTarget;
        nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      }}
      className="flex-1 overflow-y-auto px-4 py-5"
      role="log"
      aria-live="polite"
      aria-label="Class messages"
    >
      {messages.map((m, i) => {
        const prev = messages[i - 1];
        const newDay = !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString();
        const grouped = !newDay && prev && prev.uid === m.uid && !prev.deleted && Date.parse(m.created_at) - Date.parse(prev.created_at) < GROUP_MS;
        const own = m.uid === meId;
        const canDelete = !m.deleted && (teacher || own);
        const canReport = !m.deleted && !own && !teacher;
        const canMute = teacher && m.role === "student";
        const flagged = teacher && m.reported && !m.deleted;
        return (
          <div key={m.id}>
            {newDay && (
              <div className="my-4 flex items-center gap-3 first:mt-0" role="separator">
                <span className="h-px flex-1 bg-line" />
                <span className="text-[12px] font-semibold text-fg-4">{dayLabel(m.created_at)}</span>
                <span className="h-px flex-1 bg-line" />
              </div>
            )}
            <div
              className={cn(
                "group relative flex gap-3 rounded-[12px] px-2.5 transition-colors hover:bg-surface-2/60",
                grouped ? "py-0.5" : "mt-2 py-1.5",
                flagged && "bg-coral-soft/60 hover:bg-coral-soft ring-1 ring-coral/30",
              )}
            >
              <div className="w-9 shrink-0">
                {!grouped && <Avatar name={m.name} src={m.avatar_url} size={36} />}
              </div>
              <div className="min-w-0 flex-1 pr-10">
                {!grouped && (
                  <p className="flex items-center gap-2 text-[13.5px]">
                    <span className="font-semibold text-fg">{m.name}</span>
                    {m.role === "teacher" && <Badge tone="brand">Teacher</Badge>}
                    {own && m.role !== "teacher" && <span className="text-[12px] text-fg-4">You</span>}
                    {canMute && muted.has(m.uid) && (
                      <Badge tone="neutral">
                        <VolumeX /> Muted
                      </Badge>
                    )}
                    <time className="text-[12px] text-fg-4" dateTime={m.created_at}>
                      {timeLabel(m.created_at)}
                    </time>
                  </p>
                )}
                {m.deleted ? (
                  <p className="text-[14px] text-fg-4 italic">{m.deleted_by === "teacher" ? "Removed by the teacher" : "Message deleted"}</p>
                ) : (
                  <p className="text-[14.5px] leading-[1.55] break-words whitespace-pre-wrap text-fg-2">{m.text}</p>
                )}
                {flagged && (
                  <div className="mt-2 flex items-center gap-2">
                    <Badge tone="coral">
                      <Flag /> {(m.report_reasons ?? []).includes("wellbeing") ? "Check in with this student" : `Reported${(m.report_count ?? 0) > 1 ? ` ${m.report_count} times` : ""}`}
                    </Badge>
                    {(m.report_reasons ?? []).filter((r) => r !== "wellbeing").map((r) => (
                      <span key={r} className="text-[12px] text-coral">
                        {REASON_LABEL[r] ?? r}
                      </span>
                    ))}
                    <Button size="sm" variant="secondary" onClick={() => onDismiss(m)}>
                      Keep
                    </Button>
                    <Button size="sm" variant="danger-soft" onClick={() => onDelete(m)}>
                      <Trash2 /> Remove
                    </Button>
                  </div>
                )}
              </div>
              {(canDelete || canReport || canMute) && (
                <div className="absolute top-1 right-1.5 opacity-40 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                  <Menu>
                    <MenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label={`Options for ${m.name}'s message`}>
                        <MoreHorizontal />
                      </Button>
                    </MenuTrigger>
                    <MenuContent>
                      {canReport && (
                        <MenuItem onSelect={() => onReport(m)}>
                          <Flag /> Report to teacher
                        </MenuItem>
                      )}
                      {canMute && (
                        <MenuItem onSelect={() => onMute(m.uid, !muted.has(m.uid))}>
                          {muted.has(m.uid) ? <Volume2 /> : <VolumeX />} {muted.has(m.uid) ? `Unmute ${m.name}` : `Mute ${m.name}`}
                        </MenuItem>
                      )}
                      {canDelete && (canReport || canMute) && <MenuSeparator />}
                      {canDelete && (
                        <MenuItem danger onSelect={() => onDelete(m)}>
                          <Trash2 /> Delete message
                        </MenuItem>
                      )}
                    </MenuContent>
                  </Menu>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Composer({ classId, disabled, disabledReason }: { classId: string; disabled: boolean; disabledReason: string | null }) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const trimmed = text.trim();
  const over = text.length > CHAT_MAX_CHARS;

  // Grow with the text, up to about five lines.
  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [text]);

  const [support, setSupport] = useState(false);

  const send = async () => {
    if (!trimmed || over || sending || disabled) return;
    setSending(true);
    try {
      const res = await api<{ support?: boolean }>("chat/send", { classId, text });
      setText("");
      if (res.support) setSupport(true);
      track("chat_message_sent");
    } catch (err) {
      toast.show({ tone: "error", title: "Message not sent", body: errorMessage(err) });
    } finally {
      setSending(false);
      area.current?.focus({ preventScroll: true });
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send();
    }
  };

  if (disabled) {
    return (
      <div className="flex items-center gap-2.5 border-t border-line bg-surface-2/60 px-5 py-4 text-[13.5px] text-fg-3">
        <VolumeX className="size-4 shrink-0" aria-hidden /> {disabledReason}
      </div>
    );
  }

  return (
    <div className="border-t border-line p-3">
      {support && (
        <div className="mb-3 flex items-start gap-3 rounded-[12px] bg-brand-soft/70 p-3.5 text-[13.5px] text-fg-2" role="status">
          <HeartHandshake className="mt-0.5 size-4 shrink-0 text-brand-ink" aria-hidden />
          <p className="flex-1">
            It sounds like things might be hard right now. Your teacher can see your message and can help. You can also call or text <span className="font-semibold">988</span> (Suicide &amp; Crisis Lifeline, US) any time, day or night.
          </p>
          <button className="text-[12.5px] font-semibold text-fg-3 hover:text-fg" onClick={() => setSupport(false)}>
            Dismiss
          </button>
        </div>
      )}
      <div className="flex items-end gap-2 rounded-[14px] border border-line-strong bg-surface px-3 py-2 focus-within:border-brand focus-within:shadow-[var(--ring)]">
        <textarea
          ref={area}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="Message your class"
          aria-label="Message your class"
          className="max-h-[132px] min-h-[24px] flex-1 resize-none bg-transparent py-1 text-[14.5px] leading-[1.55] text-fg outline-none placeholder:text-fg-4 focus-visible:shadow-none focus-visible:outline-none"
        />
        {text.length > CHAT_MAX_CHARS - 80 && (
          <span className={cn("t-num pb-1.5 text-[12px]", over ? "font-semibold text-coral" : "text-fg-4")}>{CHAT_MAX_CHARS - text.length}</span>
        )}
        <Button size="icon-sm" onClick={send} disabled={!trimmed || over} loading={sending} aria-label="Send message">
          <SendHorizontal />
        </Button>
      </div>
      <p className="mt-1.5 px-1 text-[11.5px] text-fg-4">
        <span className="kbd">Enter</span> to send · <span className="kbd">Shift</span> + <span className="kbd">Enter</span> for a new line
      </p>
    </div>
  );
}
