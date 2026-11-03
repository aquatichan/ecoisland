// Class chat: one live room per class. The server writes every message
// (worker/chat.ts) after checking membership, mutes, the language filter and
// flood limits. The teacher turns chat on, and can delete anything, mute a
// student, and review what classmates report.
import { Flag, MessageCircle, MessageCircleOff, MoreHorizontal, SendHorizontal, ShieldCheck, Trash2, Volume2, VolumeX } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, Skeleton } from "@/components/ui/empty";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { Switch } from "@/components/ui/switch";
import { track } from "@/lib/analytics";
import { api, errorMessage } from "@/lib/api";
import { updateClass, useCollection, type WithId } from "@/lib/data";
import { useToast } from "@/lib/toast";
import { cn, storageGet, storageSet } from "@/lib/utils";
import type { ClassDoc, MemberDoc, MessageDoc } from "@/shared/types";

export const CHAT_MAX_CHARS = 500;
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

  const setChat = async (on: boolean) => {
    setToggling(true);
    try {
      await updateClass(cls.id, { chat_enabled: on });
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
              onReport={(m) => act("chat/report", { messageId: m.id }, "Reported. Your teacher will take a look.")}
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
                <Flag className="mt-0.5 size-4 shrink-0 text-fg-4" aria-hidden /> Reported messages are flagged for you.
              </li>
            </ul>
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
              <li>{cls.teacher_name} can read and remove anything posted here.</li>
              <li>Don't share phone numbers, addresses or passwords.</li>
              <li>See something wrong? Use the message menu to report it.</li>
            </ul>
          </Card>
        )}
      </div>
    </div>
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
                      <Flag /> Reported{(m.reports?.length ?? 0) > 1 ? ` by ${m.reports?.length}` : ""}
                    </Badge>
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
                <div className="absolute top-1 right-1.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
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

  const send = async () => {
    if (!trimmed || over || sending || disabled) return;
    setSending(true);
    try {
      await api("chat/send", { classId, text });
      setText("");
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
