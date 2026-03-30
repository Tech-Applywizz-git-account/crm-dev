import { NextResponse } from 'next/server';
import { sendTeamsNotification } from '@/lib/microsoft/teamsService';

export async function POST() {
    try {
        const message = `🚀 **ApplyWizz CRM Connection Test**\nVerified Power Automate Webhook Integration.\nStatus: Active\nTimestamp: ${new Date().toLocaleString()}`;
        const result = await sendTeamsNotification(message);

        if (result) {
            return NextResponse.json({ success: true, message: "Test message sent to the 'Tech - Applywizz' chat!" });
        } else {
            return NextResponse.json({ success: false, message: "Failed to send Teams message. This usually means TEAMS_WEBHOOK_URL is missing or invalid." }, { status: 500 });
        }

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message, stack: error.stack }, { status: 500 });
    }
}
