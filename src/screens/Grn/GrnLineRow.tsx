import { useEffect, useRef, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Camera, Trash2 } from "@/components/ui/icons";
import type { GrnLineDetail } from "@/types/grn";

export interface GrnLineRowProps {
  line: GrnLineDetail;
  /** DRAFT GRN → the Received column is editable/scannable and edit/remove show. */
  isDraft: boolean;
  /** Whether the current user may remove a line (manager/admin per 0019 RLS). */
  canRemove: boolean;
  onScanReceive: (line: GrnLineDetail) => void;
  onSetReceived: (line: GrnLineDetail, absolute: number) => void;
  onEdit: (line: GrnLineDetail) => void;
  onRemove: (line: GrnLineDetail) => void;
}

const fmtQty = (n: number | null) => (n == null ? "—" : String(n));

/** One GRN line: item identity, PO | Invoice | Received compare, variance chip. */
export function GrnLineRow({
  line,
  isDraft,
  canRemove,
  onScanReceive,
  onSetReceived,
  onEdit,
  onRemove,
}: GrnLineRowProps) {
  // Local mirror of the received field so typing overrides the total; re-syncs
  // when the persisted value changes (e.g. after a scan increment refetches).
  const [recv, setRecv] = useState(line.receivedQty == null ? "" : String(line.receivedQty));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setRecv(line.receivedQty == null ? "" : String(line.receivedQty));
  }, [line.receivedQty]);

  function commit() {
    focused.current = false;
    const trimmed = recv.trim();
    // Empty is a no-op (leaves the qty untouched) — only an explicit "0" sets zero,
    // so tabbing through an un-received line never spuriously writes 0.
    if (trimmed === "") {
      setRecv(line.receivedQty == null ? "" : String(line.receivedQty));
      return;
    }
    const next = Number(trimmed);
    if (!Number.isFinite(next) || next < 0) {
      setRecv(line.receivedQty == null ? "" : String(line.receivedQty));
      return;
    }
    if (next !== (line.receivedQty ?? null)) onSetReceived(line, next);
  }

  const receivedChip =
    line.varianceFlag ? (
      <Badge tone="warn">variance</Badge>
    ) : line.receivedQty != null ? (
      <Badge tone="ok">match</Badge>
    ) : null;

  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-medium text-brand-ink">
            <span className="text-brand-mute font-mono mr-1">{line.lineNumber}.</span>
            {line.itemName}
            {line.isUnexpected && <Badge tone="warn" className="ml-1">unexpected</Badge>}
            {line.itemCode == null && <Badge tone="neutral" className="ml-1">NEW</Badge>}
          </div>
          {line.itemCode && (
            <div className="font-mono text-[11px] text-brand-mute">{line.itemCode}</div>
          )}
        </div>
        {isDraft && (
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="sm" onClick={() => onEdit(line)}>
              Edit
            </Button>
            {canRemove && (
              <Button
                variant="ghost"
                size="sm"
                icon={<Trash2 className="w-4 h-4" />}
                aria-label="Remove line"
                onClick={() => onRemove(line)}
              />
            )}
          </div>
        )}
      </div>

      {/* PO | Invoice | Received compare */}
      <div className="mt-2 flex items-end gap-2">
        <Col label="PO">{fmtQty(line.poQty)}</Col>
        <Col label="Invoice">{fmtQty(line.invoiceQty)}</Col>
        <div className="flex-1">
          <div className="text-[10px] font-bold uppercase tracking-wide text-brand-mute mb-1">
            Received
          </div>
          {isDraft ? (
            <div className="flex items-center gap-1">
              <div className="w-16">
                <Input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={recv}
                  placeholder="—"
                  onFocus={() => (focused.current = true)}
                  onChange={(e) => setRecv(e.target.value)}
                  onBlur={commit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                />
              </div>
              <Button
                variant="secondary"
                size="sm"
                icon={<Camera className="w-4 h-4" />}
                aria-label="Scan to receive"
                onClick={() => onScanReceive(line)}
              />
            </div>
          ) : (
            <div className="text-sm text-brand-ink">{fmtQty(line.receivedQty)}</div>
          )}
        </div>
        <div className="pb-1">{receivedChip}</div>
      </div>
    </li>
  );
}

function Col({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="w-14">
      <div className="text-[10px] font-bold uppercase tracking-wide text-brand-mute mb-1">
        {label}
      </div>
      <div className="text-sm text-brand-ink">{children}</div>
    </div>
  );
}
