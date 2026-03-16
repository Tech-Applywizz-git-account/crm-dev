import { NextResponse } from "next/server";

const JOB_ROLES_URL = "https://dashboard.apply-wizz.com/api/all-job-roles/";

export async function GET() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(JOB_ROLES_URL, {
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Roles API failed with status: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch job roles";

    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    clearTimeout(timeoutId);
  }
}
