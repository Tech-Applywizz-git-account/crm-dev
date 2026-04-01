"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface LeadRow {
  lead_id: string;
  client_name: string;
  email: string;
  phone?: string | null;
  assigned_to?: string | null;
  account_assigned_name?: string | null;
  account_assigned_email?: string | null;
  onboarded_date?: string | null;
}

export default function MyAssignedLeadsPage() {
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [meEmail, setMeEmail] = useState<string>("");
  const [meName, setMeName] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const { data: auth } = await supabase.auth.getUser();
        const user = auth?.user;
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, user_email")
          .eq("auth_id", user.id)
          .maybeSingle();

        const email = (profile?.user_email || user.email || "").trim();
        const name = (profile?.full_name || "").trim();

        if (!cancelled) {
          setMeEmail(email);
          setMeName(name);
        }

        // Query sales_closure to find leads assigned to this account manager
        const { data: sales, error: salesErr } = await supabase
          .from("sales_closure")
          .select("lead_id, email, onboarded_date, account_assigned_email, account_assigned_name")
          .or(`account_assigned_email.eq.${email},account_assigned_name.eq.${name}`);

        if (salesErr) {
          console.error("Failed to fetch sales_closure:", salesErr);
          return;
        }

        const leadIds = (sales || []).map((s: any) => s.lead_id).filter(Boolean);
        if (leadIds.length === 0) {
          if (!cancelled) setRows([]);
          return;
        }

        const { data: leadsData, error: leadsErr } = await supabase
          .from("leads")
          .select("business_id, name, phone, assigned_to, email")
          .in("business_id", leadIds);

        if (leadsErr) {
          console.error("Failed to fetch leads:", leadsErr);
          return;
        }

        const leadsMap = Object.fromEntries((leadsData || []).map((l: any) => [l.business_id, l]));

        const merged: LeadRow[] = (sales || []).map((s: any) => ({
          lead_id: s.lead_id,
          client_name: leadsMap[s.lead_id]?.name || "Unnamed",
          email: s.email || leadsMap[s.lead_id]?.email || "",
          phone: leadsMap[s.lead_id]?.phone || null,
          assigned_to: leadsMap[s.lead_id]?.assigned_to || null,
          account_assigned_name: s.account_assigned_name || null,
          account_assigned_email: s.account_assigned_email || null,
          onboarded_date: s.onboarded_date || null,
        }));

        if (!cancelled) setRows(merged);
      } catch (err) {
        console.error("Error loading My Assigned Leads:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return (
    <ProtectedRoute allowedRoles={["Account Management","Accounts","Admin","Super Admin"]}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">My Assigned Leads</h2>
          <div>
            <Button onClick={() => window.location.reload()} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</Button>
          </div>
        </div>

        <div className="overflow-auto bg-white rounded shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Onboarded</TableHead>
                <TableHead>Tag</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.lead_id}>
                  <TableCell>{r.lead_id}</TableCell>
                  <TableCell>{r.client_name}</TableCell>
                  <TableCell>{r.email}</TableCell>
                  <TableCell>{r.phone || '-'}</TableCell>
                  <TableCell>{r.assigned_to || '-'}</TableCell>
                  <TableCell>{r.onboarded_date || '-'}</TableCell>
                  <TableCell>
                    {r.account_assigned_email === meEmail || (r.account_assigned_name || '').toLowerCase() === meName.toLowerCase()
                      ? <Badge className="bg-green-100 text-green-800">Assigned to you</Badge>
                      : <Badge className="bg-gray-100 text-gray-800">Assigned</Badge>
                    }
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">No assigned leads found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </ProtectedRoute>
  );
}
