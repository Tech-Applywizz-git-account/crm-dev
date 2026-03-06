// lib/renewal-engine.ts
import { addDays, format, isAfter, isBefore, startOfDay } from 'date-fns';

export interface RenewalMilestone {
    lead_id: string;
    client_name: string;
    email: string;
    milestone_date: Date;
    days_until: number;
    status: 'upcoming' | 'due_today' | 'overdue';
}

/**
 * Calculates the next renewal date based on onboarding date and subscription cycle.
 */
export function calculateRenewalMilestone(onboardedDate: string | Date | null, cycleDays: number): Date | null {
    if (!onboardedDate || !cycleDays) return null;
    return addDays(new Date(onboardedDate), cycleDays);
}

/**
 * Categorizes the renewal status based on current date.
 */
export function getRenewalStatus(milestoneDate: Date): 'upcoming' | 'due_today' | 'overdue' {
    const today = startOfDay(new Date());
    const target = startOfDay(milestoneDate);

    if (target.getTime() === today.getTime()) return 'due_today';
    if (isBefore(target, today)) return 'overdue';
    return 'upcoming';
}

/**
 * Default configurations for reminders (configurable via env or DB in future)
 */
export const RENEWAL_CONFIG = {
    reminders: [7, 3, 1, 0], // Days before renewal to send automated emails
    follow_up_delay: 2,      // Days after missing renewal to create a task
    automated_sender: "support@applywizz.com",
};
