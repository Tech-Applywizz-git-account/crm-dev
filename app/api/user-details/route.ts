import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const emailInput = searchParams.get('email');

        if (!emailInput) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        const email = emailInput.trim();
        let leadId: string | null = null;

        // 1. Search in sales_closure table first (Primary check for clients)
        // Check both 'email' and 'company_application_email' columns case-insensitively using .ilike
        const { data: closureData, error: closureError } = await supabaseAdmin
            .from('sales_closure')
            .select('lead_id')
            .or(`email.ilike.${email},company_application_email.ilike.${email}`)
            .order('closed_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (closureError) {
            console.error('Sales closure query error:', closureError);
        }

        if (closureData?.lead_id) {
            leadId = closureData.lead_id;
        }

        // 2. If matched a lead_id, fetch complete client details
        if (leadId) {
            // Fetch Lead details
            const { data: lead, error: leadError } = await supabaseAdmin
                .from('leads')
                .select('*')
                .eq('business_id', leadId)
                .maybeSingle();

            if (lead && !leadError) {
                // Fetch Portfolio Progress
                const { data: portfolio } = await supabaseAdmin
                    .from('portfolio_progress')
                    .select('*')
                    .eq('lead_id', leadId)
                    .maybeSingle();

                // Fetch Resume Progress
                const { data: resume } = await supabaseAdmin
                    .from('resume_progress')
                    .select('*')
                    .eq('lead_id', leadId)
                    .maybeSingle();

                // Prepend S3 base URL to resume paths if they exist
                if (resume && Array.isArray(resume.pdf_path)) {
                    const s3BaseUrl = 'https://applywizz-prod.s3.us-east-2.amazonaws.com';
                    resume.pdf_path = resume.pdf_path.map((path: string) =>
                        path.startsWith('http') ? path : `${s3BaseUrl}/${path}`
                    );
                }

                return NextResponse.json({
                    success: true,
                    type: 'client',
                    data: {
                        ...lead,
                        portfolio: portfolio || null,
                        resume: resume || null
                    }
                });
            }
        }

        // 3. Fallback/Alternative: Search in profiles table (Staff Members)
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .ilike('user_email', email)
            .maybeSingle();

        if (profile) {
            return NextResponse.json({
                success: true,
                type: 'staff',
                data: profile
            });
        }

        // 4. Final Fallback: Search Leads table directly by email
        const { data: directLead } = await supabaseAdmin
            .from('leads')
            .select('*')
            .ilike('email', email)
            .maybeSingle();

        if (directLead) {
            return NextResponse.json({
                success: true,
                type: 'client',
                data: {
                    ...directLead,
                    portfolio: null,
                    resume: null
                }
            });
        }

        return NextResponse.json(
            { error: 'User not found with the provided email' },
            { status: 404 }
        );

    } catch (error: any) {
        console.error('API Error in user-details:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
