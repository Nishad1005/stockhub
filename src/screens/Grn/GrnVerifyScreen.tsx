import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import { ArrowLeft } from "@/components/ui/icons";
import { useGrnDetail } from "@/hooks/useGrnDetail";
import { useGrnActivityLog } from "@/hooks/useGrnActivityLog";
import { useGrnGateEntryAttachments } from "@/hooks/useGrnGateEntryAttachments";
import { formatWaitingTime, waitingTone, minutesSince } from "@/lib/grn";
import type { GrnLineDetail } from "@/types/grn";

const STATUS_TONE: Record<string, BadgeTone> = {
  DRAFT: "neutral",
  VERIFIED: "warn",
  COMPLETED: "ok",
  REJECTED: "bad",
};

const QC_TONE: Record<string, BadgeTone> = {
  PENDING: "neutral",
  OK: "ok",
  HOLD: "warn",
  REJECT: "bad",
};

const ACTION_LABEL: Record<string, string> = {
  "grn.gate_entry.created": "Gate entry created",
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** GRN Stage 2 verification — read-only surface (interactive flow lands in Sprint 2.2b). */
export function GrnVerifyScreen() {
  const { grnId = "" } = useParams<{ grnId: string }>();
  const navigate = useNavigate();

  const { grn, gateEntry, lines, createdByProfile, isLoading } = useGrnDetail(grnId);
  const { photos } = useGrnGateEntryAttachments(gateEntry?.id ?? null);
  const { events, isLoading: activityLoading } = useGrnActivityLog(grnId);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

  // Live "waiting N min" — re-tick every 60s (a display clock, not a data fetch).
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-cream text-brand-ink">
        <main className="px-4 pt-6 pb-24 max-w-md mx-auto space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl bg-white shadow-card p-4 animate-pulse">
              <div className="h-4 w-32 bg-brand-accent-soft rounded mb-3" />
              <div className="h-3 w-48 bg-brand-accent-soft rounded mb-2" />
              <div className="h-3 w-40 bg-brand-accent-soft rounded" />
            </div>
          ))}
        </main>
      </div>
    );
  }

  if (!grn) {
    return (
      <div className="min-h-screen bg-brand-cream text-brand-ink">
        <main className="px-4 pt-10 pb-24 max-w-md mx-auto">
          <Card className="p-6 text-center space-y-3">
            <p className="text-base font-semibold text-brand-ink">GRN not found</p>
            <Button variant="secondary" fullWidth onClick={() => navigate("/dashboard")}>
              Back to dashboard
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  const anchorTs = gateEntry?.gateInAt ?? grn.createdAt;
  const waitingMinutes = minutesSince(anchorTs, nowMs);
  const headerTone =
    grn.status === "DRAFT" ? waitingTone(waitingMinutes) : STATUS_TONE[grn.status] ?? "neutral";

  return (
    <div className="min-h-screen bg-brand-cream text-brand-ink">
      <header className="px-4 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            aria-label="Back"
            className="w-8 h-8 -ml-1 flex items-center justify-center rounded-full text-brand-mute hover:bg-brand-accent-soft shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-brand-mute">
              GRN verification
            </div>
            <h1 className="font-mono text-lg font-extrabold text-brand-ink leading-tight truncate">
              {grn.grnNumber}
            </h1>
          </div>
          <Badge tone={headerTone} className="shrink-0">{grn.status}</Badge>
        </div>
      </header>

      <main className="px-4 pb-24 max-w-md mx-auto space-y-5">
        {/* GATE ENTRY */}
        <section>
          <SectionHeading>Gate entry</SectionHeading>
          <Card className="p-4">
            {gateEntry ? (
              <dl className="text-sm space-y-1.5">
                <DetailRow label="Vehicle" value={gateEntry.vehicleNumber} mono />
                <DetailRow label="Driver" value={gateEntry.driverName} />
                {gateEntry.driverLicense && <DetailRow label="License" value={gateEntry.driverLicense} mono />}
                {gateEntry.driverPhone && <DetailRow label="Phone" value={gateEntry.driverPhone} />}
                <DetailRow label="Supplier" value={grn.supplierName} />
                {grn.poRef && <DetailRow label="PO Ref" value={grn.poRef} mono />}
                {(grn.invoiceRef || grn.invoiceDate) && (
                  <DetailRow
                    label="Invoice"
                    value={`${grn.invoiceRef ?? "—"}${grn.invoiceDate ? ` · ${formatDate(grn.invoiceDate)}` : ""}`}
                  />
                )}
                <DetailRow
                  label="Gate In"
                  value={`${formatTime(gateEntry.gateInAt)} · waiting ${formatWaitingTime(waitingMinutes)}`}
                />
                <DetailRow label="Logged by" value={createdByProfile?.fullName ?? createdByProfile?.email ?? "—"} />
              </dl>
            ) : (
              <p className="text-sm text-brand-mute">No gate entry recorded.</p>
            )}

            {photos.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {photos.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setLightbox({ src: p.file_url, alt: "Gate entry photo" })}
                    className="w-20 h-20 rounded-lg overflow-hidden border border-brand-line"
                  >
                    <img src={p.file_url} alt="Gate entry photo" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {gateEntry?.notes && (
              <p className="text-sm text-brand-mute mt-3">
                <span className="font-semibold text-brand-ink">Notes:</span> {gateEntry.notes}
              </p>
            )}
          </Card>
        </section>

        {/* LINES */}
        <section>
          <SectionHeading>Lines ({lines.length})</SectionHeading>
          <Card className="p-4">
            {lines.length === 0 ? (
              <div className="text-center py-4 space-y-1.5">
                <p className="text-sm font-semibold text-brand-ink">Empty — verification not started.</p>
                <p className="text-sm text-brand-mute">
                  Storekeeper will transcribe invoice lines and scan received items here (Sprint 2.2b).
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-brand-line">
                {lines.map((l) => (
                  <LineRow key={l.id} line={l} />
                ))}
              </ul>
            )}
          </Card>
        </section>

        {/* TIMELINE */}
        <section>
          <SectionHeading>Timeline</SectionHeading>
          <Card className="p-4">
            {activityLoading ? (
              <p className="text-sm text-brand-mute">Loading…</p>
            ) : events.length === 0 ? (
              <p className="text-sm text-brand-mute">No activity recorded yet.</p>
            ) : (
              <ul className="space-y-2">
                {events.map((e) => (
                  <li key={e.id} className="flex items-start gap-2 text-sm">
                    <span className="w-2 h-2 rounded-full bg-brand-accent-2 mt-1.5 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-brand-ink">{ACTION_LABEL[e.action] ?? e.action}</span>
                      <span className="text-brand-mute">
                        {" · "}
                        {formatTime(e.createdAt)}
                        {e.actorName ? ` by ${e.actorName}` : ""}
                      </span>
                      {e.notes && <div className="text-xs text-brand-mute">{e.notes}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      </main>

      {lightbox && (
        <ImageLightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return <h2 className="text-xs font-bold uppercase tracking-wide text-brand-mute mb-2 px-1">{children}</h2>;
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-3">
      <dt className="w-20 shrink-0 text-brand-mute">{label}</dt>
      <dd className={`min-w-0 flex-1 text-brand-ink ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}

function LineRow({ line }: { line: GrnLineDetail }) {
  return (
    <li className="py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-medium text-brand-ink truncate">
            <span className="text-brand-mute font-mono mr-1">{line.lineNumber}.</span>
            {line.itemName}
            {line.isUnexpected && (
              <Badge tone="warn" className="ml-1">
                unexpected
              </Badge>
            )}
          </div>
          {line.itemCode && <div className="font-mono text-[11px] text-brand-mute">{line.itemCode}</div>}
        </div>
        <Badge tone={QC_TONE[line.qcStatus] ?? "neutral"} className="shrink-0">
          {line.qcStatus}
        </Badge>
      </div>
      <div className="text-xs text-brand-mute mt-0.5">
        {line.invoiceQty != null && <>Inv {line.invoiceQty} · </>}
        {line.receivedQty != null ? <>Recv {line.receivedQty}</> : "not received"}
        {line.varianceFlag && <span className="text-brand-bad"> · variance</span>}
      </div>
      {line.qcNotes && <div className="text-xs text-brand-mute mt-0.5">{line.qcNotes}</div>}
    </li>
  );
}
