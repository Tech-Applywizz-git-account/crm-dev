import { sendGraphEmail } from "./graphService";
import { createPendingEmail, markEmailAsSent, markEmailAsFailed } from "./dbService";
import { sendTeamsNotification } from "./teamsService";

interface Attachment {
    name: string;
    content: string; // Base64
    contentType: string;
}

interface SendEmailParams {
    senderEmail: string;
    recipientEmail: string;
    ccEmails?: string[];
    subject: string;
    body: string;
    attachments?: Attachment[];
}

export async function processEmailSending({
    senderEmail,
    recipientEmail,
    ccEmails,
    subject,
    body,
    attachments
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
            ccEmails,
            subject,
            body,
            attachments
        });

        // 3. Mark as sent (placeholder for messageId if available, Graph sendMail doesn't return ID directly in simple flow, but we can assume success)
        await markEmailAsSent(record.id, "sent_via_graph");

        return { success: true };
    } catch (error: any) {
        // 4. Mark as failed
        const errMsg = error.message || "Unknown Error";
        await markEmailAsFailed(record.id, errMsg);

        // 5. Alert Tech Team via Teams
        try {
            await sendTeamsNotification(`🚨 **CRM Email Error**\nFailed to send to: ${recipientEmail}\nSubject: ${subject}\nError: ${errMsg}`);
        } catch (teamsErr) {
            console.error("Teams Alert Failed during email error:", teamsErr);
        }

        throw error;
    }
}
