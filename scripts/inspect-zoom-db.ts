import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
console.log(`Supabase URL: ${supabaseUrl ? "PRESENT" : "MISSING"}`);
console.log(`Supabase Key: ${supabaseKey ? "PRESENT" : "MISSING"}`);
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log("Fetching sample logs...");
    const { data: results, error: err } = await supabase
        .from("zoom_call_logs")
        .select("*")
        .limit(10);
        
    if (err) {
        console.error("Supabase Error:", err);
        return;
    }
    
    if (results && results.length > 0) {
        console.log(JSON.stringify(results[0], null, 2));
    } else {
        console.log("No records found.");
    }
}

inspect();
