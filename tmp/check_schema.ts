import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function checkSchema() {
  const { data: leads, error: leadsErr } = await supabase.from('leads').select('*').limit(1);
  if (leadsErr) console.error(leadsErr);
  else console.log('Leads columns:', Object.keys(leads[0]));

  const { data: sales, error: salesErr } = await supabase.from('sales_closure').select('*').limit(1);
  if (salesErr) console.error(salesErr);
  else console.log('Sales columns:', Object.keys(sales[0]));

  const { data: fb, error: fbErr } = await supabase.from('client_feedback').select('*').limit(1);
  if (fbErr) console.error(fbErr);
  else console.log('Feedback columns:', Object.keys(fb[0]));
}

checkSchema();
