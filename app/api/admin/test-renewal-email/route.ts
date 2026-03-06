// app/api/admin/test-renewal-email/route.ts
import { NextResponse } from 'next/server';
import { processEmailSending } from '@/lib/microsoft/emailService';
import { RENEWAL_TEMPLATES, fillTemplate } from '@/lib/email-templates';

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ success: false, error: "Recipient email is required" }, { status: 400 });
        }

        const templateId = 'renewal_reminder_early'; // Use a standard reminder template for testing
        const template = RENEWAL_TEMPLATES.find(t => t.id === templateId);

        if (!template) {
            return NextResponse.json({ success: false, error: "Template not found" }, { status: 500 });
        }

        const body = fillTemplate(template.body, {
            client_name: "Test User",
            renewal_date: "12/12/2026"
        });

        const senderEmail = "support@applywizz.com";

        await processEmailSending({
            senderEmail,
            recipientEmail: email,
            subject: "[TEST] " + template.subject,
            body: body
        });

        return NextResponse.json({ success: true, message: "Test automated email sent successfully!" });

    } catch (error: any) {
        console.error("Error sending test automated email:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
