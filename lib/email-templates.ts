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
        id: 'renewal_reminder_5',
        name: 'Upcoming Renewal (5 Days)',
        category: 'automated',
        subject: 'Your ApplyWizz Subscription Will Be Expiring in 5 Days',
        body: `
            <p style="margin-bottom: 15px; margin-top: 0;">Hello {{client_name}},</p>
            <p style="margin-bottom: 15px; margin-top: 0;">We hope your job search journey with ApplyWizz has been progressing well.</p>
            <p style="margin-bottom: 15px; margin-top: 0;">This is a quick reminder that your ApplyWizz subscription will be expiring in 5 days. Our team has been consistently managing and submitting applications on your behalf to help you stay active in the job market.</p>
            <p style="margin-bottom: 15px; margin-top: 0;">To ensure that your job applications continue without interruption, we recommend renewing your subscription before the expiry date.</p>
            <p style="margin-bottom: 15px; margin-top: 0;">If you have any questions or need assistance with the renewal process, please feel free to reach out to us.</p>
            <p style="margin-bottom: 0; margin-top: 0;">Best regards,</p>
            <p style="margin-bottom: 0; margin-top: 0;">Team ApplyWizz</p>
        `,
    },
    {
        id: 'renewal_reminder_4',
        name: 'Upcoming Renewal (4 Days)',
        category: 'automated',
        subject: 'Your ApplyWizz Subscription Will Be Expiring in 4 Days',
        body: `
            <p style="margin-bottom: 15px; margin-top: 0;">Hello {{client_name}},</p>
            <p style="margin-bottom: 15px; margin-top: 0;">We hope everything is going well with your job search.</p>
            <p style="margin-bottom: 15px; margin-top: 0;">This is a friendly reminder that your ApplyWizz subscription will be expiring in 4 days. Our team has been consistently managing your job applications to help you stay active in the job market.</p>
            <p style="margin-bottom: 15px; margin-top: 0;">To ensure there is no interruption in this process, we recommend renewing your subscription before the expiry date.</p>
            <p style="margin-bottom: 15px; margin-top: 0;">If you need any assistance with the renewal, please feel free to reach out.</p>
            <p style="margin-bottom: 0; margin-top: 0;">Best regards,</p>
            <p style="margin-bottom: 0; margin-top: 0;">Team ApplyWizz</p>
        `,
    },
    {
        id: 'renewal_reminder_3',
        name: 'Upcoming Renewal (3 Days)',
        category: 'automated',
        subject: 'Your ApplyWizz Subscription Will Be Expiring in 3 Days',
        body: `
            <p style="margin-bottom: 15px; margin-top: 0;">Hello {{client_name}},</p>
            <p style="margin-bottom: 15px; margin-top: 0;">We hope your job search is progressing smoothly.</p>
            <p style="margin-bottom: 15px; margin-top: 0;">This is a reminder that your ApplyWizz subscription will be expiring in 3 days. Our team has been supporting your job search by consistently managing and submitting your applications.</p>
            <p style="margin-bottom: 15px; margin-top: 0;">To continue this support without interruption, we recommend renewing your subscription before it expires.</p>
            <p style="margin-bottom: 15px; margin-top: 0;">Please let us know if you need any assistance with the renewal process.</p>
            <p style="margin-bottom: 0; margin-top: 0;">Best regards,</p>
            <p style="margin-bottom: 0; margin-top: 0;">Team ApplyWizz</p>
        `,
    },
    {
        id: 'renewal_reminder_2',
        name: 'Upcoming Renewal (2 Days)',
        category: 'automated',
        subject: 'Your ApplyWizz Subscription Will Be Expiring in 2 Days',
        body: `
            <p style="margin-bottom: 15px; margin-top: 0;">Hello {{client_name}},</p>
            <p style="margin-bottom: 15px; margin-top: 0;">We wanted to inform you that your ApplyWizz subscription will be expiring in 2 days.</p>
            <p style="margin-bottom: 15px; margin-top: 0;">To ensure your job application process continues smoothly and without any pause, we recommend renewing your subscription at the earliest.</p>
            <p style="margin-bottom: 15px; margin-top: 0;">If you require any help with the renewal process, please feel free to contact us.</p>
            <p style="margin-bottom: 0; margin-top: 0;">Best regards,</p>
            <p style="margin-bottom: 0; margin-top: 0;">Team ApplyWizz</p>
        `,
    },
    {
        id: 'renewal_reminder_today',
        name: 'Renewal Due Today',
        category: 'automated',
        subject: 'Your ApplyWizz Subscription Will Be Expiring today',
        body: `
            <p style="margin-bottom: 15px; margin-top: 0;">Hello {{client_name}},</p>
            <p style="margin-bottom: 15px; margin-top: 0;">We hope your job search journey with ApplyWizz has been progressing well.</p>
            <p style="margin-bottom: 15px; margin-top: 0;">This is a final reminder that your ApplyWizz subscription expires today.</p>
            <p style="margin-bottom: 15px; margin-top: 0;">Over the days, our team has been consistently managing and submitting job applications on your behalf to help keep your job search active and moving forward.</p>
            <p style="margin-bottom: 15px; margin-top: 0;">Once the subscription expires, the job application process managed by the ApplyWizz team will stop, which means your job search activity through our platform will pause. When the process pauses, the momentum built through consistent applications may reset, and restarting later often means beginning the process again.</p>
            <p style="margin-bottom: 15px; margin-top: 0;">To avoid interruption in your job search progress, we recommend renewing your subscription today so our team can continue managing your job applications without any pause.</p>
            <p style="margin-bottom: 15px; margin-top: 0;">If you need assistance with the renewal process, please feel free to reply to this email and our team will be happy to help.</p>
            <p style="margin-bottom: 0; margin-top: 0;">Best regards,</p>
            <p style="margin-bottom: 0; margin-top: 0;">Team ApplyWizz</p>
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
