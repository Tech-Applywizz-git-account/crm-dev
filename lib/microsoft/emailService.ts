// lib/microsoft/emailService.ts
import { sendGraphEmail } from "./graphService";
import { createPendingEmail, markEmailAsSent, markEmailAsFailed } from "./dbService";

interface SendEmailParams {
    senderEmail: string;
    recipientEmail: string;
    subject: string;
    body: string;
}

export async function processEmailSending({
    senderEmail,
    recipientEmail,
    subject,
    body
}: SendEmailParams) {
    // 1. Log to DB as pending
    const record = await createPendingEmail({
        salesperson_email: senderEmail,
        client_email: recipientEmail,
        subject,
        body
    });

    try {
        // 2. Dispatch via Graph API
        await sendGraphEmail({
            senderEmail,
            recipientEmail,
            subject,
            body
        });

        // 3. Mark as sent (placeholder for messageId if available, Graph sendMail doesn't return ID directly in simple flow, but we can assume success)
        await markEmailAsSent(record.id, "sent_via_graph");

        return { success: true };
    } catch (error: any) {
        // 4. Mark as failed
        await markEmailAsFailed(record.id, error.message || "Unknown Error");
        throw error;
    }
}
