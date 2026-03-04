// app/api/email/sent/route.ts
import { NextResponse } from "next/server";
import { getSentEmails } from "@/lib/microsoft/dbService";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const email = searchParams.get("email");
        const page = parseInt(searchParams.get("page") || "0");

        if (!email) {
            return NextResponse.json({ error: "Email parameter is required" }, { status: 400 });
        }

        const { emails, total } = await getSentEmails(email, page);

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
