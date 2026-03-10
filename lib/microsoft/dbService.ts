// lib/microsoft/dbService.ts
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export interface SentEmailRecord {
    salesperson_email: string;
    client_email: string;
    subject: string;
    body: string;
    status: 'pending' | 'sent' | 'failed';
    graph_message_id?: string;
    error_message?: string;
    sent_at?: string;
}

export async function createPendingEmail(record: Omit<SentEmailRecord, 'status'>) {
    const { data, error } = await supabaseAdmin
        .from("crm_sent_emails")
        .insert([{ ...record, status: 'pending' }])
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function markEmailAsSent(id: string, messageId: string) {
    const { error } = await supabaseAdmin
        .from("crm_sent_emails")
        .update({
            status: 'sent',
            graph_message_id: messageId,
            sent_at: new Date().toISOString()
        })
        .eq("id", id);

    if (error) throw error;
}

export async function markEmailAsFailed(id: string, errorMessage: string) {
    const { error } = await supabaseAdmin
        .from("crm_sent_emails")
        .update({
            status: 'failed',
            error_message: errorMessage
        })
        .eq("id", id);

    if (error) throw error;
}

export async function getSentEmails(email?: string, page: number = 0, limit: number = 50, clientEmail?: string) {
    let query = supabaseAdmin
        .from("crm_sent_emails")
        .select("*", { count: "exact" });

    if (clientEmail) {
        query = query.eq("client_email", clientEmail);
    } else if (email) {
        query = query.eq("salesperson_email", email);
    }

    const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(page * limit, (page + 1) * limit - 1);

    if (error) throw error;
    return { emails: data, total: count };
}
