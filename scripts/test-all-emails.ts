import path from 'path';
import dotenv from 'dotenv';
import { processEmailSending } from '../lib/microsoft/emailService';
import { RENEWAL_TEMPLATES, fillTemplate } from '../lib/email-templates';
import { sendTeamsNotification } from '../lib/microsoft/teamsService';

// 1. SETUP ENVIRONMENT
const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath, override: true });

async function runTest() {
    const email = "tunguturidineshkumar@gmail.com";

    console.log(`Starting to send tests to ${email}...`);

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
            console.error(`Error: Template ${templateId} not found.`);
            continue;
        }

        const body = fillTemplate(template.body, {
            client_name: "Dinesh Test",
            renewal_date: "10/03/2026"
        });

        const senderEmail = "support@applywizz.com";
        const subject = `[TEST MODE] ${template.subject}`;

        try {
            console.log(`Sending template: ${templateId}...`);
            await processEmailSending({
                senderEmail,
                recipientEmail: email,
                subject: subject,
                body: body
            });
            console.log(`✅ Success for ${templateId}`);
        } catch (error) {
            console.error(`❌ Failed for ${templateId}:`, error);
        }
    }

    console.log("All test emails processed.");
    process.exit(0);
}

runTest();
