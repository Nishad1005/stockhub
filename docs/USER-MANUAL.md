# U&M Designs StockHub — User Manual

A simple guide to using StockHub for the Store Tanawada warehouse.
For storekeepers, managers, and admins. Keep this handy or print it.

---

## 1. What StockHub is

StockHub is the app that keeps track of **what stock is on which shelf** in the warehouse.
You **scan a shelf barcode**, then record the items on it. You can also **move** stock between
shelves, **receive** new stock in, **issue** stock out, and **find** where any item is — all from
your phone.

- Open it in your phone's web browser at the link your admin shares (a Netlify web address).
- Tip: add it to your home screen so it opens like an app.
- The **camera scanner needs the secure (https) link** — use the link your admin gives you, not a
  number-only address.

---

## 2. Getting in

### Create your account
1. Open the app → on the sign-in screen tap **"Create account"**.
2. Enter your **full name, email, and a password** (6+ characters) → **Create account**.
3. You'll see **"An admin will approve your access."**

### Wait for approval
- When you sign in before approval, you'll see a **"Waiting for approval"** screen.
- An **admin** approves you and gives you a role (Storekeeper / Manager / Admin).
- Once approved, sign in again and you're in.

### Sign in / Sign out
- **Sign in:** email + password.
- **Sign out:** **Settings ⚙️ → Account → Sign out**.
- The app remembers you, so next time it opens straight to your screens.

---

## 3. The screens (bottom tabs)

| Tab | What it's for |
|-----|---------------|
| 📷 **Capture** | Record items on a shelf (the main daily job) |
| 📦 **Items** | Browse / search everything captured; edit or delete |
| 🔄 **Transfers** | Move stock from one shelf to another (with an STN note) |
| 📊 **Stock** | Receive stock IN, issue stock OUT, and see stock levels |
| 🔍 **Find** | "Where is this item?" + counts and alerts |
| 🏷️ **Barcodes** | Assign item codes, print item labels, reprint shelf labels |
| ⚙️ **Settings** | Exports, your account, and (for managers/admins) controls |

> You'll only see buttons for the actions your role is allowed to do (see §9).

---

## 4. Shelf codes — quick explainer

Every shelf has a code like **`Z2-G005`**:
- **Z2** = the zone (warehouse area).
- **G** = the fixture type: **S** = Shelf, **G** = Ghoda, **P** = Pallet, **R** = Rack.
- **005** = the shelf number.

When you **scan** a shelf, the app fills the code in and **sets the zone automatically**. You almost
never type these — you scan the printed barcode.

If you ever see **"⚠ Not a registered shelf"**, the code isn't one of the warehouse's known shelves
(usually a typo). You can still save, but double-check it.

---

## 5. Capture — recording stock on a shelf (📷)

This is the everyday task: tell the app "these items are on this shelf."

1. Go to **Capture**.
2. **Scan the shelf barcode** (tap **📷 Scan** and point at the shelf label). The zone fills in
   automatically, and the shelf **stays set ("sticky")** so you can add several items to it in a row.
3. **Find the item:** start typing its name — matches from the catalogue appear; tap the right one.
   - If it's a known item, its code (e.g. `ITM-00042`) and details fill in (a green ✓ badge shows).
   - If it's a brand-new item not in the catalogue, just type the name — it's saved as **NEW** and
     gets a code later (see §11).
4. **Quantity** (optional), **notes**, and a **photo** (optional — tap to take one).
5. Tap **Save**. A green "Saved" message confirms it. The shelf stays selected for the next item.
6. To switch shelves, scan the next shelf barcode (or tap **✕ Clear**).

**Tips**
- A **USB/Bluetooth scanner** also works — just scan, no tapping needed.
- No camera? A manager can turn on **Manual Entry** (Settings) so you can type shelf codes.

---

## 6. Find — where is an item? (🔍)

1. Go to **Find**.
2. Type an item **name or code**, or tap **Scan** to scan an item's barcode.
3. You'll see **which shelf(es)** it's on, grouped by location, with quantities.
4. Below, you'll also see **zone counts**, **NEW vs catalogue** items, and **recent captures**.

Tap any item row to open its **Item Detail** (see §7).

---

## 7. Item Detail — everything about one item (tap any item)

Tapping an item in **Items**, **Find**, or **Stock levels** opens a card showing:
- the item's **code, name, and total quantity** across all shelves;
- **every shelf** it sits on, with quantity;
- its **recent activity** (stock in/out and transfers).

From here you can act in one tap (item + shelf already filled in):
- **📥 Stock IN** — receive more of this item.
- On each shelf row: **Move** (transfer it), **Out** (issue it), **Edit** (change/correct it).

This is the fastest way to work — no re-typing the item or shelf.

---

## 8. Moving and counting stock

### Transfer — move stock between shelves (🔄)
Use when stock physically moves from one shelf to another.
1. **Transfers → ＋ New Transfer**.
2. Pick the **item**, **scan the From shelf**, then **scan the To shelf** (zones auto-fill).
3. Enter the **quantity**. A banner tells you how much is on hand at the source.
4. **Save** — you get an **STN** number (e.g. `STN/2026-06/0042`). The item now shows at the new shelf.

### Stock IN — receiving stock (📊)
1. **Stock → 📥 Stock IN**.
2. Item, **scan the shelf** it's going to, **quantity**, and **supplier/source**.
3. **Save** — you get a **GRN** number. The shelf quantity goes **up** (or a new entry is created).

