"use client";

import { useEffect, useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Coins, Loader2, BarChart3, Calendar } from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatUsd(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(s: string): string {
  return new Date(s + "Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Returns unique YYYY-MM months spanning fromDate..toDate (inclusive). */
function monthsInRange(from: string, to: string): string[] {
  if (!from || !to || from > to) return [];
  const months: string[] = [];
  let [y, m] = from.slice(0, 7).split("-").map(Number);
  const [ey, em] = to.slice(0, 7).split("-").map(Number);
  while (y < ey || (y === ey && m <= em)) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return months;
}

/** Today as YYYY-MM-DD */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** First day of current month as YYYY-MM-DD */
function firstOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

// ─── DateRangePicker ─────────────────────────────────────────────────────────

function DateRangePicker({
  fromDate, toDate,
  onFromChange, onToChange,
}: {
  fromDate: string; toDate: string;
  onFromChange: (v: string) => void; onToChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2 bg-white border rounded-md px-3 py-2 shadow-sm">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <label className="text-xs text-muted-foreground font-medium">From</label>
        <input
          type="date"
          value={fromDate}
          max={toDate}
          onChange={e => onFromChange(e.target.value)}
          className="text-sm border-none outline-none bg-transparent"
        />
      </div>
      <span className="text-muted-foreground text-sm">→</span>
      <div className="flex items-center gap-2 bg-white border rounded-md px-3 py-2 shadow-sm">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <label className="text-xs text-muted-foreground font-medium">To</label>
        <input
          type="date"
          value={toDate}
          min={fromDate}
          max={today()}
          onChange={e => onToChange(e.target.value)}
          className="text-sm border-none outline-none bg-transparent"
        />
      </div>
    </div>
  );
}

// ─── AWSCostTable (Bedrock) ───────────────────────────────────────────────────

function AWSCostTable({ fromDate, toDate }: { fromDate: string; toDate: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<any[]>([]);

  const months = useMemo(() => monthsInRange(fromDate, toDate), [fromDate, toDate]);

  useEffect(() => {
    if (!months.length) return;
    setLoading(true);
    setError(null);
    const ts = Date.now();
    Promise.all(
      months.map(m =>
        fetch(`/api/costs/aws-explorer?month=${m}&_=${ts}`, { cache: "no-store" })
          .then(r => r.ok ? r.json() : r.json().then((b: any) => Promise.reject(b.error || r.statusText)))
          .then((d: any) => d.records || [])
      )
    )
      .then(all => {
        const merged = all.flat();
        // Filter to exact date range
        setRecords(merged.filter(r => r.date >= fromDate && r.date <= toDate));
      })
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false));
  }, [months.join(","), fromDate, toDate]);

  const totalCost = records.reduce((s, r) => s + (r.costUsd || 0), 0);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (error) return <div className="rounded-md bg-destructive/10 text-destructive px-4 py-3 text-sm">{error}</div>;
  if (records.length === 0) return <p className="text-muted-foreground text-sm py-6">No AWS Bedrock cost data for this date range.</p>;

  // Group by date | region | base model name
  const groupedMap = new Map<string, any>();
  records.forEach((r) => {
    const lowerType = r.usageType.toLowerCase();
    let type = "other";
    let baseName = r.usageType;
    if (lowerType.includes("input")) { type = "input"; baseName = r.usageType.replace(/(-)?input(-tokens)?/i, ""); }
    else if (lowerType.includes("output")) { type = "output"; baseName = r.usageType.replace(/(-)?output(-tokens)?/i, ""); }

    const key = `${r.date}|${r.region}|${baseName}`;
    if (!groupedMap.has(key)) {
      groupedMap.set(key, { date: r.date, region: r.region, baseName, inputUsageType: "-", outputUsageType: "-", inputUsage: 0, outputUsage: 0, inputCost: 0, outputCost: 0, totalCost: 0 });
    }
    const g = groupedMap.get(key);
    if (type === "input") { g.inputUsage += r.usageAmount; g.inputCost += r.costUsd; g.inputUsageType = r.usageType; }
    else if (type === "output") { g.outputUsage += r.usageAmount; g.outputCost += r.costUsd; g.outputUsageType = r.usageType; }
    else { g.inputUsage += r.usageAmount; g.inputCost += r.costUsd; g.inputUsageType = r.usageType; }
    g.totalCost += r.costUsd;
  });

  const grouped = Array.from(groupedMap.values()).sort((a, b) =>
    a.date !== b.date ? b.date.localeCompare(a.date) : b.totalCost - a.totalCost
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-gray-50/50 p-4 rounded-md border">
        <span className="font-medium text-gray-700">Total Bedrock Cost:</span>
        <span className="text-lg font-semibold">{formatUsd(totalCost)}</span>
      </div>
      <div className="border rounded-md max-h-[500px] overflow-y-auto relative">
        <Table>
          <TableHeader className="bg-gray-50 sticky top-0 shadow-sm z-10">
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Region</TableHead>
              <TableHead className="min-w-[150px]">Usage Type (In)</TableHead>
              <TableHead className="min-w-[150px]">Usage Type (Out)</TableHead>
              <TableHead className="text-right">Usage Details (In)</TableHead>
              <TableHead className="text-right">Usage Details (Out)</TableHead>
              <TableHead className="text-right">Cost (In)</TableHead>
              <TableHead className="text-right">Cost (Out)</TableHead>
              <TableHead className="text-right font-semibold">Total Cost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grouped.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium whitespace-nowrap">{formatDate(r.date)}</TableCell>
                <TableCell>{r.region}</TableCell>
                <TableCell className="truncate max-w-[200px]" title={r.inputUsageType}>{r.inputUsageType}</TableCell>
                <TableCell className="truncate max-w-[200px]" title={r.outputUsageType}>{r.outputUsageType}</TableCell>
                <TableCell className="text-right">{r.inputUsage > 0 || r.inputUsageType !== "-" ? r.inputUsage.toLocaleString(undefined, { maximumFractionDigits: 3 }) : "-"}</TableCell>
                <TableCell className="text-right">{r.outputUsage > 0 || r.outputUsageType !== "-" ? r.outputUsage.toLocaleString(undefined, { maximumFractionDigits: 3 }) : "-"}</TableCell>
                <TableCell className="text-right">{r.inputCost > 0 || r.inputUsageType !== "-" ? formatUsd(r.inputCost) : "-"}</TableCell>
                <TableCell className="text-right">{r.outputCost > 0 || r.outputUsageType !== "-" ? formatUsd(r.outputCost) : "-"}</TableCell>
                <TableCell className="text-right font-medium">{formatUsd(r.totalCost)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── AWSAllServicesTable ──────────────────────────────────────────────────────

function AWSAllServicesTable({ fromDate, toDate }: { fromDate: string; toDate: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<any[]>([]);

  const months = useMemo(() => monthsInRange(fromDate, toDate), [fromDate, toDate]);

  useEffect(() => {
    if (!months.length) return;
    setLoading(true);
    setError(null);
    const ts = Date.now();
    Promise.all(
      months.map(m =>
        fetch(`/api/costs/aws-all-services?month=${m}&_=${ts}`, { cache: "no-store" })
          .then(r => r.ok ? r.json() : r.json().then((b: any) => Promise.reject(b.error || r.statusText)))
          .then((d: any) => d.records || [])
      )
    )
      .then(all => {
        const merged = all.flat();
        setRecords(merged.filter((r: any) => r.date >= fromDate && r.date <= toDate));
      })
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false));
  }, [months.join(","), fromDate, toDate]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (error) return <div className="rounded-md bg-destructive/10 text-destructive px-4 py-3 text-sm">{error}</div>;
  if (records.length === 0) return <p className="text-muted-foreground text-sm py-6">No AWS billing data for this date range.</p>;

  const allServices = Array.from(new Set(records.map((r: any) => r.service))).sort() as string[];
  const dateMap = new Map<string, Record<string, number>>();
  let totalMonthlyCost = 0;

  records.forEach((r: any) => {
    if (!dateMap.has(r.date)) dateMap.set(r.date, {});
    const dayData = dateMap.get(r.date)!;
    dayData[r.service] = (dayData[r.service] || 0) + r.costUsd;
    totalMonthlyCost += r.costUsd;
  });

  const pivotedRecords = Array.from(dateMap.entries()).map(([date, services]) => {
    const dailyTotal = Object.values(services).reduce((s, v) => s + v, 0);
    const dailyTotalNoBedrock = dailyTotal - (services["Amazon Bedrock"] || 0);
    return { date, services, dailyTotal, dailyTotalNoBedrock };
  });

  // 3. Sort by date DESC
  pivotedRecords.sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-gray-50/50 p-4 rounded-md border shadow-sm">
        <span className="font-semibold text-gray-700">Total AWS Cost:</span>
        <span className="text-xl font-bold bg-blue-100 text-blue-700 px-3 py-1 rounded-full">{formatUsd(totalMonthlyCost)}</span>
      </div>

      {/* 
          Restructured container to ISOLATE scrolling.
          Removed 'sticky left' from Date column to stop sidebar overlap.
          Only the Table Header remains sticky vertically.
       */}
      <div className="border rounded-lg shadow-md bg-white overflow-hidden max-w-full">
        <div className="overflow-x-auto">
          <div className="max-h-[600px] overflow-y-auto">
            <Table className="border-collapse table-auto min-w-[1200px] w-full border-none">
              <TableHeader className="bg-slate-100 border-b">
                <TableRow className="border-b-0 hover:bg-transparent">
                  <TableHead className="font-bold py-4 px-4 bg-slate-100 min-w-[150px]">
                    Date
                  </TableHead>
                  {allServices.map(service => (
                    <TableHead key={service} className="text-right font-bold whitespace-nowrap px-6 border-l min-w-[180px]">
                      {service}
                    </TableHead>
                  ))}
                  <TableHead className="text-right font-bold border-l bg-slate-200/50 min-w-[150px]">Total Daily</TableHead>
                  <TableHead className="text-right font-bold border-l bg-amber-50 text-amber-900 min-w-[180px]">Total (No Bedrock)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pivotedRecords.map((row, i) => (
                  <TableRow key={i} className="hover:bg-slate-50 transition-colors border-b last:border-0 text-sm">
                    <TableCell className="font-medium whitespace-nowrap px-4 py-3">
                      {formatDate(row.date)}
                    </TableCell>
                    {allServices.map(service => (
                      <TableCell key={service} className="text-right tabular-nums border-l px-6">
                        {row.services[service] ? formatUsd(row.services[service]) : "—"}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-bold text-gray-900 border-l bg-slate-50/10">
                      {formatUsd(row.dailyTotal)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-amber-700 border-l bg-amber-50/10">
                      {formatUsd(row.dailyTotalNoBedrock)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground italic px-1">* Values represent daily totals per service in USD. Use shift + scroll or the scrollbar above to move horizontally.</p>
    </div>
  );
}

// ─── ApifyCostTable ───────────────────────────────────────────────────────────

type DayRow = { date: string; llmScoring: number | null; scraping: number; total: number };

function ApifyCostTable({ fromDate, toDate }: { fromDate: string; toDate: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [llmScoringError, setLlmScoringError] = useState<string | null>(null);
  const [rows, setRows] = useState<DayRow[]>([]);

  const months = useMemo(() => monthsInRange(fromDate, toDate), [fromDate, toDate]);

  useEffect(() => {
    if (!months.length) return;
    setLoading(true);
    setError(null);
    setLlmScoringError(null);
    const ts = Date.now();
    const opts = { cache: "no-store" as RequestCache };

    Promise.all([
      Promise.all(months.map(m =>
        fetch(`/api/costs/apify-usage?month=${m}&_=${ts}`, opts)
          .then(r => r.ok ? r.json() : r.json().then((b: any) => Promise.reject(b.error || r.statusText)))
          .then((d: any) => d.dailyUsages as Record<string, number> || {})
      )).then(all => Object.assign({}, ...all)),
      Promise.all(months.map(m =>
        fetch(`/api/costs/aws-llm-scoring?month=${m}&_=${ts}`, opts)
          .then(r => r.json().then((body: any) => {
            if (!r.ok) throw new Error(body.error || body.details || r.statusText);
            return body.dailyUsages as Record<string, number> || {};
          }))
          .catch((err: Error) => {
            setLlmScoringError(err?.message || "LLM scoring unavailable");
            return {} as Record<string, number>;
          })
      )).then(all => Object.assign({}, ...all)),
    ])
      .then(([scrapingDaily, llmScoringDaily]) => {
        // Build a list of all dates in range
        const dates: string[] = [];
        const cur = new Date(fromDate);
        const end = new Date(toDate);
        while (cur <= end) {
          dates.push(cur.toISOString().slice(0, 10));
          cur.setDate(cur.getDate() + 1);
        }
        dates.reverse();
        setRows(dates.map(dateKey => {
          const scraping = scrapingDaily[dateKey] ?? 0;
          const llmScoring = llmScoringDaily[dateKey] ?? 0;
          return { date: dateKey, llmScoring: llmScoring > 0 ? llmScoring : null, scraping, total: scraping + llmScoring };
        }));
      })
      .catch(err => setError(typeof err === "string" ? err : "Failed to load data"))
      .finally(() => setLoading(false));
  }, [months.join(","), fromDate, toDate]);

  const totalScraping = rows.reduce((s, r) => s + r.scraping, 0);
  const totalLlm = rows.reduce((s, r) => s + (r.llmScoring || 0), 0);
  const grandTotal = totalScraping + totalLlm;

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (error) return <div className="rounded-md bg-destructive/10 text-destructive px-4 py-3 text-sm">{error}</div>;

  return (
    <div className="space-y-4">
      {llmScoringError && (
        <div className="rounded-md bg-amber-500/10 text-amber-700 px-4 py-2 text-sm">
          LLM (Scoring) unavailable: {llmScoringError}
        </div>
      )}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-50 rounded-md border p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Scraping (Apify)</p>
          <p className="text-lg font-semibold">{formatUsd(totalScraping)}</p>
        </div>
        <div className="bg-blue-50 rounded-md border p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">LLM Scoring (Bedrock)</p>
          <p className="text-lg font-semibold">{formatUsd(totalLlm)}</p>
        </div>
        <div className="bg-green-50 rounded-md border border-green-200 p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">Total</p>
          <p className="text-lg font-bold text-green-700">{formatUsd(grandTotal)}</p>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm py-6">No daily data for this date range.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">LLM (Scoring)</TableHead>
              <TableHead className="text-right">Scraping</TableHead>
              <TableHead className="text-right font-semibold">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.date}>
                <TableCell className="font-medium">{formatDate(r.date)}</TableCell>
                <TableCell className="text-right">{r.llmScoring != null ? formatUsd(r.llmScoring) : "—"}</TableCell>
                <TableCell className="text-right">{formatUsd(r.scraping)}</TableCell>
                <TableCell className="text-right font-medium">{formatUsd(r.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// ─── SummaryTable ─────────────────────────────────────────────────────────────

function SummaryTable({ fromDate, toDate }: { fromDate: string; toDate: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{
    apifyScraping: number;
    llmScoring: number;
    awsAllServices: number;
    awsNoBedrock: number;
    awsBedrock: number;
    awsServices: Record<string, number>;
  } | null>(null);

  const months = useMemo(() => monthsInRange(fromDate, toDate), [fromDate, toDate]);

  useEffect(() => {
    if (!months.length) return;
    setLoading(true);
    setError(null);
    const ts = Date.now();
    const opts = { cache: "no-store" as RequestCache };

    Promise.all([
      // Apify scraping
      Promise.all(months.map(m =>
        fetch(`/api/costs/apify-usage?month=${m}&_=${ts}`, opts)
          .then(r => r.ok ? r.json() : { dailyUsages: {} })
          .then((d: any) => Object.values(d.dailyUsages || {}) as number[])
      )).then(all => all.flat().reduce((s: number, v: number) => s + v, 0)),

      // LLM scoring
      Promise.all(months.map(m =>
        fetch(`/api/costs/aws-llm-scoring?month=${m}&_=${ts}`, opts)
          .then(r => r.json())
          .then((body: any) => Object.values(body.dailyUsages || {}) as number[])
          .catch(() => [] as number[])
      )).then(all => all.flat().reduce((s: number, v: number) => s + v, 0)),

      // All AWS services
      Promise.all(months.map(m =>
        fetch(`/api/costs/aws-all-services?month=${m}&_=${ts}`, opts)
          .then(r => r.ok ? r.json() : { records: [] })
          .then((d: any) => (d.records || []).filter((r: any) => r.date >= fromDate && r.date <= toDate))
      )).then(all => all.flat()),
    ])
      .then(([apifyScraping, llmScoring, awsRecords]) => {
        const awsServices: Record<string, number> = {};
        for (const r of awsRecords as any[]) {
          awsServices[r.service] = (awsServices[r.service] || 0) + r.costUsd;
        }
        const awsAllServices = Object.values(awsServices).reduce((s, v) => s + v, 0);
        const awsBedrock = awsServices["Amazon Bedrock"] || 0;
        const awsNoBedrock = awsAllServices - awsBedrock;
        setSummary({
          apifyScraping: apifyScraping as number,
          llmScoring: llmScoring as number,
          awsAllServices,
          awsNoBedrock,
          awsBedrock,
          awsServices,
        });
      })
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false));
  }, [months.join(","), fromDate, toDate]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-10 w-10 animate-spin text-muted-foreground" /></div>;
  if (error) return <div className="rounded-md bg-destructive/10 text-destructive px-4 py-3 text-sm">{error}</div>;
  if (!summary) return null;

  const grandTotal = summary.apifyScraping + summary.awsAllServices;

  const sources = [
    { label: "Apify Scraping", value: summary.apifyScraping, color: "bg-purple-50 border-purple-200 text-purple-800" },
    { label: "LLM Scoring (Bedrock)", value: summary.llmScoring, color: "bg-blue-50 border-blue-200 text-blue-800" },
    { label: "AWS Bedrock (Total)", value: summary.awsBedrock, color: "bg-indigo-50 border-indigo-200 text-indigo-800" },
    { label: "AWS (Excl. Bedrock)", value: summary.awsNoBedrock, color: "bg-orange-50 border-orange-200 text-orange-800" },
    { label: "AWS (All Services)", value: summary.awsAllServices, color: "bg-sky-50 border-sky-200 text-sky-800" },
  ];

  return (
    <div className="space-y-6">
      {/* Grand Total Banner */}
      <div className="rounded-xl bg-gradient-to-r from-slate-800 to-slate-700 p-6 text-white shadow-lg flex items-center justify-between">
        <div>
          <p className="text-slate-300 text-sm font-medium mb-1">Grand Total</p>
          <p className="text-3xl font-bold">{formatUsd(grandTotal)}</p>
          <p className="text-slate-400 text-xs mt-1">{fromDate} → {toDate}</p>
        </div>
        <BarChart3 className="h-14 w-14 text-slate-500 opacity-60" />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sources.map(s => (
          <div key={s.label} className={`rounded-lg border p-4 ${s.color}`}>
            <p className="text-xs font-medium opacity-70 mb-1">{s.label}</p>
            <p className="text-2xl font-bold">{formatUsd(s.value)}</p>
            <p className="text-xs opacity-50 mt-1">{grandTotal > 0 ? ((s.value / grandTotal) * 100).toFixed(1) : "0.0"}% of grand total</p>
          </div>
        ))}
      </div>

      {/* Per-Service AWS Breakdown */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">AWS Service Breakdown</h3>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-bold">AWS Service</TableHead>
                <TableHead className="text-right font-bold">Total Cost</TableHead>
                <TableHead className="text-right font-bold">% of AWS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(summary.awsServices)
                .sort((a, b) => b[1] - a[1])
                .map(([service, cost]) => (
                  <TableRow key={service}>
                    <TableCell className="font-medium text-blue-700">{service}</TableCell>
                    <TableCell className="text-right font-semibold">{formatUsd(cost)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {summary.awsAllServices > 0 ? ((cost / summary.awsAllServices) * 100).toFixed(1) : "0.0"}%
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CostsPage() {
  const [costType, setCostType] = useState("summary");
  const [fromDate, setFromDate] = useState(firstOfMonth());
  const [toDate, setToDate] = useState(today());

  return (
    <DashboardLayout>
      <ProtectedRoute allowedRoles={["Super Admin"]}>
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Coins className="h-7 w-7" />
              Costs
            </h1>
            <DateRangePicker
              fromDate={fromDate}
              toDate={toDate}
              onFromChange={setFromDate}
              onToChange={setToDate}
            />
          </div>

          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <CardTitle>Cost breakdown</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Select a platform to view structured billing data.
                  </p>
                </div>
                <Tabs value={costType} onValueChange={setCostType} className="w-full sm:w-auto">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="summary">Summary</TabsTrigger>
                    <TabsTrigger value="apify">Apify</TabsTrigger>
                    <TabsTrigger value="aws">Bedrock</TabsTrigger>
                    <TabsTrigger value="aws-all">All AWS</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              {costType === "summary" && <SummaryTable fromDate={fromDate} toDate={toDate} />}
              {costType === "apify" && <ApifyCostTable fromDate={fromDate} toDate={toDate} />}
              {costType === "aws" && <AWSCostTable fromDate={fromDate} toDate={toDate} />}
              {costType === "aws-all" && <AWSAllServicesTable fromDate={fromDate} toDate={toDate} />}
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    </DashboardLayout>
  );
}
