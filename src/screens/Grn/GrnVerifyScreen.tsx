import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import { CameraScanner } from "@/components/CameraScanner";
import { ArrowLeft, Plus } from "@/components/ui/icons";
import { useAuth } from "@/hooks/useAuth";
import { useGrnDetail } from "@/hooks/useGrnDetail";
import { useGrnActivityLog } from "@/hooks/useGrnActivityLog";
import { useGrnGateEntryAttachments } from "@/hooks/useGrnGateEntryAttachments";
import { useGrnLines } from "@/hooks/useGrnLines";
import { formatWaitingTime, waitingTone, minutesSince } from "@/lib/grn";
import { errMessage } from "@/lib/errors";
import { toast } from "@/stores/toast";
import { GrnLineRow } from "./GrnLineRow";
import { GrnLineEditor } from "./GrnLineEditor";
import type { GrnLineDetail } from "@/types/grn";

const STATUS_TONE: Record<string, BadgeTone> = {
  DRAFT: "neutral",
  VERIFIED: "warn",
  COMPLETED: "ok",
  REJECTED: "bad",
};

const ACTION_LABEL: Record<string, string> = {
  "grn.gate_entry.created": "Gate entry created",
  "grn.line.added": "Line added",
  "grn.line.updated": "Line edited",
  "grn.line.removed": "Line removed",
};

// The camera re-decodes ~10fps; ignore repeat detections inside this window so
// one physical scan of an item = one +1 to that line's received qty.
const RECEIVE_SCAN_COOLDOWN_MS = 1200;

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** GRN Stage 2 verification — line entry + receiving (Sprint 2.2b-1). QC, unexpected
 * lines, and submit land in the next prompt; the GRN stays DRAFT throughout. */
export function GrnVerifyScreen() {
  const { grnId = "" } = useParams<{ grnId: string }>();
  const navigate = useNavigate();

  const { grn, gateEntry, lines, createdByProfile, isLoading } = useGrnDetail(grnId);
  const { photos } = useGrnGateEntryAttachments(gateEntry?.id ?? null);
  const { events, isLoading: activityLoading } = useGrnActivityLog(grnId);
  const { isManager } = useAuth();
  const { setReceivedQty, removeLine } = useGrnLines();
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

  // Line-entry UI state.
  const [addingLine, setAddingLine] = useState(false);
  const [editingLine, setEditingLine] = useState<GrnLineDetail | null>(null);
  const [receiveScanLine, setReceiveScanLine] = useState<GrnLineDetail | null>(null);
  const [removeTarget, setRemoveTarget] = useState<GrnLineDetail | null>(null);
  const lastScanRef = useRef(0);

  // Live "waiting N min" — re-tick every 60s (a display clock, not a data fetch).
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  function handleReceiveScan(decoded: string) {
    void decoded; // any successful decode counts one unit onto the active line
    const line = receiveScanLine;
    if (!line) return;
    const now = Date.now();
    if (now - lastScanRef.current < RECEIVE_SCAN_COOLDOWN_MS) return;
    lastScanRef.current = now;
    setReceivedQty.mutate(
      { id: line.id, grnId, mode: "increment" },
      {
        onSuccess: (updated) => toast(`${updated.itemName}: received ${updated.receivedQty}`, "ok"),
        onError: (e) => toast("Scan failed: " + errMessage(e), "err"),
      },
    );
  }

  function handleSetReceived(line: GrnLineDetail, absolute: number) {
    setReceivedQty.mutate(
      { id: line.id, grnId, mode: "absolute", value: absolute },
      { onError: (e) => toast("Update failed: " + errMessage(e), "err") },
    );
  }

  function confirmRemove() {
    const t = removeTarget;
    if (!t) return;
    removeLine.mutate(
      { id: t.id, grnId, lineNumber: t.lineNumber, itemName: t.itemName },
      {
        onSuccess: () => toast(`Removed line ${t.lineNumber}`, "ok"),
        onError: (e) => toast("Remove failed: " + errMessage(e), "err"),
      },
    );
    setRemoveTarget(null);
  }

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
  const isDraft = grn.status === "DRAFT";
  const headerTone = isDraft ? waitingTone(waitingMinutes) : STATUS_TONE[grn.status] ?? "neutral";

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
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-xs font-bold uppercase tracking-wide text-brand-mute">
              Lines ({lines.length})
            </h2>
            {isDraft && !addingLine && !editingLine && (
              <Button
                size="sm"
                variant="secondary"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  setEditingLine(null);
                  setAddingLine(true);
                }}
              >
                Add line
              </Button>
            )}
          </div>

          {isDraft && (addingLine || editingLine) && (
            <div className="mb-3">
              <GrnLineEditor
                grnId={grnId}
                line={editingLine}
                onDone={() => {
                  setAddingLine(false);
                  setEditingLine(null);
                }}
              />
            </div>
          )}

          <Card className="p-4">
            {lines.length === 0 ? (
              <div className="text-center py-4 space-y-1.5">
                <p className="text-sm font-semibold text-brand-ink">
                  {isDraft ? "No lines yet." : "No lines recorded."}
                </p>
                <p className="text-sm text-brand-mute">
                  {isDraft
                    ? "Add invoice lines above, then record received quantities by scan or manual entry."
                    : "Verification recorded no lines."}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-brand-line">
                {lines.map((l) => (
                  <GrnLineRow
                    key={l.id}
                    line={l}
                    isDraft={isDraft}
                    canRemove={isManager}
                    onScanReceive={setReceiveScanLine}
                    onSetReceived={handleSetReceived}
                    onEdit={(ln) => {
                      setAddingLine(false);
                      setEditingLine(ln);
                    }}
                    onRemove={setRemoveTarget}
                  />
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

      {/* Receive-by-scan: each decode bumps the active line by 1; stays open to
          count multiple units. Manual override is the numeric field on the row. */}
      <CameraScanner
        open={receiveScanLine != null}
        title={receiveScanLine ? `Scan to receive · ${receiveScanLine.itemName}` : "Scan to receive"}
        onClose={() => setReceiveScanLine(null)}
        onDetected={handleReceiveScan}
      />

      {removeTarget && (
        <Modal
          title="Remove line?"
          onClose={() => setRemoveTarget(null)}
          footer={
            <>
              <Button variant="secondary" fullWidth onClick={() => setRemoveTarget(null)}>
                Cancel
              </Button>
              <Button variant="bad" fullWidth onClick={confirmRemove}>
                Remove
              </Button>
            </>
          }
        >
          <p className="text-sm text-brand-ink">
            Remove line {removeTarget.lineNumber} — <b>{removeTarget.itemName}</b>? This can't be undone.
          </p>
        </Modal>
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
