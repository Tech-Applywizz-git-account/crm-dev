// lib/email-templates.ts

export interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    body: string;
    category: 'automated' | 'manual';
}

export const RENEWAL_TEMPLATES: EmailTemplate[] = [
    {
        id: 'renewal_reminder_early',
        name: 'Upcoming Renewal (Early)',
        category: 'automated',
        subject: 'Renewal Notice: Your ApplyWizz Subscription for {{client_name}}',
        body: `
            <p>Dear {{client_name}},</p>
            <p>I hope you are doing well. This is a friendly reminder that your subscription with <strong>ApplyWizz</strong> is approaching its renewal date.</p>
            
            <p><strong>Scheduled Renewal Date:</strong> {{renewal_date}}</p>

            <p>To ensure uninterrupted service and continued support for your career goals, please ensure your renewal is processed by the due date.</p>
            
            <p>If you have already processed your payment, please disregard this message. Our team is here to help with any questions.</p>
            
            <p>Best Regards,<br>The ApplyWizz Team</p>
        `,
    },
    {
        id: 'renewal_reminder_today',
        name: 'Renewal Due Today',
        category: 'automated',
        subject: 'Urgent: Your ApplyWizz Subscription Renews Today',
        body: `
            <p>Dear {{client_name}},</p>
            <p>This is an urgent reminder that your <strong>ApplyWizz</strong> subscription is scheduled for renewal today, <strong>{{renewal_date}}</strong>.</p>
            
            <p><strong>Status: FINAL RENEWAL NOTICE</strong></p>

            <p>To avoid any service interruption or disruption to your active job applications, please settle your renewal immediately.</p>
            
            <p>Your current platform tools and ongoing momentum depend on an active subscription. We look forward to continuing our partnership!</p>
            
            <p>Sincerely,<br>The ApplyWizz Team</p>
        `,
    },
    {
        id: 'renewal_manual_followup',
        name: 'Manual Renewal Follow-up',
        category: 'manual',
        subject: 'Important: Discussion regarding your ApplyWizz Renewal',
        body: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
                <div style="padding: 30px;">
                    <p>Hi <strong>{{client_name}}</strong>,</p>
                    <p>I hope you're doing well.</p>
                    <p>I am reaching out personally to check in on your upcoming subscription renewal. We value your partnership and want to ensure you have everything you need to continue successfully with our platform.</p>
                    
                    <p>Is there a convenient time for us to have a quick discussion regarding your renewal or any additional requirements you might have?</p>
                    
                    <p>Alternatively, if you're ready to proceed, you can settle the renewal directly through your dashboard.</p>
                    
                    <p style="margin-top: 30px;">Best regards,<br><strong>{{sender_name}}</strong><br>Account Manager | ApplyWizz</p>
                </div>
            </div>
        `,
    }
];

export function fillTemplate(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return result;
}
