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
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #2563eb; padding: 20px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Subscription Renewal</h1>
                </div>
                <div style="padding: 30px;">
                    <p>Dear <strong>{{client_name}}</strong>,</p>
                    <p>We hope you are enjoying your experience with <strong>ApplyWizz</strong>. We are writing to remind you that your current subscription cycle is approaching its end.</p>
                    
                    <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
                        <p style="margin: 0;"><strong>Renewal Date:</strong> {{renewal_date}}</p>
                    </div>

                    <p>To ensure uninterrupted service and continued support for your job application journey, please ensure your renewal payment is processed by the due date.</p>
                    
                    <p>If you have already processed your payment, please disregard this message. For any assistance, feel free to contact our support team.</p>
                    
                    <p style="margin-top: 30px;">Best Regards,<br><strong>The ApplyWizz Finance Team</strong></p>
                </div>
                <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #64748b;">
                    <p style="margin: 0;">&copy; ${new Date().getFullYear()} ApplyWizz. All rights reserved.</p>
                    <p style="margin: 5px 0 0 0;">This is an automated administrative notification.</p>
                </div>
            </div>
        `,
    },
    {
        id: 'renewal_reminder_today',
        name: 'Renewal Due Today',
        category: 'automated',
        subject: 'Urgent: Your ApplyWizz Subscription Renews Today',
        body: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #fee2e2; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #dc2626; padding: 20px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Final Renewal Notice</h1>
                </div>
                <div style="padding: 30px;">
                    <p>Dear <strong>{{client_name}}</strong>,</p>
                    <p>This is a final reminder that your <strong>ApplyWizz</strong> subscription is due for renewal today, <strong>{{renewal_date}}</strong>.</p>
                    
                    <div style="background-color: #fef2f2; border: 1px solid #fee2e2; padding: 20px; border-radius: 6px; text-align: center; margin: 20px 0;">
                        <p style="margin: 0; color: #b91c1c; font-weight: bold; font-size: 18px;">Action Required Today</p>
                        <p style="margin: 10px 0 0 0; font-size: 14px;">To avoid any service interruption, please process your renewal immediately.</p>
                    </div>

                    <p>Processing your renewal ensures that your active job applications and platform access remain active without downtime.</p>
                    
                    <p style="margin-top: 30px;">Sincerely,<br><strong>ApplyWizz Billing Department</strong></p>
                </div>
                <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #64748b;">
                    <p style="margin: 0;">&copy; ${new Date().getFullYear()} ApplyWizz. All rights reserved.</p>
                </div>
            </div>
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
