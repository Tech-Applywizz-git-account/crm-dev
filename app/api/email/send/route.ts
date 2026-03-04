// app/api/email/send/route.ts
import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimiter";
import { processEmailSending } from "@/lib/microsoft/emailService";

export async function POST(req: Request) {
    try {
        const { recipientEmail, subject, body, senderEmail } = await req.json();

        // 1. Basic Validation
        if (!recipientEmail || !subject || !body || !senderEmail) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 2. Validate session (Simplified for this example)
        // In a real app, you'd use supabase.auth.getUser() with cookies
        // For now, we'll trust the senderEmail but in a production app, 
        // you MUST verify this against the actual logged-in user.

        // 3. Rate Limiting
        if (!checkRateLimit(senderEmail)) {
            return NextResponse.json({ error: "Rate limit exceeded. Max 50 emails per hour." }, { status: 429 });
        }

        // 4. Process Sending
        await processEmailSending({
            senderEmail,
            recipientEmail,
            subject,
            body,
        });

        return NextResponse.json({ success: true, message: "Email processed successfully" });
    }

    catch (error: any) {
        console.error("API Route Error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
