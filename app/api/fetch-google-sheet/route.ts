

// app/api/fetch-google-sheet/route.ts
import { supabase } from "@/utils/supabase/client";
import { NextResponse } from 'next/server';
import Papa from "papaparse";

function parseGoogleSheetsTimestamp(timestamp: string): Date | null {
    if (!timestamp) return null;

    const formats = [
        /(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})/, // DD/MM/YYYY
        /(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2}):(\d{2})/,    // DD-MM-YYYY
        /(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/     // YYYY-MM-DD
    ];

    for (const format of formats) {
        const match = timestamp.match(format);
        if (match) {
            const [_, p1, p2, p3, hour, min, sec] = match;
            let day, month, year;

            if (timestamp.includes('/')) {
                [day, month, year] = [p1, p2, p3];
            } else if (timestamp.includes('-') && timestamp.indexOf('-') === 2) {
                [day, month, year] = [p1, p2, p3];
            } else {
                [year, month, day] = [p1, p2, p3];
            }

            // Construct a Date object in IST and convert to UTC
            const istDate = new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}`);
            return new Date(istDate.toISOString()); // Ensures it's in UTC

            //  const istDate = new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}+05:30`);
            // return new Date(istDate.toISOString()); // Ensures it's in UTC
        }
    }

    return null;
}


export async function POST(request: Request) {
    console.log('🔵 [API] Fetch Google Sheets endpoint hit');

    const authHeader = request.headers.get('Authorization');
    const CRON_SECRET = process.env.CRON_SECRET;

    if (!CRON_SECRET) {
        return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    if (authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { data: sheets, error: fetchError } = await supabase
            .from("google_sheets_config")
            .select("*")
            .order("last_imported_at", { ascending: true, nullsFirst: true });

        if (fetchError) throw new Error(`Supabase error: ${fetchError.message}`);
        if (!sheets?.length) return NextResponse.json({ message: "No Google Sheets configured" }, { status: 200 });

        const results = [];
        let totalInserted = 0;
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

        for (const [index, sheet] of sheets.entries()) {
            const sheetStartTime = Date.now();
            console.log(`\n🔄 [${index + 1}/${sheets.length}] Processing sheet: ${sheet.name} (ID: ${sheet.id})`);

            try {
                const res = await fetch(sheet.url, { cache: 'no-store' });
                if (!res.ok) throw new Error(`HTTP ${res.status} - ${res.statusText}`);
                const csvText = await res.text();

                const { data: parsedRows, errors: parseErrors } = Papa.parse(csvText, {
                    header: true,
                    skipEmptyLines: true,
                    transform: (value) => value.trim(),
                });

                if (!parsedRows.length) {
                    results.push({ sheetId: sheet.id, name: sheet.name, status: "skipped", reason: "No data rows" });
                    continue;
                }

                const validLeads = [];

                for (const rowRaw of parsedRows) {
                    const row = rowRaw as Record<string, string>;
                    const timestamp = row["Timestamp"];
                    const rowDate = timestamp ? parseGoogleSheetsTimestamp(timestamp) : null;
                    if (!rowDate || rowDate < oneHourAgo || rowDate > now) continue;

                    validLeads.push({
                        name: row["Full name"]?.trim() || "",
                        phone: row["Phone Number (Country Code)"]?.trim() || "",
                        email: row["Email"]?.trim()?.toLowerCase() || "",
                        city: row["city"]?.trim() || "",
                        created_at: rowDate.toISOString(),
                        source: sheet.name,
                        status: "New",
                        assigned_to: "",
                        metadata: {
                            original_timestamp: timestamp,
                            sheet_id: sheet.id,
                        }
                    });
                }

                if (!validLeads.length) {
                    results.push({ sheetId: sheet.id, name: sheet.name, status: "skipped", reason: "No recent data" });
                    continue;
                }

                // Fetch existing leads in 1-hour window for deduplication
                const { data: existingLeads, error: existingError } = await supabase
                    .from("leads")
                    .select("name, email, phone, city, created_at")
                    .gte("created_at", oneHourAgo.toISOString())
                    .lte("created_at", now.toISOString());

                if (existingError) throw new Error("Error fetching existing leads for deduplication");

                const uniqueLeads = validLeads.filter((lead) => {
                    return !existingLeads.some((e) =>
                        e.name?.trim() === lead.name?.trim() &&
                        e.email?.toLowerCase().trim() === lead.email?.toLowerCase().trim() &&
                        e.phone?.trim() === lead.phone?.trim() &&
                        e.city?.trim() === lead.city?.trim() &&
                        new Date(e.created_at).toISOString() === lead.created_at
                    );
                });

                if (!uniqueLeads.length) {
                    results.push({ sheetId: sheet.id, name: sheet.name, status: "skipped", reason: "All rows were duplicates" });
                    continue;
                }

                const { error: insertError, count } = await supabase
                    .from("leads")
                    .insert(uniqueLeads, { count: 'exact' });

                if (insertError) throw new Error(`Supabase insert error: ${insertError.message}`);

                const { error: updateError } = await supabase
                    .from("google_sheets_config")
                    .update({
                        last_imported_at: now.toISOString(),
                        last_import_count: uniqueLeads.length,
                    })
                    .eq("id", sheet.id);

                if (updateError) console.warn("⚠️ Failed to update last_imported_at:", updateError.message);

                totalInserted += uniqueLeads.length;
                results.push({
                    sheetId: sheet.id,
                    name: sheet.name,
                    status: "success",
                    leadsAdded: uniqueLeads.length,
                    executionTime: Date.now() - sheetStartTime,
                });

                console.log(`  ✅ Inserted ${uniqueLeads.length} new leads in ${Date.now() - sheetStartTime}ms`);

            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                results.push({
                    sheetId: sheet.id,
                    name: sheet.name,
                    status: "error",
                    error: errorMsg,
                    executionTime: Date.now() - sheetStartTime,
                });
            }
        }

        console.log(`\n🎉 Processed ${sheets.length} sheets | ${totalInserted} new leads added`);
        return NextResponse.json({
            message: `Processed ${sheets.length} sheets | ${totalInserted} new leads`,
            results,
        }, { status: 200 });

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({
            error: "Internal server error",
            details: errorMsg,
        }, { status: 500 });
    }
}