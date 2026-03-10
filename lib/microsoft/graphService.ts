// lib/microsoft/graphService.ts
import { getMicrosoftGraphToken } from "./tokenService";

interface Attachment {
    name: string;
    content: string; // Base64
    contentType: string;
}

interface EmailParams {
    senderEmail: string;
    recipientEmail: string;
    subject: string;
    body: string;
    attachments?: Attachment[];
}

export async function sendGraphEmail({
    senderEmail,
    recipientEmail,
    subject,
    body,
    attachments
}: EmailParams) {
    const token = await getMicrosoftGraphToken();

    const url = `https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`;

    const payload: any = {
        message: {
            subject: subject,
            body: {
                contentType: "HTML",
                content: body,
            },
            toRecipients: [
                {
                    emailAddress: {
                        address: recipientEmail,
                    },
                },
            ],
            attachments: attachments?.map(att => ({
                "@odata.type": "#microsoft.graph.fileAttachment",
                name: att.name,
                contentBytes: att.content,
                contentType: att.contentType
            }))
        },
        saveToSentItems: true,
    };

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Graph API Error:", errorData);
        throw new Error(errorData.error?.message || `Graph API failed: ${response.statusText}`);
    }

    return true;
}
