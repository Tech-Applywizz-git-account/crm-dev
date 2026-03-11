import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabase/server"; // Or however they get supabase server
import { createClient } from "@supabase/supabase-js";
import { processEmailSending } from "@/lib/microsoft/emailService";

// Helper to get exactly 08:00 AM IST (02:30 AM UTC) for a given date
function getIST8AMBoundaries(currentUtcDate: Date) {
    // 08:00 AM IST = 02:30 AM UTC
    // We create a date object for today at 02:30:00.000 UTC
    const today8AM_UTC = new Date(Date.UTC(
        currentUtcDate.getUTCFullYear(),
        currentUtcDate.getUTCMonth(),
        currentUtcDate.getUTCDate(),
        2, 30, 0, 0
    ));

    // And exactly 24 hours prior
    const yesterday8AM_UTC = new Date(today8AM_UTC.getTime() - (24 * 60 * 60 * 1000));

    return {
        start: yesterday8AM_UTC.toISOString(),
        end: today8AM_UTC.toISOString()
    };
}

export async function GET(request: Request) {
    try {
        // Initialize Supabase Admin strictly using env vars (just in case they aren't pre-configured)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const now = new Date();
        const { start, end } = getIST8AMBoundaries(now);

        console.log(`Checking 'other' roles from ${start} to ${end}`);

        // Fetch records from DB
        const { data: clients, error } = await supabase
            .from("client_onborading_details")
            .select("*")
            .gte("created_at", start)
            .lte("created_at", end)
            .ilike("role", "Other") // Ensure "other" case-insensitivity matches
            .not("job_role_other", "is", null);

        if (error) {
            console.error("Supabase Error querying client_onborading_details:", error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        if (!clients || clients.length === 0) {
            return NextResponse.json({
                success: true,
                message: `No clients with role 'other' found between ${start} and ${end}.`
            });
        }

        let emailsSent = 0;
        let emailsFailed = 0;
        const failedDetails = [];

        // Loop and send emails safely
        for (const client of clients) {
            try {
                // Defensive extraction of client details
                const fullName = client.full_name || client.name || "N/A";
                const email = client.company_email || client.personal_email || client.email || "N/A";
                // Get extension if user provided (+1... vs 1...)
                const rawPhone = client.callable_phone || client.whatsapp_number || client.phone || "N/A";
                let mobileNumberDisplay = rawPhone;

                // Construct the HTML Email Template
                const subject = `Notice: Onboarding Client Chose "Other" Role - ${fullName}`;
                const body = `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333;">
                    <p style="font-size: 16px;">Hi Balaji,</p>
                    <p>A new client has completed onboarding and specifically chosen <strong>"Other"</strong> as their role. Please review their details below:</p>
                    
                    <table style="border-collapse: collapse; width: 100%; max-width: 600px; margin-top: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                        <tr>
                            <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: 600; background-color: #f8fafc; width: 35%;">Client Name</td>
                            <td style="padding: 12px; border: 1px solid #e2e8f0;">${fullName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: 600; background-color: #f8fafc;">Email Details</td>
                            <td style="padding: 12px; border: 1px solid #e2e8f0;">
                                <a href="mailto:${email}" style="color: #2563eb; text-decoration: none;">${email}</a>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: 600; background-color: #f8fafc;">Mobile Number</td>
                            <td style="padding: 12px; border: 1px solid #e2e8f0;">${mobileNumberDisplay}</td>
                        </tr>
                        <tr>
                            <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: 600; background-color: #f8fafc;">Selected Role</td>
                            <td style="padding: 12px; border: 1px solid #e2e8f0;"><span style="background-color: #fef08a; padding: 2px 6px; border-radius: 4px;">${client.role}</span></td>
                        </tr>
                        <tr>
                            <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: 600; background-color: #f8fafc;">Job Role (Other) provided</td>
                            <td style="padding: 12px; border: 1px solid #e2e8f0;"><strong>${client.job_role_other}</strong></td>
                        </tr>
                    </table>

                    <p style="margin-top: 30px; font-size: 14px; color: #475569;">
                        Best Regards,<br>
                        <strong>ApplyWizz Automated System</strong>
                    </p>
                </div>
                `;

                // Sending strictly one-by-one with proper error handling per client
                await processEmailSending({
                    senderEmail: "support@applywizz.com",
                    recipientEmail: "balaji@applywizz.com",
                    ccEmails: ["dinesh@applywizz.com"],
                    subject: subject,
                    body: body,
                });

                emailsSent++;
                console.log(`✅ Email sent successfully to balaji for client ${fullName} (ID: ${client.id})`);

            } catch (err: any) {
                console.error(`❌ Failed to send alert email for Client ID Strategy ${client.id}:`, err);
                emailsFailed++;
                failedDetails.push({ clientId: client.id, error: err.message });
            }
        }

        return NextResponse.json({
            success: true,
            totalProcessed: clients.length,
            emailsSent,
            emailsFailed,
            failedDetails: failedDetails.length > 0 ? failedDetails : undefined,
        });

    } catch (e: any) {
        console.error("General Cron Failure /other-role-alert:", e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
