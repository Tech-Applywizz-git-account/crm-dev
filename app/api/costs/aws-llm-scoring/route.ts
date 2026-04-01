import { NextRequest, NextResponse } from "next/server";
import { CostExplorerClient, GetCostAndUsageCommand } from "@aws-sdk/client-cost-explorer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/costs/aws-llm-scoring?month=YYYY-MM
 * Returns daily LLM scoring cost from AWS Cost Explorer.
 * Uses Filter by SERVICE (env AWS_LLM_SCORING_SERVICE, default "Amazon Bedrock")
 * or leave unset to get all costs for the month (then filter by tag/category in AWS).
 */
export async function GET(request: NextRequest) {
  const accessKey = process.env.AWS_ACCESS_KEY_ID;
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!accessKey || !secretKey) {
    return NextResponse.json(
      { error: "AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are required" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get("month");
  if (!monthParam || !/^\d{4}-\d{2}$/.test(monthParam)) {
    return NextResponse.json(
      { error: "Query param month=YYYY-MM is required" },
      { status: 400 }
    );
  }

  const [y, m] = monthParam.split("-").map(Number);
  const startDate = `${monthParam}-01`;
  const endDate =
    m === 12
      ? `${y + 1}-01-01`
      : `${y}-${String(m + 1).padStart(2, "0")}-01`;

  const serviceFilter = process.env.AWS_LLM_SCORING_SERVICE || "Amazon Bedrock";

  const client = new CostExplorerClient({
    region: "us-east-1",
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
  });

  const filter =
    serviceFilter === ""
      ? undefined
      : {
          Dimensions: {
            Key: "SERVICE",
            Values: [serviceFilter],
          },
        };

  try {
    const command = new GetCostAndUsageCommand({
      TimePeriod: { Start: startDate, End: endDate },
      Granularity: "DAILY",
      Metrics: ["UnblendedCost"],
      Filter: filter,
    });

    const response = await client.send(command);
    const byDay: Record<string, number> = {};

    const lastDay = new Date(y, m - 1, 0).getDate();
    for (let day = 1; day <= lastDay; day++) {
      const dateKey = `${monthParam}-${String(day).padStart(2, "0")}`;
      byDay[dateKey] = 0;
    }

    for (const result of response.ResultsByTime || []) {
      const start = result.TimePeriod?.Start?.slice(0, 10);
      if (!start) continue;
      const amount = result.Total?.UnblendedCost?.Amount;
      const num = parseFloat(amount || "0");
      if (start >= startDate && start < endDate) byDay[start] = num;
    }

    const res = NextResponse.json({ dailyUsages: byDay });
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    return res;
  } catch (e) {
    console.error("[costs/aws-llm-scoring]", e);
    return NextResponse.json(
      { error: "Failed to fetch AWS cost", details: String(e) },
      { status: 500 }
    );
  }
}
