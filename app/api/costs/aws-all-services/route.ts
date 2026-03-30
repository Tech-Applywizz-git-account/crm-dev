import { NextRequest, NextResponse } from "next/server";
import { CostExplorerClient, GetCostAndUsageCommand } from "@aws-sdk/client-cost-explorer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const accessKey = process.env.AWS_ACCESS_KEY_ID_COST;
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY_COST;
  
  if (!accessKey || !secretKey) {
    return NextResponse.json(
      { error: "AWS_ACCESS_KEY_ID_COST and AWS_SECRET_ACCESS_KEY_COST are required" },
      { status: 401 }
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

  const client = new CostExplorerClient({
    region: "us-east-1",
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
  });

  try {
    const records: Array<{ date: string; service: string; usageType: string; usageAmount: number; costUsd: number }> = [];
    let nextToken: string | undefined = undefined;

    do {
      const command: any = new GetCostAndUsageCommand({
        TimePeriod: { Start: startDate, End: endDate },
        Granularity: "DAILY",
        Metrics: ["UnblendedCost", "UsageQuantity"],
        GroupBy: [
          { Type: "DIMENSION", Key: "SERVICE" },
          { Type: "DIMENSION", Key: "USAGE_TYPE" },
        ],
        NextPageToken: nextToken,
      });

      const response: any = await client.send(command);

      for (const result of response.ResultsByTime || []) {
        const date = result.TimePeriod?.Start?.slice(0, 10);
        if (!date) continue;

        for (const group of result.Groups || []) {
          const service = group.Keys?.[0] || "Unknown Service";
          const usageType = group.Keys?.[1] || "Unknown Usage";

          const costUsd = parseFloat(group.Metrics?.UnblendedCost?.Amount || "0");
          const usageAmount = parseFloat(group.Metrics?.UsageQuantity?.Amount || "0");

          if (costUsd > 0 || usageAmount > 0) {
            records.push({ date, service, usageType, usageAmount, costUsd });
          }
        }
      }

      nextToken = response.NextPageToken;
    } while (nextToken);

    const res = NextResponse.json({ records });
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    return res;
  } catch (e) {
    console.error("[costs/aws-all-services]", e);
    return NextResponse.json(
      { error: "Failed to fetch AWS all-services cost", details: String(e) },
      { status: 500 }
    );
  }
}
