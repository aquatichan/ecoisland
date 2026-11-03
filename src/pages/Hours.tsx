// A student's volunteer hours: every entry with its status, and a clean,
// printable service record of the verified ones.
import { ArrowLeft, HandHeart, Plus, Printer, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { LogHoursDialog, type VerifierOption } from "@/components/act/Dialogs";
import { LogoMark } from "@/components/app/Logo";
import { Page } from "@/components/app/Guards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, Skeleton } from "@/components/ui/empty";
import { formatHours, useMyHours } from "@/lib/act";
import { api, errorMessage } from "@/lib/api";
import { useClasses } from "@/lib/data";
import { useDocumentTitle } from "@/lib/hooks";
import { useProfile } from "@/lib/session";
import { useToast } from "@/lib/toast";
import type { HoursLog } from "@/shared/act";
import { formatDay } from "@/shared/dates";

const STATUS: Record<HoursLog["status"], { label: string; tone: "brand" | "sun" | "coral" | "neutral" }> = {
  verified: { label: "Verified", tone: "brand" },
  pending: { label: "Waiting", tone: "sun" },
  rejected: { label: "Not approved", tone: "coral" },
  self: { label: "Self-reported", tone: "neutral" },
};

const longDay = (d: string) => formatDay(d, { month: "short", day: "numeric", year: "numeric" });

export default function Hours() {
  const profile = useProfile();
  const toast = useToast();
  useDocumentTitle("Volunteer hours");
  const { items, loading } = useMyHours(profile.id);
  const { classes } = useClasses(profile.class_ids);
  const [logging, setLogging] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const verified = items.filter((h) => h.status === "verified");
  const total = verified.reduce((s, h) => s + h.hours, 0);
  const verifiers: VerifierOption[] = classes.map((c) => ({ classId: c.id, label: `${c.teacher_name} (${c.name})` }));
  const name = profile.full_name || profile.username || "Student";

  const remove = async (log: HoursLog) => {
    setDeleting(log.id);
    try {
      await api("hours/delete", { id: log.id });
    } catch (err) {
      toast.show({ tone: "error", title: "Couldn't delete", body: errorMessage(err) });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Page>
      <div className="print:hidden">
        <Link to="/act" className="mb-5 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-fg-3 hover:text-fg">
          <ArrowLeft className="size-4" /> Act
        </Link>
        <header className="mb-7 flex items-end justify-between gap-6">
          <div>
            <p className="t-eyebrow">Act</p>
            <h1 className="t-h1 mt-2.5">Volunteer hours</h1>
            <p className="mt-2 max-w-[60ch] text-[15px] text-fg-3">Log hours from any volunteering. When your teacher verifies them, they go on a service record you can print for school, clubs or applications.</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="secondary" onClick={() => window.print()} disabled={verified.length === 0}>
              <Printer /> Print record
            </Button>
            <Button onClick={() => setLogging(true)}>
              <Plus /> Log hours
            </Button>
          </div>
        </header>

        {loading ? (
          <Skeleton className="h-64 rounded-xl" />
        ) : items.length === 0 ? (
          <Card>
            <EmptyState icon={HandHeart} title="No hours logged yet" body="Volunteered at a cleanup, a garden, a shelter or a park? Log it here and ask your teacher to verify it." action={<Button onClick={() => setLogging(true)}><Plus /> Log hours</Button>} />
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-left text-[14px]">
              <thead className="border-b border-line bg-surface-2/50 text-[12.5px] text-fg-3">
                <tr>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Activity</th>
                  <th className="px-5 py-3 text-right font-semibold">Hours</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="w-12 px-3 py-3" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {items.map((h) => (
                  <tr key={h.id} className="border-b border-line align-top last:border-0">
                    <td className="t-num px-5 py-4 whitespace-nowrap text-fg-2">{longDay(h.date)}</td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-fg">{h.title}</p>
                      <p className="text-[13px] text-fg-3">{h.org_name}</p>
                      <p className="mt-1.5 line-clamp-2 text-[13px] text-fg-3">{h.text}</p>
                      {h.status === "rejected" && h.review_note && <p className="mt-1.5 text-[13px] text-coral">{h.review_note}</p>}
                    </td>
                    <td className="t-num px-5 py-4 text-right font-semibold text-fg">{h.hours}</td>
                    <td className="px-5 py-4">
                      <Badge tone={STATUS[h.status].tone}>{STATUS[h.status].label}</Badge>
                      {h.teacher_name && h.status !== "self" && <p className="mt-1 text-[12px] text-fg-4">{h.status === "verified" ? `by ${h.teacher_name}` : h.teacher_name}</p>}
                    </td>
                    <td className="px-3 py-4">
                      {h.status !== "verified" && (
                        <Button variant="ghost" size="icon-sm" aria-label={`Delete ${h.title}`} loading={deleting === h.id} onClick={() => remove(h)}>
                          <Trash2 />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>

      {/* The printed record: verified hours only. */}
      <section className="hidden bg-white text-black print:block" aria-hidden>
        <div className="flex items-center justify-between border-b-2 border-black pb-4">
          <div>
            <p className="text-[12px] font-semibold tracking-[0.12em] uppercase">Volunteer service record</p>
            <h1 className="mt-1 text-[26px] font-bold">{name}</h1>
          </div>
          <div className="flex items-center gap-2 text-[13px]">
            <LogoMark size={28} /> Ecoisland
          </div>
        </div>
        <table className="mt-6 w-full border-collapse text-left text-[12.5px]">
          <thead>
            <tr className="border-b border-black">
              <th className="py-2 pr-3">Date</th>
              <th className="py-2 pr-3">Activity</th>
              <th className="py-2 pr-3">Organization</th>
              <th className="py-2 pr-3">Verified by</th>
              <th className="py-2 text-right">Hours</th>
            </tr>
          </thead>
          <tbody>
            {verified.map((h) => (
              <tr key={h.id} className="border-b border-gray-300 align-top">
                <td className="py-2 pr-3 whitespace-nowrap">{longDay(h.date)}</td>
                <td className="py-2 pr-3">{h.title}</td>
                <td className="py-2 pr-3">{h.org_name}</td>
                <td className="py-2 pr-3">
                  {h.teacher_name}
                  {h.class_name ? `, ${h.class_name}` : ""}
                </td>
                <td className="py-2 text-right">{h.hours}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className="pt-3 font-bold">
                Total verified
              </td>
              <td className="pt-3 text-right font-bold">{formatHours(total)}</td>
            </tr>
          </tfoot>
        </table>
        <p className="mt-8 text-[11px] text-gray-600">
          Each entry was logged by the student and verified by their teacher on Ecoisland (ecoisland.xyz). Printed {new Date().toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}.
        </p>
      </section>

      {logging && <LogHoursDialog open onOpenChange={setLogging} verifiers={verifiers} />}
    </Page>
  );
}
