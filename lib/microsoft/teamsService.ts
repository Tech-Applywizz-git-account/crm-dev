/**
 * Sends a notification to Teams via a Power Automate Webhook.
 * Requires TEAMS_WEBHOOK_URL in .env
 */
export async function sendTeamsNotification(message: string, retry: boolean = true, authorizedBy: string = ""): Promise<boolean> {
    const webhookUrl = process.env.TEAMS_WEBHOOK_URL;
    if (!webhookUrl) {
        console.error("[Teams Notifier] TEAMS_WEBHOOK_URL missing in .env");
        return false;
    }

    try {
        const response = await fetch(webhookUrl, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                ...(authorizedBy ? { "X-Authorized-Sender": authorizedBy.toLowerCase().trim() } : {})
            },
            body: JSON.stringify({ message })
        });

        if (!response.ok) {
            const errBody = await response.text();
            const status = response.status;
            console.error(`[Teams Notifier] Webhook failed (${status}): ${errBody}`);
            
            // If it's an authentication/policy error, don't bother retrying
            if (status === 401 || status === 403) {
                return false;
            }
            
            if (retry) {
                console.log("[Teams Notifier] Retrying in 2 seconds...");
                await new Promise(res => setTimeout(res, 2000));
                return sendTeamsNotification(message, false, authorizedBy);
            }
            return false;
        }

        console.log("[Teams Notifier] Message sent successfully via Power Automate.");
        return true;

    } catch (err: any) {
        console.error("[Teams Notifier] Error:", err.message);
        return false;
    }
}
