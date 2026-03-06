// scripts/renewal-automation.ts
import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { calculateRenewalMilestone, RENEWAL_CONFIG } from '../lib/renewal-engine';
import { RENEWAL_TEMPLATES, fillTemplate } from '../lib/email-templates';
import { format, subDays, startOfDay } from 'date-fns';
import { processEmailSending } from '../lib/microsoft/emailService';

// 1. SETUP ENVIRONMENT
const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath, override: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Main Automation Task
 */
async function processRenewals() {
    console.log(`[${new Date().toISOString()}] Starting Renewal Automation Scan...`);

    try {
        // 1. Fetch only clients with Paid status that have an onboarded date
        const { data: activeSales, error } = await supabase
            .from('sales_closure')
            .select('*, leads(name, email)')
            .eq('finance_status', 'Paid')
            .not('onboarded_date', 'is', null);

        if (error) throw error;
        if (!activeSales) return;

        const today = startOfDay(new Date());

        for (const sale of activeSales) {
            const milestone = calculateRenewalMilestone(sale.onboarded_date, sale.subscription_cycle);
            if (!milestone) continue;

            const clientName = sale.leads?.name || sale.lead_name || "Client";
            const clientEmail = sale.leads?.email || sale.email;

            // 2. CHECK TRIGGERS FOR REMINDERS (Phase 3)
            for (const daysBefore of RENEWAL_CONFIG.reminders) {
                const triggerDate = startOfDay(subDays(milestone, daysBefore));

                if (triggerDate.getTime() === today.getTime()) {
                    await sendAutomatedReminder(sale, milestone, daysBefore);
                }
            }

            // 3. CHECK TRIGGERS FOR FOLLOW-UP TASKS (Phase 5)
            const followUpTrigger = startOfDay(addDays(milestone, RENEWAL_CONFIG.follow_up_delay));
            if (followUpTrigger.getTime() === today.getTime()) {
                await createFollowUpTask(sale, milestone);
            }
        }

        console.log(`[${new Date().toISOString()}] Scan completed successfully.`);
    } catch (err) {
        console.error("Error in processRenewals:", err);
    }
}

async function sendAutomatedReminder(sale: any, milestone: Date, daysBefore: number) {
    const templateId = daysBefore === 0 ? 'renewal_reminder_today' : 'renewal_reminder_early';
    const template = RENEWAL_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    const clientName = sale.leads?.name || "Client";
    const renewalDateStr = format(milestone, 'dd/MM/yyyy');

    // Check if already sent today to avoid duplicates (Safety Check Phase 10)
    const { data: existing } = await supabase
        .from('call_history')
        .select('id')
        .eq('lead_id', sale.lead_id)
        .ilike('notes', `%Automated Reminder (${daysBefore} days)%`)
        .gte('created_at', startOfDay(new Date()).toISOString())
        .limit(1);

    if (existing && existing.length > 0) return;

    const body = fillTemplate(template.body, {
        client_name: clientName,
        renewal_date: renewalDateStr
    });

    console.log(`[REMINDER] Sending ${template.name} to ${sale.email} from support@applywizz.com`);

    const senderEmail = RENEWAL_CONFIG.automated_sender;

    try {
        await processEmailSending({
            senderEmail,
            recipientEmail: sale.email,
            subject: template.subject,
            body: body
        });
    } catch (err) {
        console.error(`Failed to send automated email to ${sale.email}:`, err);
    }

    // Log it to call_history as per Phase 3 requirement
    await supabase.from('call_history').insert([{
        lead_id: sale.lead_id,
        email: sale.email,
        assigned_to: 'SYSTEM_AUTOMATION',
        current_stage: 'Renewal Reminder',
        notes: `Automated Reminder (${daysBefore} days): ${template.subject} (Sent via Microsoft Graph from ${senderEmail})`,
        created_at: new Date().toISOString()
    }]);
}

async function createFollowUpTask(sale: any, milestone: Date) {
    // Phase 5 logic
    const { data: existing } = await supabase
        .from('call_history')
        .select('id')
        .eq('lead_id', sale.lead_id)
        .eq('current_stage', 'FOLLOWUP_TASK_PENDING')
        .limit(1);

    if (existing && existing.length > 0) return;

    console.log(`[TASK] Creating follow-up task for ${sale.lead_id}`);

    await supabase.from('call_history').insert([{
        lead_id: sale.lead_id,
        email: sale.email,
        assigned_to: sale.associates_tl_email || 'SYSTEM',
        current_stage: 'FOLLOWUP_TASK_PENDING',
        notes: `URGENT FOLLOWUP REQUIRED: Client missed renewal milestone on ${format(milestone, 'dd/MM/yyyy')}. Status: No Response.`,
        created_at: new Date().toISOString()
    }]);
}

function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

// RUN ONCE IF NOT IN PRODUCTION (for testing)
if (process.env.NODE_ENV !== 'production') {
    processRenewals().catch(console.error);
}

// SCHEDULE (Phase 9)
// Run every day at 8:00 AM
cron.schedule('0 8 * * *', processRenewals);
