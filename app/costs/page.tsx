"use client";

import { useEffect, useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Coins, Loader2 } from "lucide-react";

// Build month list: current month + 14 months back (so current and past year+ are always available)
function getMonthOptions(): string[] {
  const options: string[] = [];
  const now = new Date();
  for (let i = 0; i <= 14; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    options.push(`${y}-${m}`);
  }
  return options;
}
const MONTHS = getMonthOptions();

type DayRow = {
  date: string;
  llmScoring: number | null;
  scraping: number;
  llmJudge: number | null;
  llmIndeedBucketing: number | null;
  total: number;
};

function formatUsd(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(s: string): string {
  return new Date(s + "Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Normalize to YYYY-MM-DD. */
function toYYYYMMDD(s: string): string {
  const parts = String(s).split("T")[0].split("-");
  if (parts.length !== 3) return s;
  const [y, m, d] = parts;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function AWSCostTable({ month }: { month: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<any[]>([]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const ts = Date.now();
    fetch(`/api/costs/aws-explorer?month=${month}&_=${ts}`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((b) => Promise.reject(b.error || res.statusText));
        }
        return res.json();
      })
      .then((data) => setRecords(data.records || []))
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [month]);

  const totalCost = records.reduce((sum, r) => sum + (r.costUsd || 0), 0);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (error) return <div className="rounded-md bg-destructive/10 text-destructive px-4 py-3 text-sm">{error}</div>;
  if (records.length === 0) return <p className="text-muted-foreground text-sm py-6">No AWS Bedrock cost data for this month.</p>;

  // Group records by date, region, and model base name
  const groupedTasks = new Map<string, any>();

  records.forEach((r) => {
    let type = "other";
    let baseName = r.usageType;
    const lowerType = r.usageType.toLowerCase();

    if (lowerType.includes("input")) {
      type = "input";
      baseName = r.usageType.replace(/(-)?input(-tokens)?/i, "");
    } else if (lowerType.includes("output")) {
      type = "output";
      baseName = r.usageType.replace(/(-)?output(-tokens)?/i, "");
    }

    const key = `${r.date}|${r.region}|${baseName}`;

    if (!groupedTasks.has(key)) {
      groupedTasks.set(key, {
        date: r.date,
        region: r.region,
        baseName: baseName,
        inputUsageType: "-",
        outputUsageType: "-",
        inputUsage: 0,
        outputUsage: 0,
        inputCost: 0,
        outputCost: 0,
        totalCost: 0
      });
    }

    const g = groupedTasks.get(key);
    if (type === "input") {
      g.inputUsage += r.usageAmount;
      g.inputCost += r.costUsd;
      g.inputUsageType = r.usageType;
    } else if (type === "output") {
      g.outputUsage += r.usageAmount;
      g.outputCost += r.costUsd;
      g.outputUsageType = r.usageType;
    } else {
      g.inputUsage += r.usageAmount;
      g.inputCost += r.costUsd;
      g.inputUsageType = r.usageType;
    }

    g.totalCost += r.costUsd;
  });

  const groupedRecords = Array.from(groupedTasks.values());

  // Sort by date DESC, then totalCost DESC
  groupedRecords.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.totalCost - a.totalCost;
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-gray-50/50 p-4 rounded-md border">
        <span className="font-medium text-gray-700">Total Bedrock Cost ({month}):</span>
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
            {groupedRecords.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium whitespace-nowrap">{formatDate(r.date)}</TableCell>
                <TableCell>{r.region}</TableCell>
                <TableCell className="truncate max-w-[200px]" title={r.inputUsageType}>
                  {r.inputUsageType}
                </TableCell>
                <TableCell className="truncate max-w-[200px]" title={r.outputUsageType}>
                  {r.outputUsageType}
                </TableCell>
                <TableCell className="text-right">
                  {r.inputUsage > 0 || r.inputUsageType !== "-" ? r.inputUsage.toLocaleString(undefined, { maximumFractionDigits: 3 }) : "-"}
                </TableCell>
                <TableCell className="text-right">
                  {r.outputUsage > 0 || r.outputUsageType !== "-" ? r.outputUsage.toLocaleString(undefined, { maximumFractionDigits: 3 }) : "-"}
                </TableCell>
                <TableCell className="text-right">
                  {r.inputCost > 0 || r.inputUsageType !== "-" ? formatUsd(r.inputCost) : "-"}
                </TableCell>
                <TableCell className="text-right">
                  {r.outputCost > 0 || r.outputUsageType !== "-" ? formatUsd(r.outputCost) : "-"}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatUsd(r.totalCost)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function AWSAllServicesTable({ month }: { month: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<any[]>([]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const ts = Date.now();
    fetch(`/api/costs/aws-all-services?month=${month}&_=${ts}`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((b) => Promise.reject(b.error || res.statusText));
        }
        return res.json();
      })
      .then((data) => setRecords(data.records || []))
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [month]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (error) return <div className="rounded-md bg-destructive/10 text-destructive px-4 py-3 text-sm">{error}</div>;
  if (records.length === 0) return <p className="text-muted-foreground text-sm py-6">No AWS billing data for this month.</p>;

  // 1. Identify all unique services across the entire month (to build column headers)
  const allServices = Array.from(new Set(records.map(r => r.service))).sort();

  // 2. Pivot data: Group by date, with services as property keys
  const dateMap = new Map<string, Record<string, number>>();
  let totalMonthlyCost = 0;

  records.forEach((r) => {
    if (!dateMap.has(r.date)) {
      dateMap.set(r.date, {});
    }
    const dayData = dateMap.get(r.date)!;
    dayData[r.service] = (dayData[r.service] || 0) + r.costUsd;
    totalMonthlyCost += r.costUsd;
  });

  const pivotedRecords = Array.from(dateMap.entries()).map(([date, services]) => {
    const dailyTotal = Object.values(services).reduce((sum, val) => sum + val, 0);
    const bedrockCost = services["Amazon Bedrock"] || 0;
    const dailyTotalNoBedrock = dailyTotal - bedrockCost;
    return { date, services, dailyTotal, dailyTotalNoBedrock };
  });

  // 3. Sort by date DESC
  pivotedRecords.sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-4 max-w-full overflow-hidden">
      <div className="flex justify-between items-center bg-gray-50/50 p-4 rounded-md border shadow-sm">
        <span className="font-semibold text-gray-700">Total AWS Monthly Cost ({month}):</span>
        <span className="text-xl font-bold bg-blue-100 text-blue-700 px-3 py-1 rounded-full">{formatUsd(totalMonthlyCost)}</span>
      </div>

      {/* Scrollable Container Wrapper */}
      <div className="border rounded-lg overflow-x-auto shadow-md bg-white">
        <div className="max-h-[600px] overflow-y-auto min-w-full inline-block align-middle">
          <Table className="border-collapse table-auto min-w-[1200px]">
            <TableHeader className="bg-slate-100 sticky top-0 shadow-sm z-20">
              <TableRow>
                <TableHead className="font-bold py-4 sticky left-0 bg-slate-100 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  Date
                </TableHead>
                {allServices.map(service => (
                  <TableHead key={service} className="text-right font-bold whitespace-nowrap px-6 border-l min-w-[180px]">
                    {service}
                  </TableHead>
                ))}
                <TableHead className="text-right font-bold border-l bg-slate-200 min-w-[180px]">Total Daily</TableHead>
                <TableHead className="text-right font-bold border-l bg-amber-100 text-amber-900 min-w-[200px]">Total (No Bedrock)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pivotedRecords.map((row, i) => (
                <TableRow key={i} className="hover:bg-slate-50 transition-colors">
                  <TableCell className="font-medium whitespace-nowrap sticky left-0 bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] z-10">
                    {formatDate(row.date)}
                  </TableCell>
                  {allServices.map(service => (
                    <TableCell key={service} className="text-right tabular-nums border-l px-6">
                      {row.services[service] ? formatUsd(row.services[service]) : "—"}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-bold text-gray-900 border-l bg-slate-50/50">
                    {formatUsd(row.dailyTotal)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-amber-700 border-l bg-amber-50/30">
                    {formatUsd(row.dailyTotalNoBedrock)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <p className="text-xs text-muted-foreground italic px-1">* Values shown represent total daily cost in USD per service. Use shift + mouse wheel to scroll horizontally.</p>
    </div>
  );
}

export default function CostsPage() {
  const [month, setMonth] = useState(MONTHS[0]);
  const [costType, setCostType] = useState("apify");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [llmScoringError, setLlmScoringError] = useState<string | null>(null);
  const [rows, setRows] = useState<DayRow[]>([]);

  useEffect(() => {
    // We only need to fetch this data if we're on the "apify" tab for now. 
    // Usually you'd separate these into distinct components, but this works to start.
    if (costType !== "apify") return;

    setLoading(true);
    setError(null);
    setLlmScoringError(null);
    const ts = Date.now();
    const opts = { cache: "no-store" as RequestCache };
    const [y, m] = month.split("-").map(Number);
    const lastDay = new Date(y, m - 1, 0).getDate();
    const validDatesDesc: string[] = [];
    for (let day = lastDay; day >= 1; day--) {
      validDatesDesc.push(`${month}-${String(day).padStart(2, "0")}`);
    }

    Promise.all([
      fetch(`/api/costs/apify-usage?month=${month}&_=${ts}`, opts)
        .then((r) => (r.ok ? r.json() : r.json().then((b) => Promise.reject(b.error || r.statusText))))
        .then((data: { dailyUsages: Record<string, number> }) => data.dailyUsages || {}),
      fetch(`/api/costs/aws-llm-scoring?month=${month}&_=${ts}`, opts)
        .then((r) => r.json().then((body: { dailyUsages?: Record<string, number>; error?: string; details?: string }) => {
          if (!r.ok) throw new Error(body.error || body.details || r.statusText);
          return body.dailyUsages || {};
        }))
        .catch((err: Error) => {
          setLlmScoringError(err?.message || "LLM scoring unavailable");
          return {} as Record<string, number>;
        }),
    ])
      .then(([scrapingDaily, llmScoringDaily]) => {
        const next: DayRow[] = validDatesDesc.map((dateKey) => {
          const scraping = scrapingDaily[dateKey] ?? 0;
          const llmScoring = llmScoringDaily[dateKey] ?? 0;
          return {
            date: dateKey,
            llmScoring: llmScoring > 0 ? llmScoring : null,
            scraping,
            llmJudge: null,
            llmIndeedBucketing: null,
            total: scraping + llmScoring,
          };
        });
        setRows(next);
      })
      .catch((err) => setError(typeof err === "string" ? err : "Failed to load cost data"))
      .finally(() => setLoading(false));
  }, [month, costType]);

  return (
    <DashboardLayout>
      <ProtectedRoute allowedRoles={["Super Admin"]}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Coins className="h-7 w-7" />
              Costs
            </h1>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="apify">Apify</TabsTrigger>
                    <TabsTrigger value="aws">Bedrock</TabsTrigger>
                    <TabsTrigger value="aws-all">All AWS</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              {costType === "apify" ? (
                <>
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground">
                      Scraping from Apify. LLM (Scoring) from AWS Cost Explorer (Amazon Bedrock by default; set AWS_LLM_SCORING_SERVICE for another service). Judge and Indeed bucketing when connected.
                    </p>
                  </div>
                  {llmScoringError && (
                    <div className="rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 px-4 py-2 text-sm mb-4">
                      LLM (Scoring): {llmScoringError}. Ensure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are set and the IAM user has <code className="text-xs">ce:GetCostAndUsage</code> in us-east-1.
                    </div>
                  )}
                  {loading && (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {error && (
                    <div className="rounded-md bg-destructive/10 text-destructive px-4 py-3 text-sm">
                      {error}
                    </div>
                  )}
                  {!loading && !error && (
                    <>
                      {rows.length === 0 ? (
                        <p className="text-muted-foreground text-sm py-6">No daily data for this month.</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead className="text-right">LLM (Scoring)</TableHead>
                              <TableHead className="text-right">Scraping</TableHead>
                              <TableHead className="text-right">LLM (Judge)</TableHead>
                              <TableHead className="text-right">LLM (Indeed bucketing)</TableHead>
                              <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rows.map((r) => (
                              <TableRow key={r.date}>
                                <TableCell className="font-medium">{formatDate(r.date)}</TableCell>
                                <TableCell className="text-right">
                                  {r.llmScoring != null ? formatUsd(r.llmScoring) : "—"}
                                </TableCell>
                                <TableCell className="text-right">{formatUsd(r.scraping)}</TableCell>
                                <TableCell className="text-right">
                                  {r.llmJudge != null ? formatUsd(r.llmJudge) : "—"}
                                </TableCell>
                                <TableCell className="text-right">
                                  {r.llmIndeedBucketing != null ? formatUsd(r.llmIndeedBucketing) : "—"}
                                </TableCell>
                                <TableCell className="text-right font-medium">{formatUsd(r.total)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </>
                  )}
                </>
              ) : costType === "aws" ? (
                <AWSCostTable month={month} />
              ) : (
                <AWSAllServicesTable month={month} />
              )}
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    </DashboardLayout>
  );
}
