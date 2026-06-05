# Migration: Dashboard Screen

## Reference
- v0.1 HTML markup: search for `screen-dashboard`
- v0.1 logic: `renderDashboard` function

## What it does
Five cards giving operators and managers visibility into where stock lives,
recent activity, and master-match status.

## Cards
| # | Card | Component |
|---|------|-----------|
| 1 | Where is this item? | `WhereIsThisItemCard` — search input + grouped-by-shelf results |
| 2 | Items by Zone | `ItemsByZoneCard` — Recharts horizontal bar chart |
| 3 | NEW vs EXISTING | `NewVsExistingCard` — single split bar |
| 4 | Top & Bottom Shelves | `TopBottomShelvesCard` — two columns, top 10 / bottom 10 |
| 5 | Recent Activity | `RecentActivityCard` — last 20 captures + transfers merged |

## Data
Single hook `useDashboardData()` returns:
```ts
{
  byZone: { zone: string; count: number }[];
  newCount: number;
  existingCount: number;
  topShelves: { shelf: string; count: number }[];
  bottomShelves: { shelf: string; count: number }[];
  recent: Array<{ ts: string; type: 'capture' | 'transfer'; text: string }>;
}
```
Use a single Supabase RPC (`get_dashboard_data()`) returning JSON to avoid 5 round-trips.

## Components
- `src/screens/Dashboard/DashboardScreen.tsx` — layout
- `src/screens/Dashboard/cards/WhereIsThisItemCard.tsx`
- `src/screens/Dashboard/cards/ItemsByZoneCard.tsx`
- `src/screens/Dashboard/cards/NewVsExistingCard.tsx`
- `src/screens/Dashboard/cards/TopBottomShelvesCard.tsx`
- `src/screens/Dashboard/cards/RecentActivityCard.tsx`

## Done when
- All 5 cards render with real data
- Search debounced 250ms, groups by shelf
- Bar chart matches v0.1 visually
- Recent activity sorted desc, capped at 20
