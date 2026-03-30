// app/api/email/sent/route.ts
import { NextResponse } from "next/server";
import { getSentEmails } from "@/lib/microsoft/dbService";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const salespersonEmail = searchParams.get("email");
        const clientEmail = searchParams.get("client_email");
        const page = parseInt(searchParams.get("page") || "0");

        const { emails, total } = await getSentEmails(salespersonEmail || undefined, page, 50, clientEmail || undefined);

        return NextResponse.json({
            emails,
            total,
            page,
            limit: 50
        });

    } catch (error: any) {
        console.error("Fetch Sent Emails Error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
