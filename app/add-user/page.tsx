
// "use client";

// import { useState } from "react";
// import { supabase } from '@/utils/supabase/client';
// import { DashboardLayout } from "@/components/layout/dashboard-layout";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
// import { Button } from "@/components/ui/button";
// import ProtectedRoute from "@/components/auth/ProtectedRoute";
// import { useEmail } from "../context/EmailProvider";

// export const roles = [
//   "Admin",
//   "Finance",
//   "Sales",
//   "Marketing",
//   "Accounts",
//   "Marketing Associate",
//   "Sales Associate",
//   "Finance Associate",
//   "Accounts Associate",
//   // new:
//   "Technical Head",
//   "Technical Associate",
//   "Resume Head",
//   "Resume Associate",
// ] as const;

// // // (optional) get a Role union type from the array
// // export type Role = typeof roles[number];


// export default function AddUserPage() {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [role, setRole] = useState("Sales");
//   const [loading, setLoading] = useState(false);
//   const [message, setMessage] = useState(""); 
//   const [showPassword, setShowPassword] = useState(false);
//   const [fullName, setFullName] = useState("");
//   const { setSignupEmail } = useEmail();

//   const handleSignup = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setLoading(true);
//     setMessage("");

//     try {
//       // Store email in context and sessionStorage
//       setSignupEmail(email);
//       sessionStorage.setItem('signup_email', email);

//       const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
//         email,
//         password,
//         options: {
//           data: { full_name: fullName },
//     emailRedirectTo: `https://applywizz-crm-tool.vercel.app/email-verify-redirect?email=${email}`,
//         }
//       });

//       if (signUpError) throw signUpError;

//       // Store email in localStorage as fallback
//       localStorage.setItem("applywizz_user_email", email);

//       const authId = signUpData.user?.id;
//       if (!authId) throw new Error("User ID not returned");

//       await new Promise((res) => setTimeout(res, 1500)); // Wait for auth.users to complete

//       const { data: uidData, error: uidError } = await supabase.rpc("generate_user_id");
//       if (uidError) throw uidError;

//       const customUserId = uidData;

//       const { error: profileError } = await supabase.from("profiles").insert([
//         {
//           user_id: customUserId,
//           auth_id: authId,
//           roles: role,
//           full_name: fullName,
//           user_email:email,
//         },
//       ]);

//       if (profileError) throw profileError;

//       const now = new Date();
//       const timeString = now.toLocaleTimeString([], {
//         hour: '2-digit',
//         minute: '2-digit',
//         second: '2-digit',
//         hour12: true
//       });
//       setMessage(`✅ User created at ${timeString}. Ask them to verify email.`);

//     } catch (err: any) {
//       // Clear email storage on error
//       setSignupEmail('');
//       sessionStorage.removeItem('signup_email');
//       localStorage.removeItem("applywizz_user_email");
      
//       setMessage("❌ " + (err.message || "Failed to create user"));
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <ProtectedRoute allowedRoles={["add-user", "Super Admin"]}>
//       <DashboardLayout>
//         <div className="space-y-4">
//           <Card>
//             <CardHeader>
//               <CardTitle>Add New User</CardTitle>
//             </CardHeader>
//             <CardContent>
//               <form onSubmit={handleSignup} className="space-y-4">
//                 <div>
//                   <label className="block text-sm font-medium mb-1">Full Name</label>
//                   <Input
//                     type="text"
//                     value={fullName}
//                     onChange={(e) => setFullName(e.target.value)}
//                     required
//                     placeholder="Enter full name"
//                   />
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium mb-1">Email</label>
//                   <Input
//                     type="email"
//                     value={email}
//                     onChange={(e) => setEmail(e.target.value)}
//                     required
//                     placeholder="Enter email"
//                   />
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium mb-1">Password</label>
//                   <div className="relative">
//                     <Input
//                       type={showPassword ? "text" : "password"}
//                       value={password}
//                       onChange={(e) => setPassword(e.target.value)}
//                       required
//                       placeholder="Enter password"
//                       minLength={6}
//                     />
//                     <button
//                       type="button"
//                       className="absolute right-2 top-2 text-xs text-gray-500"
//                       onClick={() => setShowPassword(!showPassword)}
//                     >
//                       {showPassword ? "Hide" : "Show"}
//                     </button>
//                   </div>
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium mb-1">Role</label>
//                   <Select value={role} onValueChange={setRole}>
//                     <SelectTrigger>
//                       <SelectValue placeholder="Select role" />
//                     </SelectTrigger>
//                     <SelectContent>
//                       {roles.map((role) => (
//                         <SelectItem key={role} value={role}>
//                           {role}
//                         </SelectItem>
//                       ))}
//                     </SelectContent>
//                   </Select>
//                 </div>

//                 <Button type="submit" disabled={loading} className="w-full">
//                   {loading ? "Creating User..." : "Create User"}
//                 </Button>

//                 {message && (
//                   <p className={`mt-2 text-sm text-center ${
//                     message.startsWith("✅") ? "text-green-600" : "text-red-600"
//                   }`}>
//                     {message}
//                   </p>
//                 )}
//               </form>
//             </CardContent>
//           </Card>
//         </div>
//       </DashboardLayout>
//     </ProtectedRoute>
//   );
// }










// "use client";

// import { useState, useEffect, memo, useCallback, useMemo } from "react";
// import { supabase } from '@/utils/supabase/client';
// import { DashboardLayout } from "@/components/layout/dashboard-layout";
// import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
// import { Button } from "@/components/ui/button";
// import ProtectedRoute from "@/components/auth/ProtectedRoute";
// import { useEmail } from "../context/EmailProvider";
// import { Check, ChevronsUpDown, UserMinus, UserPlus, ArrowUpDown, ArrowUp, ArrowDown, Search } from "lucide-react";
// import { cn } from "@/lib/utils";
// import {
//   Command,
//   CommandEmpty,
//   CommandGroup,
//   CommandInput,
//   CommandItem,
//   CommandList,
// } from "@/components/ui/command";
// import {
//   Popover,
//   PopoverContent,
//   PopoverTrigger,
// } from "@/components/ui/popover";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import { Alert, AlertDescription } from "@/components/ui/alert";

// export const roles = [
//   "Admin",
//   "Finance",
//   "Sales",
//   "Marketing",
//   "Accounts",
//   "Marketing Associate",
//   "Sales Associate",
//   "Finance Associate",
//   "Accounts Associate",
//   "Technical Head",
//   "Technical Associate",
//   "Resume Head",
//   "Resume Associate",
// ] as const;

// interface Profile {
//   auth_id: string;
//   user_id: string;
//   full_name: string;
//   user_email: string;
//   roles: string;
//   is_active: string;
//   created_at: string;
//   user_removed_at: string | null;
// }

