# Costs Feature – Step-by-Step Spec

## Overview
Add a **Costs** section in the app that shows **day-by-day** costs for:
1. **LLM cost for scoring** (API TBD – placeholder for now)
2. **Scraping cost** (Apify usage API – implemented)
3. **LLM cost for Judge LLM** (API TBD – placeholder for now)
4. **LLM cost for Indeed bucketing** (API TBD – placeholder for now)

---

## Step 1: Add "Costs" to the left sidebar

- **File:** `components/layout/app-sidebar.tsx`
- **Action:** Add a new entry to `navigationItems`:
  - **Title:** "Costs"
  - **URL:** `/costs`
  - **Icon:** e.g. `Coins` or `BarChart3` from `lucide-react`
  - **Module:** `costs` (for permission)
  - **Description:** "Day-by-day cost breakdown"
- **Access:** Ensure the `costs` module is allowed for the right roles (e.g. Super Admin) in `components/providers/auth-provider.tsx` inside `accessMap`.

---

## Step 2: Backend – Scraping cost (Apify)

- **API used:** [Apify monthly usage](https://api.apify.com/v2/users/me/usage/monthly)
  - Example: `GET https://api.apify.com/v2/users/me/usage/monthly?date=2026-01-01&token=YOUR_APIFY_TOKEN`
  - Returns `usageCycle`, `monthlyServiceUsage`, and **`dailyServiceUsages`** (array of `{ date, serviceUsage, totalUsageCreditsUsd }`).
- **Security:** Do **not** call Apify from the browser with the token. Call it from a **Next.js API route** that reads the token from env.
- **Env:** Add `APIFY_API_TOKEN` to `.env` / `.env.local` (and document in `.env.example`).
- **API route:** e.g. `app/api/costs/apify-usage/route.ts`
  - **Method:** GET
  - **Query:** `date` (optional, e.g. `YYYY-MM-DD`; used to pick the month for Apify’s monthly endpoint).
  - **Logic:** Server reads `APIFY_API_TOKEN`, calls Apify monthly usage API for that month, then returns a safe JSON shape (e.g. list of `{ date, totalUsageCreditsUsd }` or per-day breakdown).
  - **Response:** e.g. `{ dailyUsages: { [date: string]: number } }` or array of `{ date, scrapingCostUsd: number }` so the frontend can show “Scraping cost” per day.

---

## Step 3: Frontend – Costs page

- **Route:** `app/costs/page.tsx`
- **Layout:** Use the same layout as other dashboard pages (e.g. `DashboardLayout` + `ProtectedRoute` with `allowedRoles` including Super Admin and any other roles that should see Costs).
- **Data:**
  - **Scraping:** Fetch from `GET /api/costs/apify-usage?date=...` and map to day-by-day “Scraping cost”.
  - **LLM scoring / Judge LLM / Indeed bucketing:** No API yet; show placeholder (e.g. `—` or `0` or “API pending”) per day.
- **UI:**
  - **Month selector:** Let the user pick a month (and optionally year). Use that to:
    - Call `/api/costs/apify-usage?date=YYYY-MM-DD` (first day of month or any day in that month, depending on how Apify API interprets `date`).
  - **Day-by-day table:** Columns: **Date** | **LLM (Scoring)** | **Scraping** | **LLM (Judge)** | **LLM (Indeed bucketing)** | optional **Total**.
  - **Optional:** A simple chart (e.g. bar or line) of cost per day for each category (scraping filled; others can be empty or zero until APIs exist).
- **Loading / error:** Show loading state while fetching; show a clear message if Apify (or later LLM) API fails or token is missing.

---

## Step 4: LLM costs (later)

- When you have the APIs for:
  - LLM cost for scoring  
  - LLM cost for Judge LLM  
  - LLM cost for Indeed bucketing  
- Add one API route per source (or one route that aggregates them), e.g.:
  - `app/api/costs/llm-scoring/route.ts`
  - `app/api/costs/llm-judge/route.ts`
  - `app/api/costs/llm-indeed-bucketing/route.ts`
- Each should return a day-by-day structure consistent with the table (e.g. `{ date: string, costUsd: number }[]` or `{ [date]: number }`).
- On the Costs page, replace the placeholders with real data from these routes (and keep the same table/chart structure).

---

## Step 5: Permissions and roles

- In `auth-provider.tsx`, in `accessMap`, add the `"costs"` module for roles that should see the Costs menu and page (e.g. `"Super Admin"`).
- In `app/costs/page.tsx`, wrap content in `ProtectedRoute` with `allowedRoles` set to the same roles so direct URL access is protected.

---

## File checklist

| Step | File | Purpose |
|------|------|--------|
| 1 | `components/layout/app-sidebar.tsx` | Add “Costs” menu item |
| 1 | `components/providers/auth-provider.tsx` | Add `costs` to `accessMap` for allowed roles |
| 2 | `.env.example` | Document `APIFY_API_TOKEN` |
| 2 | `app/api/costs/apify-usage/route.ts` | GET; proxy Apify monthly usage → daily scraping cost |
| 3 | `app/costs/page.tsx` | Costs page: month picker, table (Date + 4 cost columns), optional chart |
| 4 | (Later) `app/api/costs/llm-*/route.ts` | LLM cost APIs when available |

---

## Apify API reference

- **Monthly usage:** `GET https://api.apify.com/v2/users/me/usage/monthly?date=YYYY-MM-DD&token=APIFY_API_TOKEN`
- Response includes `data.dailyServiceUsages[]` with:
  - `date`: e.g. `"2026-01-01T00:00:00.000Z"`
  - `totalUsageCreditsUsd`: total USD for that day
  - `serviceUsage`: breakdown by product (e.g. `ACTOR_COMPUTE_UNITS`, `PROXY_RESIDENTIAL_TRANSFER_GBYTES`, etc.)
- Use `totalUsageCreditsUsd` per day as “Scraping cost” for the table; optionally use `serviceUsage` later for a more detailed breakdown.
