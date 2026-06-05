/**
 * build-master.mjs — generate supabase/seed/master_items.sql from the factory
 * Stock-Analysis CSV, preserving v0.1's ITM codes and appending new ones.
 *
 * Strategy (per user decisions):
 *  - Item code = ITM-NNNNN. Reuse the v0.1 ITM code when an item's name matches
 *    a v0.1 master entry; otherwise assign the next free code from ITM-02028.
 *  - Preserve the factory Product Code in master_items.sku.
 *  - category  <- CSV "Category" column (stored as-is; may be pipe-delimited).
 *  - definition<- CSV "Product Definition"; unit parsed from "Quantity".
 *
 * Item identity (for dedup) = Product Code (sku) when present, else the
 * normalized name. v0.1 is name-keyed, so a name shared by several SKUs can
 * only inherit the old ITM once (first by deterministic order); the rest get
 * fresh ITM codes. All such cases are listed in the report.
 *
 * Usage: node supabase/seed/build-master.mjs ["path/to/Stock_Analysis.csv"]
 * Reads v0.1 master from legacy/UM_Designs_StockHub.html (read-only).
 * Writes: supabase/seed/master_items.sql + supabase/seed/master_items.report.txt
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const CSV_PATH =
  process.argv[2] || "C:\\Users\\nalaw\\Downloads\\Stock_Analysis (5).csv";
const HTML_PATH = resolve(repoRoot, "legacy", "UM_Designs_StockHub.html");
const OUT_SQL = resolve(__dirname, "master_items.sql");
const OUT_REPORT = resolve(__dirname, "master_items.report.txt");
const NEW_CODE_START = 2028; // v0.1 master ends at ITM-02027

// ── helpers ──────────────────────────────────────────────────────────────
const normName = (s) =>
  String(s || "").replace(/\s+/g, " ").trim().toUpperCase();
const sqlStr = (v) =>
  v === null || v === undefined || v === "" ? "null" : `'${String(v).replace(/'/g, "''")}'`;
const itm = (n) => `ITM-${String(n).padStart(5, "0")}`;

function parseUnit(qty) {
  // "85.0 roll" -> "roll"; "-160.0 pc" -> "pc"; "0.0 m" -> "m"; "" -> null
  const m = String(qty || "").match(/^\s*-?[\d.,]+\s+(.*\S)\s*$/);
  return m ? m[1].trim() : null;
}

// Minimal RFC-4180-ish CSV parser (quotes, "" escapes, embedded newlines, CRLF)
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (ch === "\r") { /* skip; \n handles EOL */ }
    else field += ch;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// ── load v0.1 master (name -> ITM code) ──────────────────────────────────
const html = readFileSync(HTML_PATH, "utf8");
const m = html.match(/const ITEMS\s*=\s*(\[[\s\S]*?\]);/);
if (!m) throw new Error("Could not locate `const ITEMS = [...]` in legacy HTML");
const v01 = JSON.parse(m[1]);
const v01ByName = new Map(); // normName -> code (first wins)
let v01MaxCode = 0;
for (const it of v01) {
  const n = normName(it.p);
  if (n && !v01ByName.has(n)) v01ByName.set(n, it.c);
  const num = parseInt(String(it.c).replace(/\D/g, ""), 10);
  if (Number.isFinite(num)) v01MaxCode = Math.max(v01MaxCode, num);
}

// ── load + parse new CSV ─────────────────────────────────────────────────
const rows = parseCsv(readFileSync(CSV_PATH, "utf8"));
const header = rows.shift().map((h) => h.trim());
const col = (name) => header.indexOf(name);
const C = {
  product: col("Product"),
  def: col("Product Definition"),
  code: col("Product Code"),
  qty: col("Quantity"),
  category: col("Category"),
};
for (const [k, v] of Object.entries(C))
  if (v < 0) throw new Error(`CSV missing expected column for "${k}"`);

// dedup by identity (sku || name)
const items = [];
const seen = new Map(); // identity -> index in items
const dupRows = [];
let blankNameRows = 0;
for (const r of rows) {
  if (!r.length || r.every((c) => c.trim() === "")) continue;
  const name = (r[C.product] || "").trim();
  if (!name) { blankNameRows++; continue; }
  const sku = (r[C.code] || "").trim();
  const identity = sku ? `SKU:${sku}` : `NAME:${normName(name)}`;
  if (seen.has(identity)) {
    dupRows.push({ identity, name, sku });
    continue;
  }
  seen.set(identity, items.length);
  items.push({
    name,
    sku: sku || null,
    definition: (r[C.def] || "").trim() || null,
    category: (r[C.category] || "").trim() || null,
    unit: parseUnit(r[C.qty]),
  });
}