// // --- Sub-components to isolate state and prevent over-rendering ---

// const AddUserForm = memo(({ setMessage, fetchProfiles, setSignupEmail }: {
//   setMessage: (m: string) => void,
//   fetchProfiles: () => void,
//   setSignupEmail: (e: string) => void
// }) => {
//   const [fullName, setFullName] = useState("");
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [role, setRole] = useState("Sales");
//   const [showPassword, setShowPassword] = useState(false);
//   const [isSubmitting, setIsSubmitting] = useState(false);

//   const handleSignup = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setIsSubmitting(true);
//     setMessage("");

//     try {
//       setSignupEmail(email);
//       sessionStorage.setItem('signup_email', email);

//       const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
//         email,
//         password,
//         options: {
//           data: { full_name: fullName },
//           emailRedirectTo: `https://applywizz-crm-tool.vercel.app/email-verify-redirect?email=${email}`,
//         }
//       });

//       if (signUpError) throw signUpError;

//       localStorage.setItem("applywizz_user_email", email);

//       const authId = signUpData.user?.id;
//       if (!authId) throw new Error("User ID not returned");

//       await new Promise((res) => setTimeout(res, 1500));

//       const { data: uidData, error: uidError } = await supabase.rpc("generate_user_id");
//       if (uidError) throw uidError;

//       const { error: profileError } = await supabase.from("profiles").insert([
//         {
//           user_id: uidData,
//           auth_id: authId,
//           roles: role,
//           full_name: fullName,
//           user_email: email,
//           is_active: 'true'
//         },
//       ]);

//       if (profileError) throw profileError;

//       const now = new Date();
//       setMessage(`✅ User created at ${now.toLocaleTimeString()}. Ask them to verify email.`);

