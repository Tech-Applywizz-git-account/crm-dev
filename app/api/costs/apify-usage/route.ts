import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Normalize to YYYY-MM-DD. */
function toYYYYMMDD(s: string): string | null {
  const parts = String(s).split("T")[0].split("-");
  if (parts.length !== 3) return null;
  const [y, m, d] = parts;
  if (!/^\d{4}$/.test(y) || !/^\d{1,2}$/.test(m) || !/^\d{1,2}$/.test(d)) return null;
  const month = m.padStart(2, "0");
  const day = d.padStart(2, "0");
  return `${y}-${month}-${day}`;
}

/**
 * GET /api/costs/apify-usage?month=YYYY-MM
 * Fetches Apify usage for the full calendar month by calling the API twice
 * (Apify returns a ~30-day billing cycle per call, so we need current + next month
 * to cover e.g. Jan 1–31).
 */
async function fetchCycle(date: string, token: string): Promise<Record<string, number>> {
  const url = `https://api.apify.com/v2/users/me/usage/monthly?date=${date}&token=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Apify API ${res.status}`);
  const data = await res.json();
  const dailyUsages = data?.data?.dailyServiceUsages ?? [];
  const byDay: Record<string, number> = {};
  for (const day of dailyUsages) {
    const raw = day.date?.slice(0, 10) ?? day.date;
    if (!raw) continue;
    const dateStr = toYYYYMMDD(raw) ?? raw;
    byDay[dateStr] = Number(day.totalUsageCreditsUsd) || 0;
  }
  return byDay;
}

export async function GET(request: NextRequest) {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "APIFY_API_TOKEN is not configured" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get("month"); // YYYY-MM
  if (!monthParam || !/^\d{4}-\d{2}$/.test(monthParam)) {
    return NextResponse.json(
      { error: "Query param month=YYYY-MM is required" },
      { status: 400 }
    );
  }

  const [y, m] = monthParam.split("-").map(Number);
  const lastDay = new Date(y, m - 1, 0).getDate();

  const nextMonthStr = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  const date1 = `${monthParam}-01`;
  const date2 = `${nextMonthStr}-01`;

  try {
    const [cycle1, cycle2] = await Promise.all([
      fetchCycle(date1, token),
      fetchCycle(date2, token),
    ]);

    const merged: Record<string, number> = { ...cycle1, ...cycle2 };
    const byDay: Record<string, number> = {};
    for (let day = 1; day <= lastDay; day++) {
      const dateKey = `${monthParam}-${String(day).padStart(2, "0")}`;
      const amount = merged[dateKey];
      if (amount !== undefined) byDay[dateKey] = amount;
    }

    const res = NextResponse.json({ dailyUsages: byDay });
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    return res;
  } catch (e) {
    console.error("[costs/apify-usage]", e);
    return NextResponse.json(
      { error: "Failed to fetch Apify usage" },
      { status: 500 }
    );
  }
}
