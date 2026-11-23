# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project
Leave Monitoring App: dependency-free, plain-JavaScript front-end (no backend, no build, no package.json, no linter). State is persisted in `localStorage` under key `Data.KEY` (currently `leave-app-v2`; bump it when seed users/requests change shape so stale saved state is ignored).

## Running and testing
- Scripts are classic `<script>` tags sharing globals (no ES modules), and load order in `index.html` matters: `workdays` → `data` → `store` → `ui-*` → `app`. A new UI file needs a `<script>` tag before `app.js` and an entry in `App.tabsFor` and the `render` lookup in `js/app.js`.
- The app and tests need to be served over `http://` (e.g. any static server). Opening files via `file://` in the Claude browser pane renders a static snapshot with no scripts executing. There is no Node/Python on this machine's PATH; `.claude/launch.json` starts a PowerShell `HttpListener` server (script lives in a session scratchpad, so recreate it if missing).
- Tests: open `tests.html` in the browser; results print as PASS/FAIL lines ending in "All passed". There is no single-test runner — add/comment `eq(...)` lines in the inline script. `tests.html` overrides `Store.persist` so it never touches the app's real localStorage; keep that. Tests run in order against one shared seeded store, so earlier tests' mutations (new requests, approvals) affect later ones.
- To reset demo data: "Reset demo" button, or `Data.reset()` in the console.

## Architecture
Layered, with one-way flow: UI → `Store` → `Data`/`Workdays`.
- `js/workdays.js` — pure date logic (`Workdays`). Dates are `'YYYY-MM-DD'` strings parsed as **local** time; never use `new Date('YYYY-MM-DD')` (UTC off-by-one). Ranges are inclusive. Holidays may be strings or `{date,name,inLieu?}`. `withInLieu()` derives off-in-lieu days.
- `js/data.js` — `LEAVE_TYPES` (entitlements/colours; `entitlement: null` = uncapped), seed users/requests, Singapore holidays (`SG_HOLIDAYS` → `SEED_HOLIDAYS`), and `Data.load/save/reset`. `Data.load` always overwrites saved `holidays` with the code's list (holidays are config); users and requests are saved user data.
- `js/store.js` — the single source of truth (`Store.state`) and all business rules: `submitRequest` validation, `decide`, `getBalance(userId, type, year?)`, `getOverlaps`, `addEmployee`, `setHasKids`. Mutations must call `persist()`. Business rules belong here, not in UI files.
- `js/ui-*.js` (`employee`, `manager`, `calendar`, `team`, `overview`) — each exports an object with `render(el)` that rebuilds `innerHTML` and re-binds handlers. Cross-view calls go through `App.render()` / `App.go(tab)`; draft form state and comment drafts are kept on the UI objects so full re-renders don't lose input. `esc()` and date helpers are defined in `ui-employee.js` and reused by the others. Manager-only tabs: queue, overview, calendar, team.
- `js/app.js` — role switcher (no auth; "Viewing as" dropdown), tab routing, and bootstrap.
- `styles.css` has global generic class names (e.g. `.num` is `display:flex` for calendar day numbers); avoid reusing them on table cells.

## Domain rules to preserve
- Holidays follow Singapore (MOM). A holiday on Sat or Sun gets an off-in-lieu day on the next working day; if a Saturday holiday is immediately followed by a Sunday holiday (CNY 2027) only one in-lieu day (Monday) is given. Holidays for years beyond 2027 must be added to `SG_HOLIDAYS`.
- `days` is computed at submit time and stored on the request (working days only, excluding weekends and holidays); changing holidays later does not recompute existing requests.
- Balance: `taken` counts only **approved** requests; **pending** days are shown separately but are subtracted when validating a new request, and re-checked at approval time. The year-filtered balance (Overview tab) counts a request by its **start** year; validation uses the unfiltered balance.
- Childcare leave is only for users with `hasKids`; others see it as "N/A" and `submitRequest` rejects it.
- A reason is required only for `unpaid` leave; it is optional for all other types.
- Overlap and the manager queue are scoped to the same `team`; a manager never sees their own requests in the queue. Rejected requests are ignored for overlaps and calendar display.
- Only managers can add employees (`Store.addEmployee`); new employees join the manager's team.