// ── assign ITM codes ─────────────────────────────────────────────────────
// Deterministic order: by sku (nulls last), then name.
items.sort((a, b) => {
  const as = a.sku ?? "￿", bs = b.sku ?? "￿";
  return as < bs ? -1 : as > bs ? 1 : a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
});
const claimed = new Set();
let nextNew = Math.max(NEW_CODE_START, v01MaxCode + 1);
let reused = 0, assigned = 0;
const sameNameSplit = []; // name matched v0.1 but ITM already claimed -> new code
for (const it of items) {
  const n = normName(it.name);
  const oldCode = v01ByName.get(n);
  if (oldCode && !claimed.has(oldCode)) {
    it.code = oldCode;
    claimed.add(oldCode);
    reused++;
  } else {
    if (oldCode) sameNameSplit.push({ name: it.name, sku: it.sku, oldCode });
    it.code = itm(nextNew++);
    assigned++;
  }
}
// Stable final order for the SQL file: by ITM code.
items.sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0));

// ── emit SQL ─────────────────────────────────────────────────────────────
const BATCH = 500;
let sql =
  "-- master_items seed — generated by supabase/seed/build-master.mjs\n" +
  "-- Source: Stock_Analysis CSV. Requires migration 0003 (sku column).\n" +
  "-- Re-runnable: on conflict (code) do nothing.\n\n";
for (let i = 0; i < items.length; i += BATCH) {
  const chunk = items.slice(i, i + BATCH);
  sql += "insert into master_items (code, name, definition, category, unit, sku) values\n";
  sql += chunk
    .map(
      (it) =>
        `  (${sqlStr(it.code)}, ${sqlStr(it.name)}, ${sqlStr(it.definition)}, ` +
        `${sqlStr(it.category)}, ${sqlStr(it.unit)}, ${sqlStr(it.sku)})`,
    )
    .join(",\n");
  sql += "\non conflict (code) do nothing;\n\n";
}
writeFileSync(OUT_SQL, sql, "utf8");

// ── emit report ──────────────────────────────────────────────────────────
const blankSku = items.filter((it) => !it.sku).length;
const blankCat = items.filter((it) => !it.category).length;
const pipeCat = items.filter((it) => it.category && it.category.includes("|")).length;
const lines = [
  "master_items import report",
  "==========================",
  `CSV source            : ${CSV_PATH}`,
  `v0.1 master entries   : ${v01.length} (codes up to ITM-${String(v01MaxCode).padStart(5, "0")})`,
  ``,
  `Raw data rows         : ${rows.length}`,
  `  blank product name  : ${blankNameRows} (skipped)`,
  `  duplicate identity  : ${dupRows.length} (collapsed; same SKU or, if no SKU, same name)`,
  `Unique master items   : ${items.length}`,
  ``,
  `ITM codes reused (name matched v0.1) : ${reused}`,
  `ITM codes newly assigned             : ${assigned}  (ITM-${String(Math.max(NEW_CODE_START, v01MaxCode + 1)).padStart(5, "0")} .. ${itm(nextNew - 1)})`,
  ``,
  `Items with no SKU      : ${blankSku}`,
  `Items with blank category : ${blankCat}`,
  `Items with pipe '|' category (multi-value, stored as-is) : ${pipeCat}`,
  ``,
  `Same-name-but-new-code (name matched v0.1 but ITM already claimed by another SKU): ${sameNameSplit.length}`,
  ...sameNameSplit.slice(0, 40).map((s) => `   ${s.oldCode}  ${s.sku ?? "(no sku)"}  ${s.name}`),
  sameNameSplit.length > 40 ? `   …and ${sameNameSplit.length - 40} more` : "",
  ``,
  `Duplicate rows collapsed (first 30):`,
  ...dupRows.slice(0, 30).map((d) => `   ${d.identity}  ${d.name}`),
  dupRows.length > 30 ? `   …and ${dupRows.length - 30} more` : "",
].filter((l) => l !== "");
writeFileSync(OUT_REPORT, lines.join("\n") + "\n", "utf8");

console.log(lines.join("\n"));
console.log(`\nWrote ${OUT_SQL}`);
console.log(`Wrote ${OUT_REPORT}`);
