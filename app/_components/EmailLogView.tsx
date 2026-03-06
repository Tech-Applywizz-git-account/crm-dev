"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/utils/supabase/client";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Mail,
    Search,
    Filter,
    ChevronLeft,
    ChevronRight,
    Eye,
    RefreshCw
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface EmailRecord {
    id: string;
    salesperson_email: string;
    client_email: string;
    subject: string;
    body: string;
    status: string;
    created_at: string;
    sent_at: string;
}

export function EmailLogView({ filterEmail }: { filterEmail?: string }) {
    const [emails, setEmails] = useState<EmailRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("all"); // all, manual, auto
    const [page, setPage] = useState(0);
    const [total, setTotal] = useState(0);
    const [selectedEmail, setSelectedEmail] = useState<EmailRecord | null>(null);
    const limit = 10;

    const fetchEmails = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase
                .from("crm_sent_emails")
                .select("*", { count: "exact" });

            if (filterEmail) {
                // If it's a salesperson view, show their emails OR automated ones
                // But the user said "show to respective sales person and finance associate"
                // Usually they want to see what they sent + auto ones.
                query = query.or(`salesperson_email.eq.${filterEmail},salesperson_email.eq.support@applywizz.com`);
            }

            if (search) {
                query = query.or(`client_email.ilike.%${search}%,subject.ilike.%${search}%`);
            }

            if (typeFilter === "auto") {
                query = query.eq("salesperson_email", "support@applywizz.com");
            } else if (typeFilter === "manual") {
                query = query.neq("salesperson_email", "support@applywizz.com");
            }

            const { data, error, count } = await query
                .order("created_at", { ascending: false })
                .range(page * limit, (page + 1) * limit - 1);

            if (error) throw error;
            setEmails(data || []);
            setTotal(count || 0);
        } catch (err) {
            console.error("Error fetching email logs:", err);
        } finally {
            setLoading(true); // Wait, should be false
            setLoading(false);
        }
    }, [filterEmail, page, search, typeFilter]);

    useEffect(() => {
        fetchEmails();
    }, [fetchEmails]);

    const formatDate = (date: string) => {
        if (!date) return "—";
        return new Date(date).toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getSenderLabel = (email: string) => {
        if (email === "support@applywizz.com") return "System (Auto)";
        return email.split("@")[0].replace(/[._]/g, " ");
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex flex-col gap-1">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Mail className="w-5 h-5 text-blue-600" />
                        Communication Logs
                    </h2>
                    <p className="text-xs text-gray-500">View sent emails and automated reminders</p>
                </div>

                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Search client email or subject..."
                            className="pl-9 h-9 text-sm"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                        />
                    </div>

                    <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
                        <SelectTrigger className="w-[140px] h-9 text-sm">
                            <Filter className="w-3 h-3 mr-2" />
                            <SelectValue placeholder="All Emails" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Emails</SelectItem>
                            <SelectItem value="manual">Manual Only</SelectItem>
                            <SelectItem value="auto">Automated Only</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button variant="outline" size="sm" className="h-9" onClick={fetchEmails}>
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-50/50">
                        <TableRow>
                            <TableHead className="w-[180px]">Date</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Sender</TableHead>
                            <TableHead>Subject</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-64 text-center text-gray-400">Loading logs...</TableCell>
                            </TableRow>
                        ) : emails.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-64 text-center text-gray-400 italic">No communication logs found.</TableCell>
                            </TableRow>
                        ) : (
                            emails.map((mail) => (
                                <TableRow key={mail.id} className="hover:bg-gray-50/50 transition-colors">
                                    <TableCell className="text-xs font-medium text-gray-600">
                                        {formatDate(mail.created_at)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold text-gray-900">{mail.client_email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={`text-[10px] uppercase font-bold ${mail.salesperson_email === 'support@applywizz.com' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                                            {getSenderLabel(mail.salesperson_email)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="max-w-[200px] truncate group" title={mail.subject}>
                                        <span className="text-sm text-gray-700 group-hover:text-blue-600 transition-colors">{mail.subject}</span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge className={`text-[10px] font-bold uppercase rounded-full px-2 ${mail.status === 'sent' ? 'bg-green-100 text-green-700' : mail.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                            {mail.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" onClick={() => setSelectedEmail(mail)}>
                                            <Eye className="w-4 h-4 text-gray-500" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                <div className="p-4 border-t flex items-center justify-between bg-gray-50/30">
                    <div className="text-xs text-gray-500 font-medium">
                        Showing {emails.length} of {total} communications
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page === 0}
                            onClick={() => setPage(p => p - 1)}
                            className="h-8 gap-1"
                        >
                            <ChevronLeft className="w-4 h-4" /> Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={(page + 1) * limit >= total}
                            onClick={() => setPage(p => p + 1)}
                            className="h-8 gap-1"
                        >
                            Next <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            <Dialog open={!!selectedEmail} onOpenChange={(open) => !open && setSelectedEmail(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Mail className="w-5 h-5 text-blue-600" />
                            Email Details
                        </DialogTitle>
                    </DialogHeader>
                    {selectedEmail && (
                        <div className="space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                                <div className="space-y-1">
                                    <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">From</span>
                                    <span className="text-sm font-bold text-gray-800">{selectedEmail.salesperson_email}</span>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">To</span>
                                    <span className="text-sm font-bold text-gray-800">{selectedEmail.client_email}</span>
                                </div>
                                <div className="col-span-2 pt-2 border-t border-gray-200">
                                    <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Subject</span>
                                    <span className="text-sm font-bold text-gray-900">{selectedEmail.subject}</span>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Message Body</span>
                                <div className="p-6 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto shadow-inner">
                                    {selectedEmail.body}
                                </div>
                            </div>

                            <div className="flex justify-between items-center text-[10px] text-gray-400 px-1 pt-2">
                                <span>Sent At: {formatDate(selectedEmail.sent_at || selectedEmail.created_at)}</span>
                                <span>ID: {selectedEmail.id}</span>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
