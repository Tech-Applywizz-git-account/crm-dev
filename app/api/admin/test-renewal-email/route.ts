import { NextResponse } from 'next/server';
import { processEmailSending } from '@/lib/microsoft/emailService';
import { RENEWAL_TEMPLATES, fillTemplate } from '@/lib/email-templates';
import { sendTeamsNotification } from '@/lib/microsoft/teamsService';

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ success: false, error: "Recipient email is required" }, { status: 400 });
        }

        const results = [];
        const templateIds = [
            'renewal_reminder_5',
            'renewal_reminder_4',
            'renewal_reminder_3',
            'renewal_reminder_2',
            'renewal_reminder_today'
        ];

        for (const templateId of templateIds) {
            const template = RENEWAL_TEMPLATES.find(t => t.id === templateId);

            if (!template) {
                results.push({ id: templateId, status: 'error', message: 'Template not found' });
                continue;
            }

            const body = fillTemplate(template.body, {
                client_name: "Dinesh Test",
                renewal_date: "10/03/2026"
            });

            const senderEmail = "support@applywizz.com";

            await processEmailSending({
                senderEmail,
                recipientEmail: email,
                subject: "[TEST - " + (templateId === 'renewal_reminder_today' ? 'URGENT' : 'EARLY') + "] " + template.subject,
                body: body
            });

            results.push({ id: templateId, status: 'success' });
        }

        return NextResponse.json({ success: true, message: "Both test renewal emails sent successfully!", results });

    } catch (error: any) {
        console.error("Error sending test automated email:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
