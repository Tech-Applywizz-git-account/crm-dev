/**
 * Sends a notification to Teams via a Power Automate Webhook.
 * Requires TEAMS_WEBHOOK_URL in .env
 */
export async function sendTeamsNotification(message: string, retry: boolean = true): Promise<boolean> {
    const webhookUrl = process.env.TEAMS_WEBHOOK_URL;
    if (!webhookUrl) {
        console.warn("[Teams Notifier] TEAMS_WEBHOOK_URL not found. Skipping.");
        return false;
    }

    try {
        const response = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message })
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Webhook failed (${response.status}): ${errBody}`);
        }

        console.log("[Teams Notifier] Message sent successfully via Power Automate.");
        return true;
    } catch (err: any) {
        console.error("[Teams Notifier] Error:", err.message);
        if (retry) {
            console.log("[Teams Notifier] Retrying in 2 seconds...");
            await new Promise(resolve => setTimeout(resolve, 2000));
            return sendTeamsNotification(message, false);
        }
        return false;
    }
}