//       setEmail("");
//       setPassword("");
//       setFullName("");
//       fetchProfiles();
//     } catch (err: any) {
//       const technicalMsg = err.message || "Failed to create user";
//       if (technicalMsg.includes("profiles_email_unique")) {
//         setMessage(`❌ User already exists||TECHNICAL:${technicalMsg}`);
//       } else {
//         setMessage("❌ " + technicalMsg);
//       }
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   return (
//     <form onSubmit={handleSignup} className="space-y-4">
//       <div className="grid grid-cols-1 gap-4">
//         <div className="space-y-2">
//           <label className="text-[12px] font-medium">Full Name</label>
//           <Input
//             value={fullName}
//             onChange={(e) => setFullName(e.target.value)}
//             required
//             placeholder="John Doe"
//           />
//         </div>
//         <div className="space-y-2">
//           <label className="text-[12px] font-medium">Email Address</label>
//           <Input
//             type="email"
//             value={email}
//             onChange={(e) => setEmail(e.target.value)}
//             required
//             placeholder="john@example.com"
//           />
//         </div>
//         <div className="space-y-2">
//           <label className="text-[12px] font-medium">Password</label>
//           <div className="relative">
//             <Input
//               type={showPassword ? "text" : "password"}
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               required
//               placeholder="••••••••"
//               minLength={6}
//             />
//             <button
//               type="button"
//               className="absolute right-3 top-2.5 text-gray-500 text-[12px]"
//               onClick={() => setShowPassword(!showPassword)}
//             >
//               {showPassword ? "Hide" : "Show"}
//             </button>
//           </div>
//         </div>
//         <div className="space-y-2">
//           <label className="text-[12px] font-medium">Role</label>
//           <Select value={role} onValueChange={setRole}>
//             <SelectTrigger>
//               <SelectValue placeholder="Select role" />
//             </SelectTrigger>
//             <SelectContent>
//               {roles.map((r) => (
//                 <SelectItem key={r} value={r}>{r}</SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         </div>
//       </div>
//       <Button type="submit" disabled={isSubmitting} className="w-full mt-4">
//         {isSubmitting ? "Creating..." : "Create User"}
//       </Button>
//     </form>
//   );
// });
// AddUserForm.displayName = "AddUserForm";

// const RemoveAccessForm = memo(({ profiles, fetchProfiles, setMessage }: {
//   profiles: Profile[],
//   fetchProfiles: () => void,
//   setMessage: (m: string) => void
// }) => {
//   const [open, setOpen] = useState(false);
//   const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
//   const [isProcessing, setIsProcessing] = useState(false);

//   const handleDeactivate = async () => {
//     if (!selectedUser) return;
//     setIsProcessing(true);
//     setMessage("");

//     try {
//       const { error } = await supabase
//         .from("profiles")
//         .update({
//           is_active: "false",
//           user_removed_at: new Date().toISOString()
//         })
//         .eq("auth_id", selectedUser.auth_id);

//       if (error) throw error;

//       setMessage(`✅ Access removed for ${selectedUser.full_name}`);
//       setSelectedUser(null);
//       fetchProfiles();
//     } catch (err: any) {
//       setMessage("❌ " + (err.message || "Failed to deactivate account"));
//     } finally {
//       setIsProcessing(false);
//     }
//   };

//   const handleReactivate = async () => {
//     if (!selectedUser) return;
//     setIsProcessing(true);
//     setMessage("");

//     try {
//       const { error } = await supabase
//         .from("profiles")
//         .update({
//           is_active: "true",
//           user_removed_at: null
//         })
//         .eq("auth_id", selectedUser.auth_id);

//       if (error) throw error;

//       setMessage(`✅ Access restored for ${selectedUser.full_name}`);
//       setSelectedUser(null);
//       fetchProfiles();
//     } catch (err: any) {
//       setMessage("❌ " + (err.message || "Failed to reactivate account"));
//     } finally {
//       setIsProcessing(false);
//     }
//   };

//   return (
//     <div className="space-y-6">
//       <div className="space-y-2">
//         <label className="text-sm font-medium mb-1 block">Search User</label>
//         <Popover open={open} onOpenChange={setOpen}>
//           <PopoverTrigger asChild>
//             <Button
//               variant="outline"
//               role="combobox"
//               aria-expanded={open}
//               className="w-full justify-between"
//             >
//               {selectedUser
//                 ? `${selectedUser.full_name} (${selectedUser.user_email})`
//                 : "Select user by name or email..."}
//               <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
//             </Button>
//           </PopoverTrigger>
//           <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
//             <Command>
//               <CommandInput placeholder="Search name or email..." />
//               <CommandList>
//                 <CommandEmpty>No user found.</CommandEmpty>
//                 <CommandGroup>
//                   {profiles.map((profile) => (
//                     <CommandItem
//                       key={profile.auth_id}
//                       value={`${profile.full_name} ${profile.user_email}`}
//                       onSelect={() => {
//                         setSelectedUser(profile);
//                         setOpen(false);
//                       }}
//                       className="flex items-center justify-between"
//                     >
//                       <div className="flex items-center">
//                         <Check
//                           className={cn(
//                             "mr-2 h-4 w-4",
//                             selectedUser?.auth_id === profile.auth_id ? "opacity-100" : "opacity-0"
//                           )}
//                         />
//                         <div className="flex flex-col">
//                           <span>{profile.full_name}</span>
//                           <span className="text-xs text-gray-500">{profile.user_email} • {profile.roles}</span>
//                         </div>
//                       </div>
//                       <span className={cn(
//                         "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase",
//                         profile.is_active === "true"
//                           ? "bg-green-100 text-green-700"
//                           : "bg-red-100 text-red-700"
//                       )}>
//                         {profile.is_active === "true" ? "Active" : "Deactivated"}
//                       </span>
//                     </CommandItem>
//                   ))}
//                 </CommandGroup>
//               </CommandList>
//             </Command>
//           </PopoverContent>
//         </Popover>
//       </div>

//       {selectedUser && (
//         <div className="border rounded-lg overflow-hidden animate-in fade-in slide-in-from-top-2">
//           <Table>
//             <TableHeader className="bg-gray-50">
//               <TableRow>
//                 <TableHead>Full Name</TableHead>
//                 <TableHead>Email</TableHead>
//                 <TableHead>Role</TableHead>
//                 <TableHead>Status</TableHead>
//               </TableRow>
//             </TableHeader>
//             <TableBody>
//               <TableRow>
//                 <TableCell className="font-medium text-[12px]">{selectedUser.full_name}</TableCell>
//                 <TableCell className="text-[12px]">{selectedUser.user_email}</TableCell>
//                 <TableCell className="text-[12px]">{selectedUser.roles}</TableCell>
//                 <TableCell>
//                   <span className={cn(
//                     "px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase",
//                     selectedUser.is_active === "true" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
//                   )}>
//                     {selectedUser.is_active === "true" ? "Active" : "Inactive"}
//                   </span>
//                 </TableCell>
//               </TableRow>
//             </TableBody>
//           </Table>
//           <div className="p-4 bg-gray-50 border-t flex justify-end">
//             {selectedUser.is_active === "true" ? (
//               <Button
//                 variant="destructive"
//                 onClick={handleDeactivate}
//                 disabled={isProcessing}
//                 className="gap-2"
//               >
//                 <UserMinus className="h-4 w-4" />
//                 {isProcessing ? "Removing Access..." : "Remove Access"}
//               </Button>
//             ) : (
//               <Button
//                 onClick={handleReactivate}
//                 disabled={isProcessing}
//                 className="gap-2 bg-green-600 hover:bg-green-700 text-white"
//               >
//                 <UserPlus className="h-4 w-4" />
//                 {isProcessing ? "Reactivating..." : "Reactivate Access"}
//               </Button>
//             )}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// });
// RemoveAccessForm.displayName = "RemoveAccessForm";

// const TeamOverview = memo(({ profiles, filterStatus, setFilterStatus, searchQuery, setSearchQuery, sortConfig, toggleSort, formatDate, calculateTenure }: any) => {
//   return (
//     <Card className="w-full xl:w-[65%] overflow-hidden">
//       <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0 pb-4">
//         <div>
//           <CardTitle className="text-[18px]">Team Overview</CardTitle>
//           <CardDescription className="text-[12px]">All registered users and their current status.</CardDescription>
//         </div>
//         <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
//           <div className="relative w-full sm:w-64">
//             <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
//             <Input
//               placeholder="Search name, email, ID, role..."
//               className="pl-9 h-9 text-[12px]"
//               value={searchQuery}
//               onChange={(e) => setSearchQuery(e.target.value)}
//             />
//           </div>
//           <div className="flex gap-1 bg-gray-100 p-1 rounded-md shrink-0">
//             <Button
//               variant={filterStatus === "all" ? "default" : "ghost"}
//               size="sm"
//               className="text-[10px] h-7 px-3"
//               onClick={() => setFilterStatus("all")}
//             >
//               All
//             </Button>
//             <Button
//               variant={filterStatus === "active" ? "default" : "ghost"}
//               size="sm"
//               className="text-[10px] h-7 px-3"
//               onClick={() => setFilterStatus("active")}
//             >
//               Active
//             </Button>
//             <Button
//               variant={filterStatus === "deactivated" ? "default" : "ghost"}
//               size="sm"
//               className="text-[10px] h-7 px-3"
//               onClick={() => setFilterStatus("deactivated")}
//             >
//               Deactivated
//             </Button>
//           </div>
//         </div>
//       </CardHeader>
//       <CardContent className="p-0">
//         <div className="overflow-x-auto text-[11px]">
//           <Table>
//             <TableHeader className="bg-gray-50">
//               <TableRow>
//                 <TableHead className="px-1 text-[12px] text-center w-12 cursor-pointer hover:bg-gray-100" onClick={() => toggleSort('sno')}>
//                   <div className="flex items-center justify-center gap-1">
//                     S.No
//                     {sortConfig?.key === 'sno' ? (sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 text-gray-400" />}
//                   </div>
//                 </TableHead>
//                 <TableHead className="px-2 text-[12px] text-center cursor-pointer hover:bg-gray-100" onClick={() => toggleSort('user_id')}>
//                   <div className="flex items-center justify-center gap-1">
//                     User ID
//                     {sortConfig?.key === 'user_id' ? (sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 text-gray-400" />}
//                   </div>
//                 </TableHead>
//                 <TableHead className="px-2 text-[12px] text-center cursor-pointer hover:bg-gray-100" onClick={() => toggleSort('full_name')}>
//                   <div className="flex items-center justify-center gap-1">
//                     Full Name
//                     {sortConfig?.key === 'full_name' ? (sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 text-gray-400" />}
//                   </div>
//                 </TableHead>
//                 <TableHead className="px-2 text-[12px] text-center cursor-pointer hover:bg-gray-100" onClick={() => toggleSort('user_email')}>
//                   <div className="flex items-center justify-center gap-1">
//                     Email
//                     {sortConfig?.key === 'user_email' ? (sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 text-gray-400" />}
//                   </div>
//                 </TableHead>
//                 <TableHead className="px-2 text-[12px] text-center cursor-pointer hover:bg-gray-100" onClick={() => toggleSort('roles')}>
//                   <div className="flex items-center justify-center gap-1">
//                     Role
//                     {sortConfig?.key === 'roles' ? (sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 text-gray-400" />}
//                   </div>
//                 </TableHead>
//                 <TableHead className="px-2 text-[12px] text-center cursor-pointer hover:bg-gray-100" onClick={() => toggleSort('is_active')}>
//                   <div className="flex items-center justify-center gap-1">
//                     Status
//                     {sortConfig?.key === 'is_active' ? (sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 text-gray-400" />}
//                   </div>
//                 </TableHead>
//                 <TableHead className="px-2 text-[12px] text-center cursor-pointer hover:bg-gray-100 whitespace-nowrap" onClick={() => toggleSort('created_at')}>
//                   <div className="flex items-center justify-center gap-1">
//                     Registered At
//                     {sortConfig?.key === 'created_at' ? (sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 text-gray-400" />}
//                   </div>
//                 </TableHead>
//                 <TableHead className="px-2 text-[12px] text-center cursor-pointer hover:bg-gray-100 whitespace-nowrap" onClick={() => toggleSort('user_removed_at')}>
//                   <div className="flex items-center justify-center gap-1">
//                     Deactivated At
//                     {sortConfig?.key === 'user_removed_at' ? (sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 text-gray-400" />}
//                   </div>
//                 </TableHead>
//                 <TableHead className="px-2 text-[12px] text-center cursor-pointer hover:bg-gray-100" onClick={() => toggleSort('tenure')}>
//                   <div className="flex items-center justify-center gap-1">
//                     Tenure
//                     {sortConfig?.key === 'tenure' ? (sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 text-gray-400" />}
//                   </div>
//                 </TableHead>
//               </TableRow>
//             </TableHeader>
//             <TableBody>
//               {profiles.length > 0 ? (
//                 profiles.map((profile: Profile, index: number) => (
//                   <TableRow key={profile.auth_id} className="h-10 hover:bg-gray-50/50">
//                     <TableCell className="px-1 text-[12px] text-center font-medium">{index + 1}</TableCell>
//                     <TableCell className="font-mono text-[11px] text-gray-500 px-2 text-center">{profile.user_id}</TableCell>
//                     <TableCell className="font-medium whitespace-nowrap px-2 text-[12px] text-center">{profile.full_name}</TableCell>
//                     <TableCell className="whitespace-nowrap px-2 text-[12px] text-center">{profile.user_email}</TableCell>
//                     <TableCell className="whitespace-nowrap px-2 text-[12px] text-center">{profile.roles}</TableCell>
//                     <TableCell className="px-2 text-center text-[12px]">
//                       <span className={cn(
//                         "px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase",
//                         profile.is_active === "true" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
//                       )}>
//                         {profile.is_active === "true" ? "Active" : "Deactivated"}
//                       </span>
//                     </TableCell>
//                     <TableCell className="whitespace-nowrap px-2 text-[11px] text-center text-gray-600">{formatDate(profile.created_at)}</TableCell>
//                     <TableCell className="whitespace-nowrap px-2 text-[11px] text-center text-gray-600">{formatDate(profile.user_removed_at)}</TableCell>
//                     <TableCell className="whitespace-nowrap px-2 text-[11px] text-center font-semibold text-blue-700">{calculateTenure(profile)}</TableCell>
//                   </TableRow>
//                 ))
//               ) : (
//                 <TableRow>
//                   <TableCell colSpan={9} className="text-center py-10 text-gray-500 text-sm">
//                     {searchQuery ? "No matching team members found." : "No team members found."}
//                   </TableCell>
//                 </TableRow>
//               )}
//             </TableBody>
//           </Table>
//         </div>
//       </CardContent>
//     </Card>
//   );
// });
// TeamOverview.displayName = "TeamOverview";

// export default function AddUserPage() {
//   const [mode, setMode] = useState<"add" | "deactivate">("add");
//   const [message, setMessage] = useState("");
//   const { setSignupEmail } = useEmail();

//   const [profiles, setProfiles] = useState<Profile[]>([]);
//   const [filterStatus, setFilterStatus] = useState<"all" | "active" | "deactivated">("all");
//   const [searchQuery, setSearchQuery] = useState("");
//   const [sortConfig, setSortConfig] = useState<{ key: keyof Profile | 'tenure' | 'sno', direction: 'asc' | 'desc' } | null>({ key: 'full_name', direction: 'asc' });

//   const fetchProfiles = useCallback(async () => {
//     try {
//       const { data, error } = await supabase
//         .from("profiles")
//         .select("*")
//         .order("full_name", { ascending: true });

//       if (error) throw error;
//       setProfiles(data || []);
//     } catch (err: any) {
//       console.error("Error fetching profiles:", err);
//       setMessage("❌ Failed to load users");
//     }
//   }, []);

//   useEffect(() => {
//     fetchProfiles();
//   }, [fetchProfiles]);

//   const toggleSort = useCallback((key: keyof Profile | 'tenure' | 'sno') => {
//     setSortConfig(prev => {
//       let direction: 'asc' | 'desc' = 'asc';
//       if (prev && prev.key === key && prev.direction === 'asc') {
//         direction = 'desc';
//       }
//       return { key, direction };
//     });
//   }, []);

//   const calculateTenure = useCallback((profile: Profile) => {
//     const start = new Date(profile.created_at);
//     const end = profile.user_removed_at ? new Date(profile.user_removed_at) : new Date();

//     const diffTime = Math.abs(end.getTime() - start.getTime());
//     const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

//     if (diffDays < 30) return `${diffDays} days`;
//     const diffMonths = Math.floor(diffDays / 30);
//     if (diffMonths < 12) return `${diffMonths} mo, ${diffDays % 30} d`;

//     const diffYears = Math.floor(diffMonths / 12);
//     return `${diffYears} yr, ${diffMonths % 12} mo`;
//   }, []);

//   const calculateTenureInMs = useCallback((profile: Profile) => {
//     const start = new Date(profile.created_at);
//     const end = profile.user_removed_at ? new Date(profile.user_removed_at) : new Date();
//     return end.getTime() - start.getTime();
//   }, []);

//   const formatDate = useCallback((dateString: string | null) => {
//     if (!dateString) return "-";
//     const date = new Date(dateString);
//     return date.toLocaleString('en-IN', {
//       timeZone: 'Asia/Kolkata',
//       day: '2-digit',
//       month: '2-digit',
//       year: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit',
//       second: '2-digit',
//       hour12: true
//     });
//   }, []);

//   const filteredAndSortedProfiles = useMemo(() => {
//     return profiles
//       .filter((p) => {
//         // First by status
//         if (filterStatus === "active") if (p.is_active !== "true") return false;
//         if (filterStatus === "deactivated") if (p.is_active !== "false") return false;

//         // Then by search query
//         if (searchQuery) {
//           const q = searchQuery.toLowerCase();
//           return (
//             p.full_name?.toLowerCase().includes(q) ||
//             p.user_email?.toLowerCase().includes(q) ||
//             p.user_id?.toLowerCase().includes(q) ||
//             p.roles?.toLowerCase().includes(q)
//           );
//         }
//         return true;
//       })
//       .sort((a: any, b: any) => {
//         if (!sortConfig) return 0;
//         const { key, direction } = sortConfig;
//         let comparison = 0;

//         if (key === 'tenure') {
//           const tenureA = calculateTenureInMs(a);
//           const tenureB = calculateTenureInMs(b);
//           comparison = tenureA - tenureB;
//         } else if (key === 'sno') {
//           comparison = 0;
//         } else {
//           const valA = a[key]?.toString().toLowerCase() || "";
//           const valB = b[key]?.toString().toLowerCase() || "";
//           comparison = valA.localeCompare(valB);
//         }

//         return direction === "asc" ? comparison : -comparison;
//       });
//   }, [profiles, filterStatus, searchQuery, sortConfig, calculateTenureInMs]);

//   return (
//     <ProtectedRoute allowedRoles={["add-user", "Super Admin"]}>
//       <DashboardLayout>
//         <div className="space-y-6 px-1">
//           <div className="flex gap-10 items-center pr-4">
//             <h1 className="text-2xl font-bold">User Management</h1>
//             <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
//               <Button
//                 variant={mode === "add" ? "default" : "ghost"}
//                 size="sm"
//                 onClick={() => { setMode("add"); setMessage(""); }}
//                 className="gap-2"
//               >
//                 <UserPlus className="h-4 w-4" />
//                 Add User
//               </Button>
//               <Button
//                 variant={mode === "deactivate" ? "default" : "ghost"}
//                 size="sm"
//                 onClick={() => { setMode("deactivate"); setMessage(""); }}
//                 className="gap-2"
//               >
//                 <UserMinus className="h-4 w-4" />
//                 Deactivate Account
//               </Button>
//             </div>
//           </div>

//           <div className="flex flex-col xl:flex-row gap-6 items-start">
//             {/* Left Side: Actions (35%) */}
//             <Card className="w-full xl:w-[35%] shrink-0 sticky top-4">
//               <CardHeader>
//                 <CardTitle className="text-[18px]">{mode === "add" ? "Create New Account" : "Remove Account Access"}</CardTitle>
//                 <CardDescription className="text-[12px]">
//                   {mode === "add"
//                     ? "Enter details to invite a new team member."
//                     : "Search and select a user to disable their access to the CRM."}
//                 </CardDescription>
//               </CardHeader>
//               <CardContent>
//                 {mode === "add" ? (
//                   <AddUserForm
//                     setMessage={setMessage}
//                     fetchProfiles={fetchProfiles}
//                     setSignupEmail={setSignupEmail}
//                   />
//                 ) : (
//                   <RemoveAccessForm
//                     profiles={profiles}
//                     fetchProfiles={fetchProfiles}
//                     setMessage={setMessage}
//                   />
//                 )}

//                 {message && (
//                   <Alert className={cn(
//                     "mt-6",
//                     message.startsWith("✅") ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
//                   )}>
//                     <AlertDescription className="flex flex-col gap-0.5">
//                       <span className="font-medium text-[13px]">{message.split("||TECHNICAL:")[0]}</span>
//                       {message.includes("||TECHNICAL:") && (
//                         <span className="text-[9px] opacity-80 leading-tight">
//                           {message.split("||TECHNICAL:")[1]}
//                         </span>
//                       )}
//                     </AlertDescription>
//                   </Alert>
//                 )}
//               </CardContent>
//             </Card>

//             {/* Right Side: User List Grid (65%) */}
//             <TeamOverview
//               profiles={filteredAndSortedProfiles}
//               filterStatus={filterStatus}
//               setFilterStatus={setFilterStatus}
//               searchQuery={searchQuery}
//               setSearchQuery={setSearchQuery}
//               sortConfig={sortConfig}
//               toggleSort={toggleSort}
//               formatDate={formatDate}
//               calculateTenure={calculateTenure}
//             />
//           </div>
//         </div>
//       </DashboardLayout>
//     </ProtectedRoute>
//   );
// }




















"use client";

import { useState, useEffect, memo, useCallback, useMemo } from "react";
import { supabase } from '@/utils/supabase/client';
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useEmail } from "../context/EmailProvider";
import { Check, ChevronsUpDown, UserMinus, UserPlus, ArrowUpDown, ArrowUp, ArrowDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Settings2, Plus, ShieldCheck, Briefcase, Eye, EyeOff } from "lucide-react";