### Stock OUT — issuing stock (📊)
1. **Stock → 📤 Stock OUT**.
2. Item, **scan the shelf**, **quantity**, and **department/destination** (e.g. Stitching, Dispatch, Scrap).
3. **Save** — you get an **MIR** number. The shelf quantity goes **down**.
4. If you issue **more than the system shows**, it asks you to confirm. It still records it and flags it
   as a **discrepancy** for a manager to review.

### Stock levels & history (📊)
- **Stock levels** — quantity per item, broken down by shelf; "empty" and "out of stock" are highlighted.
- **History** — every IN/OUT, newest first. Tap **"Discrepancies only"** to see just the flagged ones.

---

## 9. Items — browse, edit, delete (📦)

- **Items** lists everything captured. Filter by **zone**, **NEW vs existing**, or **home area**.
- Tap an item → **Item Detail** → **Edit** to correct name, qty, shelf, etc.
- **Edit-lock:** entries lock for editing a set number of hours after capture (default 24h). A locked
  entry shows 🔒. A **manager** can tap **🔓 Unlock** to edit it for the current session.
- **Delete** removes an entry (subject to the same lock + your permissions).

---

## 10. What each role can do

- **Storekeeper** — the daily work: capture, transfer, stock in/out, edit, export.
- **Manager** — all of the above **plus** unlock locked entries, change access/edit-lock settings,
  and see the **Alerts** panel.
- **Admin** — everything, **plus manage users and permissions**.

> An admin can **fine-tune exactly which actions each role can do** (e.g. allow or block transfers for
> storekeepers). So your buttons may differ from a teammate's — that's intentional. If a button you
> need is missing, ask your admin.

---

## 11. Barcodes — codes & labels (🏷️)

### Assign codes to NEW items
- NEW items (not in the catalogue) need a code before printing.
- Tap **"Assign codes to N NEW"** (or **Assign ITM code** on a single item). They get an `ITM-#####` code.

### Print item labels
- Tick the items you want, then **⬇ Download labels (PDF)** → print on your label printer.

### Reprint shelf labels
- Scroll to **Shelf labels** → pick a **zone** → **⬇ PDF**.
- You get that zone's shelf barcodes in the **same design as the existing labels**, so a reprint is a
  drop-in replacement for a damaged label. (Open to everyone.)

---

## 12. Settings (⚙️)

Everyone sees:
- **Exports** — download **entries** and **transfers** as CSV (opens in Excel; Hindi text preserved).
- **Data** — counts of entries, photos, transfers.
- **Master Data** — catalogue summary (items, zones, categories, sections).
- **Account** — your email/role and **Sign out**.

Managers/admins also see:
- **Access Controls** — set the **Edit-Lock Window** (how long entries stay editable) and toggle
  **Manual Entry Mode** (type shelf codes instead of scanning, for this device/session).

Admins also see:
- **Manage users** → the Users screen (§13).

---

## 13. Admin — managing users & permissions

**Settings → Manage users** (admins only):
- **Pending approvals** — new sign-ups appear here. Pick a role to **approve** each one.
- **All users** — change anyone's role (Storekeeper / Manager / Admin). You can't change your **own**
  role (so the team never gets locked out of admin).
- **Role permissions** — tick/untick exactly which actions Storekeepers and Managers can perform
  (capture, transfer, stock in/out, edit, delete, export, etc.). Admins always have full access.

> Make sure at least one trusted person is an **Admin** — only admins can approve users and set roles.

---

## 14. Scanning tips

- Use the **secure (https) link** — the camera won't open otherwise.
- Hold steady, good light, fill the box with the barcode.
- **USB/Bluetooth scanners** work anywhere a shelf is scanned — just scan.
- **No camera / scanner?** A manager can enable **Manual Entry Mode** (Settings) to type codes.

---

## 15. Troubleshooting

| Problem | Fix |
|---------|-----|
| Stuck on "Waiting for approval" | An **admin** must approve you in **Manage users**. |
| Camera won't open | Use the **https** link (not a number address); allow camera permission. |
| "⚠ Not a registered shelf" | The shelf code isn't a known shelf — check for a typo; you can still save. |
| A button I need is missing | Your **role** may not have that permission — ask your admin. |
| Can't edit an old entry (🔒) | It's past the edit-lock window — a **manager** can **Unlock** it. |
| Stock number looks wrong | Check **Item Detail** → shelves + recent activity; use **Stock OUT/IN** to correct. |

---

## 16. Glossary

- **Zone** — a warehouse area (Z01–Z11). **Shelf** — a spot in a zone (`Z2-G005`).
- **Fixture** — S Shelf · G Ghoda · P Pallet · R Rack.
- **Capture** — recording that an item is on a shelf.
- **Transfer / STN** — moving stock between shelves; STN is its note number.
- **Stock IN / GRN** — receiving stock. **Stock OUT / MIR** — issuing stock.
- **Discrepancy** — issuing more than the system shows (flagged for managers).
- **Master / ITM code** — the item catalogue; each item's `ITM-#####` code.
- **Edit-lock** — entries lock for editing after a set time; managers can unlock.

---

*Questions or a button not working as expected? Tell your admin — most things (access, roles,
permissions, new shelves, labels) can be sorted from inside the app.*