export const DEFAULT_ROLES = [
  "Admin",
  "Finance",
  "Sales",
  "Marketing",
  "Accounts",
  "Marketing Associate",
  "Sales Associate",
  "Finance Associate",
  "Accounts Associate",
  "Technical Head",
  "Technical Associate",
  "Resume Head",
  "Resume Associate",
] as const;

interface Profile {
  auth_id: string;
  user_id: string;
  full_name: string;
  user_email: string;
  roles: string;
  is_active: string;
  created_at: string;
  user_removed_at: string | null;
}

// --- Sub-components to isolate state and prevent over-rendering ---

const SwapRoleDialog = memo(({ user, availableRoles, onUpdated, setMessage }: { 
  user: Profile, 
  availableRoles: string[], 
  onUpdated: () => void,
  setMessage: (m: string) => void 
}) => {
  const [selectedRole, setSelectedRole] = useState(user.roles);
  const [isUpdating, setIsUpdating] = useState(false);
  const [open, setOpen] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [step, setStep] = useState(1); // 1: Select Role, 2: Password Confirmation
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleUpdate = async () => {
    if (step === 1) {
      setStep(2);
      return;
    }

    if (confirmPassword !== "Shyam@123") {
      setPasswordError("Incorrect confirmation password");
      return;
    }
    setPasswordError("");
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ roles: selectedRole })
        .eq("auth_id", user.auth_id);

      if (error) throw error;
      
      setMessage(`✅ Role swapped for ${user.full_name} to ${selectedRole}`);
      setOpen(false);
      onUpdated();
    } catch (err: any) {
      setMessage("❌ Failed to swap role: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 gap-2 border-blue-100 bg-blue-50/50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 font-medium text-[11px] px-3 transition-all"
        >
          <Settings2 className="h-3.5 w-3.5" />
          {user.roles}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-blue-600" />
            Swap Employee Role
          </DialogTitle>
          <DialogDescription>
            Moving <strong>{user.full_name}</strong> to a different position.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-6">
          <div className="space-y-3">
            {step === 1 ? (
              <div className="space-y-4">
                <div className="flex justify-between text-[12px]">
                  <span className="text-gray-500">Current Role:</span>
                  <span className="font-bold text-gray-900">{user.roles}</span>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Select New Role</label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a new role..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 p-3 rounded-md border border-blue-100 flex flex-col gap-1">
                  <div className="text-[10px] uppercase text-blue-600 font-bold">Planned Swap</div>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="text-gray-500">{user.roles}</span>
                    <Settings2 className="h-3 w-3 text-gray-400" />
                    <span className="text-blue-700 font-bold">{selectedRole}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Confirmation Password</label>
                  <div className="relative">
                    <Input 
                      type={showConfirmPassword ? "text" : "password"} 
                      placeholder="Enter password to confirm" 
                      value={confirmPassword} 
                      autoFocus
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (passwordError) setPasswordError("");
                      }}
                      className={passwordError ? "border-red-500 pr-10" : "pr-10"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {passwordError && <p className="text-[10px] text-red-500 font-medium">{passwordError}</p>}
                </div>
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button 
            variant="ghost" 
            onClick={() => { 
              if (step === 2) {
                setStep(1);
                setConfirmPassword("");
                setPasswordError("");
                setShowConfirmPassword(false);
              } else {
                setOpen(false); 
                setConfirmPassword(""); 
                setPasswordError(""); 
                setShowConfirmPassword(false);
              }
            }}
          >
            {step === 2 ? "Back" : "Cancel"}
          </Button>
          <Button 
            onClick={handleUpdate} 
            disabled={isUpdating || selectedRole === user.roles || (step === 2 && !confirmPassword)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {step === 1 ? "Confirm Role Swap" : (isUpdating ? "Processing Swap..." : "Finalize Swap")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
SwapRoleDialog.displayName = "SwapRoleDialog";

const AddRoleDialog = memo(({ onAdd }: { onAdd: (role: string) => void }) => {
  const [newRole, setNewRole] = useState("");
  const [open, setOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRole.trim()) {
      onAdd(newRole.trim());
      setNewRole("");
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-7 px-3 bg-white hover:bg-gray-50 text-[10px]">
          <Plus className="h-3 w-3" />
          Add New Role
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Role</DialogTitle>
          <DialogDescription>
            This will add a new role to the dropdown options. Please note this is currently session-based unless persisted to DB.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Role Name</label>
            <Input 
              placeholder="e.g. Quality Analyst" 
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Add Role</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});
AddRoleDialog.displayName = "AddRoleDialog";

const AddUserForm = memo(({ setMessage, fetchProfiles, setSignupEmail, availableRoles }: {
  setMessage: (m: string) => void,
  fetchProfiles: () => void,
  setSignupEmail: (e: string) => void,
  availableRoles: string[]
}) => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>(availableRoles[0] || "Sales");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      setSignupEmail(email);
      sessionStorage.setItem('signup_email', email);

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `https://applywizz-crm-tool.vercel.app/email-verify-redirect?email=${email}`,
        }
      });

      if (signUpError) throw signUpError;

      localStorage.setItem("applywizz_user_email", email);

      const authId = signUpData.user?.id;
      if (!authId) throw new Error("User ID not returned");

      await new Promise((res) => setTimeout(res, 1500));

      const { data: uidData, error: uidError } = await supabase.rpc("generate_user_id");
      if (uidError) throw uidError;

      const { error: profileError } = await supabase.from("profiles").insert([
        {
          user_id: uidData,
          auth_id: authId,
          roles: role,
          full_name: fullName,
          user_email: email,
          is_active: 'true'
        },
      ]);

      if (profileError) throw profileError;

      const now = new Date();
      setMessage(`✅ User created at ${now.toLocaleTimeString()}. Ask them to verify email.`);

      setEmail("");
      setPassword("");
      setFullName("");
      fetchProfiles();
    } catch (err: any) {
      const technicalMsg = err.message || "Failed to create user";
      if (technicalMsg.includes("profiles_email_unique")) {
        setMessage(`❌ User already exists||TECHNICAL:${technicalMsg}`);
      } else {
        setMessage("❌ " + technicalMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSignup} className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <label className="text-[12px] font-medium">Full Name</label>
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            placeholder="John Doe"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[12px] font-medium">Email Address</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="john@example.com"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[12px] font-medium">Password</label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={6}
            />
            <button
              type="button"
              className="absolute right-3 top-2.5 text-gray-500 text-[12px]"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[12px] font-medium">Role</label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
        </div>
      </div>
      <Button type="submit" disabled={isSubmitting} className="w-full mt-4">
        {isSubmitting ? "Creating..." : "Create User"}
      </Button>
    </form>
  );
});
AddUserForm.displayName = "AddUserForm";

const RemoveAccessForm = memo(({ profiles, fetchProfiles, setMessage }: {
  profiles: Profile[],
  fetchProfiles: () => void,
  setMessage: (m: string) => void
}) => {
  const [open, setOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDeactivate = async () => {
    if (!selectedUser) return;
    setIsProcessing(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          is_active: "false",
          user_removed_at: new Date().toISOString()
        })
        .eq("auth_id", selectedUser.auth_id);

      if (error) throw error;

      setMessage(`✅ Access removed for ${selectedUser.full_name}`);
      setSelectedUser(null);
      fetchProfiles();
    } catch (err: any) {
      setMessage("❌ " + (err.message || "Failed to deactivate account"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReactivate = async () => {
    if (!selectedUser) return;
    setIsProcessing(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          is_active: "true",
          user_removed_at: null
        })
        .eq("auth_id", selectedUser.auth_id);

      if (error) throw error;

      setMessage(`✅ Access restored for ${selectedUser.full_name}`);
      setSelectedUser(null);
      fetchProfiles();
    } catch (err: any) {
      setMessage("❌ " + (err.message || "Failed to reactivate account"));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium mb-1 block">Search User</label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
            >
              {selectedUser
                ? `${selectedUser.full_name} (${selectedUser.user_email})`
                : "Select user by name or email..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
            <Command>
              <CommandInput placeholder="Search name or email..." />
              <CommandList>
                <CommandEmpty>No user found.</CommandEmpty>
                <CommandGroup>
                  {profiles.map((profile) => (
                    <CommandItem
                      key={profile.auth_id}
                      value={`${profile.full_name} ${profile.user_email}`}
                      onSelect={() => {
                        setSelectedUser(profile);
                        setOpen(false);
                      }}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center">
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedUser?.auth_id === profile.auth_id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span>{profile.full_name}</span>
                          <span className="text-xs text-gray-500">{profile.user_email} • {profile.roles}</span>
                        </div>
                      </div>
                      <span className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase",
                        profile.is_active === "true"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      )}>
                        {profile.is_active === "true" ? "Active" : "Deactivated"}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {selectedUser && (
        <div className="border rounded-lg overflow-hidden animate-in fade-in slide-in-from-top-2">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead>Full Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium text-[12px]">{selectedUser.full_name}</TableCell>
                <TableCell className="text-[12px]">{selectedUser.user_email}</TableCell>
                <TableCell className="text-[12px]">{selectedUser.roles}</TableCell>
                <TableCell>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase",
                    selectedUser.is_active === "true" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  )}>
                    {selectedUser.is_active === "true" ? "Active" : "Inactive"}
                  </span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <div className="p-4 bg-gray-50 border-t flex justify-end">
            {selectedUser.is_active === "true" ? (
              <Button
                variant="destructive"
                onClick={handleDeactivate}
                disabled={isProcessing}
                className="gap-2"
              >
                <UserMinus className="h-4 w-4" />
                {isProcessing ? "Removing Access..." : "Remove Access"}
              </Button>
            ) : (
              <Button
                onClick={handleReactivate}
                disabled={isProcessing}
                className="gap-2 bg-green-600 hover:bg-green-700 text-white"
              >
                <UserPlus className="h-4 w-4" />
                {isProcessing ? "Reactivating..." : "Reactivate Access"}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
RemoveAccessForm.displayName = "RemoveAccessForm";

const TeamOverview = memo(({ profiles, filterStatus, setFilterStatus, searchQuery, setSearchQuery, sortConfig, toggleSort, formatDate, calculateTenure, counts, availableRoles, fetchProfiles, setMessage }: any) => {
  return (
    <Card className="w-full xl:w-[65%] overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0 pb-4">
        <div>
          <CardTitle className="text-[18px]">Team Overview</CardTitle>
          <CardDescription className="text-[12px]">All registered users and their current status.</CardDescription>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search name, email, ID, role..."
              className="pl-9 h-9 text-[12px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-md shrink-0">
            <Button
              variant={filterStatus === "all" ? "default" : "ghost"}
              size="sm"
              className="text-[10px] h-7 px-3"
              onClick={() => setFilterStatus("all")}
            >
              All ({counts.all})
            </Button>
            <Button
              variant={filterStatus === "active" ? "default" : "ghost"}
              size="sm"
              className="text-[10px] h-7 px-3"
              onClick={() => setFilterStatus("active")}
            >
              Active ({counts.active})
            </Button>
            <Button
              variant={filterStatus === "deactivated" ? "default" : "ghost"}
              size="sm"
              className="text-[10px] h-7 px-3"
              onClick={() => setFilterStatus("deactivated")}
            >
              Deactivated ({counts.deactivated})
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto text-[11px]">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="px-1 text-[12px] text-center w-12 cursor-pointer hover:bg-gray-100" onClick={() => toggleSort('sno')}>
                  <div className="flex items-center justify-center gap-1">
                    S.No
                    {sortConfig?.key === 'sno' ? (sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 text-gray-400" />}
                  </div>
                </TableHead>
                <TableHead className="px-2 text-[12px] text-center cursor-pointer hover:bg-gray-100" onClick={() => toggleSort('user_id')}>
                  <div className="flex items-center justify-center gap-1">
                    User ID
                    {sortConfig?.key === 'user_id' ? (sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 text-gray-400" />}
                  </div>
                </TableHead>
                <TableHead className="px-2 text-[12px] text-center cursor-pointer hover:bg-gray-100" onClick={() => toggleSort('full_name')}>
                  <div className="flex items-center justify-center gap-1">
                    Full Name
                    {sortConfig?.key === 'full_name' ? (sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 text-gray-400" />}
                  </div>
                </TableHead>
                <TableHead className="px-2 text-[12px] text-center cursor-pointer hover:bg-gray-100" onClick={() => toggleSort('user_email')}>
                  <div className="flex items-center justify-center gap-1">
                    Email
                    {sortConfig?.key === 'user_email' ? (sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 text-gray-400" />}
                  </div>
                </TableHead>
                <TableHead className="px-2 text-[12px] text-center cursor-pointer hover:bg-gray-100" onClick={() => toggleSort('roles')}>
                  <div className="flex items-center justify-center gap-1">
                    Role & Swap
                    {sortConfig?.key === 'roles' ? (sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 text-gray-400" />}
                  </div>
                </TableHead>
                <TableHead className="px-2 text-[12px] text-center cursor-pointer hover:bg-gray-100" onClick={() => toggleSort('is_active')}>
                  <div className="flex items-center justify-center gap-1">
                    Status
                    {sortConfig?.key === 'is_active' ? (sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 text-gray-400" />}
                  </div>
                </TableHead>
                <TableHead className="px-2 text-[12px] text-center cursor-pointer hover:bg-gray-100 whitespace-nowrap" onClick={() => toggleSort('created_at')}>
                  <div className="flex items-center justify-center gap-1">
                    Registered At
                    {sortConfig?.key === 'created_at' ? (sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 text-gray-400" />}
                  </div>
                </TableHead>
                <TableHead className="px-2 text-[12px] text-center cursor-pointer hover:bg-gray-100 whitespace-nowrap" onClick={() => toggleSort('user_removed_at')}>
                  <div className="flex items-center justify-center gap-1">
                    Deactivated At
                    {sortConfig?.key === 'user_removed_at' ? (sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 text-gray-400" />}
                  </div>
                </TableHead>
                <TableHead className="px-2 text-[12px] text-center cursor-pointer hover:bg-gray-100" onClick={() => toggleSort('tenure')}>
                  <div className="flex items-center justify-center gap-1">
                    Tenure
                    {sortConfig?.key === 'tenure' ? (sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 text-gray-400" />}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.length > 0 ? (
                profiles.map((profile: Profile, index: number) => (
                  <TableRow key={profile.auth_id} className="h-10 hover:bg-gray-50/50">
                    <TableCell className="px-1 text-[12px] text-center font-medium">{index + 1}</TableCell>
                    <TableCell className="font-mono text-[11px] text-gray-500 px-2 text-center">{profile.user_id}</TableCell>
                    <TableCell className="font-medium whitespace-nowrap px-2 text-[12px] text-center">{profile.full_name}</TableCell>
                    <TableCell className="whitespace-nowrap px-2 text-[12px] text-center">{profile.user_email}</TableCell>
                    <TableCell className="px-2 text-center">
                      <SwapRoleDialog 
                        user={profile} 
                        availableRoles={availableRoles} 
                        onUpdated={fetchProfiles} 
                        setMessage={setMessage}
                      />
                    </TableCell>
                    <TableCell className="px-2 text-center text-[12px]">
                      <span className={cn(
                        "px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase",
                        profile.is_active === "true" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      )}>
                        {profile.is_active === "true" ? "Active" : "Deactivated"}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-2 text-[11px] text-center text-gray-600">{formatDate(profile.created_at)}</TableCell>
                    <TableCell className="whitespace-nowrap px-2 text-[11px] text-center text-gray-600">{formatDate(profile.user_removed_at)}</TableCell>
                    <TableCell className="whitespace-nowrap px-2 text-[11px] text-center font-semibold text-blue-700">{calculateTenure(profile)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-gray-500 text-sm">
                    {searchQuery ? "No matching team members found." : "No team members found."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
});
TeamOverview.displayName = "TeamOverview";

export default function AddUserPage() {
  const [mode, setMode] = useState<"add" | "deactivate">("add");
  const [message, setMessage] = useState("");
  const { setSignupEmail } = useEmail();
  
  const [dynamicRoles, setDynamicRoles] = useState<string[]>(Array.from(DEFAULT_ROLES));

  const handleAddRole = useCallback((newRole: string) => {
    setDynamicRoles(prev => {
      if (prev.includes(newRole)) return prev;
      return [...prev, newRole].sort();
    });
  }, []);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "deactivated">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: keyof Profile | 'tenure' | 'sno', direction: 'asc' | 'desc' } | null>({ key: 'full_name', direction: 'asc' });

  const fetchProfiles = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name", { ascending: true });

      if (error) throw error;
      setProfiles(data || []);
    } catch (err: any) {
      console.error("Error fetching profiles:", err);
      setMessage("❌ Failed to load users");
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // Discover existing roles in system and add them to dynamicRoles
  useEffect(() => {
    if (profiles.length > 0) {
      const existingRoles = Array.from(new Set(profiles.map(p => p.roles).filter(Boolean)));
      setDynamicRoles(prev => {
        const next = new Set([...prev, ...existingRoles]);
        return Array.from(next).sort();
      });
    }
  }, [profiles]);

  const toggleSort = useCallback((key: keyof Profile | 'tenure' | 'sno') => {
    setSortConfig(prev => {
      let direction: 'asc' | 'desc' = 'asc';
      if (prev && prev.key === key && prev.direction === 'asc') {
        direction = 'desc';
      }
      return { key, direction };
    });
  }, []);

  const calculateTenure = useCallback((profile: Profile) => {
    const start = new Date(profile.created_at);
    const end = profile.user_removed_at ? new Date(profile.user_removed_at) : new Date();

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 30) return `${diffDays} days`;
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return `${diffMonths} mo, ${diffDays % 30} d`;

    const diffYears = Math.floor(diffMonths / 12);
    return `${diffYears} yr, ${diffMonths % 12} mo`;
  }, []);

  const calculateTenureInMs = useCallback((profile: Profile) => {
    const start = new Date(profile.created_at);
    const end = profile.user_removed_at ? new Date(profile.user_removed_at) : new Date();
    return end.getTime() - start.getTime();
  }, []);

  const formatDate = useCallback((dateString: string | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  }, []);

  const filteredAndSortedProfiles = useMemo(() => {
    return profiles
      .filter((p) => {
        // First by status
        if (filterStatus === "active") if (p.is_active !== "true") return false;
        if (filterStatus === "deactivated") if (p.is_active !== "false") return false;

        // Then by search query
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          return (
            p.full_name?.toLowerCase().includes(q) ||
            p.user_email?.toLowerCase().includes(q) ||
            p.user_id?.toLowerCase().includes(q) ||
            p.roles?.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a: any, b: any) => {
        if (!sortConfig) return 0;
        const { key, direction } = sortConfig;
        let comparison = 0;

        if (key === 'tenure') {
          const tenureA = calculateTenureInMs(a);
          const tenureB = calculateTenureInMs(b);
          comparison = tenureA - tenureB;
        } else if (key === 'sno') {
          comparison = 0;
        } else {
          const valA = a[key]?.toString().toLowerCase() || "";
          const valB = b[key]?.toString().toLowerCase() || "";
          comparison = valA.localeCompare(valB);
        }

        return direction === "asc" ? comparison : -comparison;
      });
  }, [profiles, filterStatus, searchQuery, sortConfig, calculateTenureInMs]);

  const counts = useMemo(() => {
    return {
      all: profiles.length,
      active: profiles.filter(p => p.is_active === "true").length,
      deactivated: profiles.filter(p => p.is_active === "false").length,
    };
  }, [profiles]);

  return (
    <ProtectedRoute allowedRoles={["add-user", "Super Admin"]}>
      <DashboardLayout>
        <div className="space-y-6 px-1">
          <div className="flex gap-10 items-center pr-4">
            <h1 className="text-2xl font-bold">User Management</h1>
            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                <Button
                  variant={mode === "add" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => { setMode("add"); setMessage(""); }}
                  className="gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Add User
                </Button>
                <Button
                  variant={mode === "deactivate" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => { setMode("deactivate"); setMessage(""); }}
                  className="gap-2"
                >
                  <UserMinus className="h-4 w-4" />
                  Deactivate Account
                </Button>
              </div>
              <AddRoleDialog onAdd={handleAddRole} />
            </div>

          <div className="flex flex-col xl:flex-row gap-6 items-start">
            {/* Left Side: Actions (35%) */}
            <Card className="w-full xl:w-[35%] shrink-0 sticky top-4">
              <CardHeader>
                <CardTitle className="text-[18px]">{mode === "add" ? "Create New Account" : "Remove Account Access"}</CardTitle>
                <CardDescription className="text-[12px]">
                  {mode === "add"
                    ? "Enter details to invite a new team member."
                    : "Search and select a user to disable their access to the CRM."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {mode === "add" ? (
                  <AddUserForm
                    setMessage={setMessage}
                    fetchProfiles={fetchProfiles}
                    setSignupEmail={setSignupEmail}
                    availableRoles={dynamicRoles}
                  />
                ) : (
                  <RemoveAccessForm
                    profiles={profiles}
                    fetchProfiles={fetchProfiles}
                    setMessage={setMessage}
                  />
                )}

                {message && (
                  <Alert className={cn(
                    "mt-6",
                    message.startsWith("✅") ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
                  )}>
                    <AlertDescription className="flex flex-col gap-0.5">
                      <span className="font-medium text-[13px]">{message.split("||TECHNICAL:")[0]}</span>
                      {message.includes("||TECHNICAL:") && (
                        <span className="text-[9px] opacity-80 leading-tight">
                          {message.split("||TECHNICAL:")[1]}
                        </span>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Right Side: User List Grid (65%) */}
            <TeamOverview
              profiles={filteredAndSortedProfiles}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              sortConfig={sortConfig}
              toggleSort={toggleSort}
              formatDate={formatDate}
              calculateTenure={calculateTenure}
              counts={counts}
              availableRoles={dynamicRoles}
              fetchProfiles={fetchProfiles}
              setMessage={setMessage}
            />
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
