// //components/providers/auth-provider.tsx

// "use client";

// import { createContext, useContext, useState, useEffect } from "react";
// import { useRouter } from "next/navigation";
// import { supabase } from "@/utils/supabase/client";

// export type UserRole =
//   | "Super Admin"
//   | "Marketing"
//   | "Sales"
//   | "Account Management"
//   | "Finance"
//   | "Marketing Associate"
//   | "Sales Associate"
//   | "Finance Associate"
//   | "Accounts Associate"
//   | "Technical Head"
//   | "Technical Associate"
//   | "Resume Head"
//   | "Resume Associate";


// interface User {
//   id: string;
//   name: string;
//   email: string;
//   role: UserRole;
//   avatar?: string;
// }

// interface AuthContextType {
//   user: User | null;
//   login: (email: string, password: string) => Promise<boolean>;
//   logout: () => void;
//   hasAccess: (module: string) => boolean;
// }

// const AuthContext = createContext<AuthContextType | undefined>(undefined);

// export function AuthProvider({ children }: { children: React.ReactNode }) {
//   const [user, setUser] = useState<User | null>(null);
//   const router = useRouter();

//   useEffect(() => {
//     const restoreSession = async () => {
//       const { data: { user } } = await supabase.auth.getUser();

//       if (!user) {
//         setUser(null);
//         return;
//       }

//       const { data: profile, error: profileError } = await supabase
//         .from("profiles")
//         .select("*")
//         .eq("auth_id", user.id)
//         .single();

//       if (!profile || profileError) {
//         setUser(null);
//         return;
//       }

//       const userData: User = {
//         id: profile.user_id,
//         name: user.user_metadata?.full_name || "User",
//         email: user.email!,
//         role: convertRole(profile.roles),
//       };

//       setUser(userData);
//     };

//     restoreSession();
//   }, []);

//   const login = async (email: string, password: string): Promise<boolean> => {
//     const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
//       email,
//       password,
//     });

//     if (authError || !authData.user) {
//       return false;
//     }

//     const authId = authData.user.id;

//     const { data: profile, error: profileError } = await supabase
//       .from("profiles")
//       .select("*")
//       .eq("auth_id", authId)
//       .single();

//     if (profileError || !profile) {
//       return false;
//     }

//     const userData: User = {
//       id: profile.user_id,
//       name: authData.user.user_metadata?.full_name || "User",
//       email: authData.user.email!,
//       role: convertRole(profile.roles),
//     };

//     setUser(userData);

//     switch (userData.role) {
//       case "Super Admin":
//         router.push("/");
//         break;
//       case "Marketing":

//         router.push("/marketing");
//         break;
//         case "Marketing Associate":
//           router.push("/marketingAssociates");
//           break;
//       case "Sales":
//          router.push("/sales");
//         break;
//       case "Sales Associate":
//         router.push("/sales");
//         break;
//       case "Account Management":
//          router.push("/account-management");
//         break;
//       case "Accounts Associate":
//         router.push("/account-management");
//         break;
//       case "Finance":
//         router.push("/finance");
//         break;
//       case "Finance Associate":
//         router.push("/finance-associates");
//         break;
//       case "Technical Head":
//         router.push("/technicalTeam");
//         break;
//       case "Technical Associate":
//         router.push("/technicalTeam");
//         break;
//       case "Resume Head":
//         router.push("/resumeTeam");
//   break;
// case "Resume Associate":
//   router.push("/resumeTeam");
//   break;

//       default:
//         router.push("/unauthorized");
//         break;
//     }

//     return true;
//   };

//   const logout = async () => {
//     await supabase.auth.signOut();
//     setUser(null);
//     router.push("/");
//   };

//   const hasAccess = (module: string): boolean => {
//     if (!user) return false;
//     if (user.role === "Super Admin") return true;

//  // hasAccess
// const accessMap: Record<UserRole, string[]> = {
//   "Super Admin": [
//     "admin","marketing","sales","account-management","finance","finance-associates","marketingAssociate",
//     "technical","technical-associate","resume","resume-associate","onboard"
//   ],
//   Marketing: ["marketing","marketingAssociate","onboard"],
//   Sales: ["sales","Sales Associate","onboard"],
//   "Account Management": ["account-management","onboard"],
//   Finance: ["finance","onboard"],                     // keep as-is unless you want Onboard here too
//   "Marketing Associate": ["marketingAssociates"],
//   "Sales Associate": ["sales","Sales Associate","onboard","account-management"],
//   "Finance Associate": ["finance-associates"],
//   "Accounts Associate": ["account-management",],
//   "Technical Head": ["technical","onboard"],
//   "Technical Associate": ["technical-associate"],
//   "Resume Head": ["resume","onboard"],
//   "Resume Associate": ["resume-associate"],
// };


//     return accessMap[user.role]?.includes(module) || false;
//   };

//   return (
//     <AuthContext.Provider value={{ user, login, logout, hasAccess }}>
//       {children}
//     </AuthContext.Provider>
//   );
// }

// export function useAuth() {
//   const context = useContext(AuthContext);
//   if (!context) {
//     throw new Error("useAuth must be used inside AuthProvider");
//   }
//   return context;
// }
// function convertRole(role: string): UserRole {
//   const map: Record<string, UserRole> = {
//     Admin: "Super Admin",
//     Marketing: "Marketing",
//     Sales: "Sales",
//     Finance: "Finance",
//     Accounts: "Account Management",
//     "Marketing Associate": "Marketing Associate",
//     "Sales Associate": "Sales Associate",
//     "Finance Associate": "Finance Associate",
//     "Accounts Associate": "Accounts Associate",
//     "Finance Team": "Finance",
//     "Sales Team": "Sales",
//     "Marketing Team": "Marketing",
//     "Account Management Team": "Account Management",

//     "Technical Head": "Technical Head",
//     "Technical Associate": "Technical Associate",
//     "Resume Head": "Resume Head",
//     "Resume Associate": "Resume Associate",
//   };

//   return map[role] ?? "Super Admin";
// }


















// //components/providers/auth-provider.tsx
// "use client";

// import { createContext, useContext, useState, useEffect } from "react";
// import { useRouter } from "next/navigation";
// import { supabase } from "@/utils/supabase/client";

// export type UserRole =
//   | "Super Admin"
//   | "Marketing"
//   | "Sales"
//   | "Account Management"
//   | "Finance"
//   | "Marketing Associate"
//   | "Sales Associate"
//   | "Finance Associate"
//   | "Accounts Associate";


// interface User {
//   id: string;
//   name: string;
//   email: string;
//   role: UserRole;
//   avatar?: string;
// }

// interface AuthContextType {
//   user: User | null;
//   login: (email: string, password: string) => Promise<boolean>;
//   logout: () => void;
//   hasAccess: (module: string) => boolean;
// }

// const AuthContext = createContext<AuthContextType | undefined>(undefined);

// export function AuthProvider({ children }: { children: React.ReactNode }) {
//   const [user, setUser] = useState<User | null>(null);
//   const router = useRouter();

//   useEffect(() => {
//   const restoreSession = async () => {
//     const { data: { user } } = await supabase.auth.getUser();

//     if (!user) {
//       setUser(null);
//       return;
//     }

//     const { data: profile, error: profileError } = await supabase
//       .from("profiles")
//       .select("*")
//       .eq("auth_id", user.id)
//       .single();

//     if (!profile || profileError) {
//       setUser(null);
//       return;
//     }

//     const userData: User = {
//       id: profile.user_id,
//       name: user.user_metadata?.full_name || "User",
//       email: user.email!,
//       role: convertRole(profile.roles),
//     };

//     setUser(userData);
//   };

//   restoreSession();
// }, []);


//   const login = async (email: string, password: string): Promise<boolean> => {
//     const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
//       email,
//       password,
//     });

//     if (authError || !authData.user) {
//       return false;
//     }

//     const authId = authData.user.id;

//     const { data: profile, error: profileError } = await supabase
//       .from("profiles")
//       .select("*")
//       .eq("auth_id", authId)
//       .single();

//     if (profileError || !profile) {
//       return false;
//     }

//     const userData: User = {
//       id: profile.user_id,
//       name: authData.user.user_metadata?.full_name || "User",
//       email: authData.user.email!,
//       role: convertRole(profile.roles),
//     };

//     setUser(userData);



//     switch (userData.role) {
//   case "Super Admin":
//     router.push("/");
//     break;
//   case "Marketing":
//   case "Marketing Associate":
//     router.push("/marketing");
//     break;
//   case "Sales":
//   case "Sales Associate":
//     router.push("/sales");
//     break;
//   case "Account Management":
//   case "Accounts Associate":
//     router.push("/account-management");
//     break;
//   case "Finance":
//     router.push("/finance");
//     break;
//   case "Finance Associate":
//     router.push("/finance-associates");
//     break;
//   default:
//     router.push("/unauthorized");
//     break;
// }


//     return true;
//   };

//   const logout = async () => {
//     await supabase.auth.signOut();
//     setUser(null);
//     router.push("/");
//   };



//   const hasAccess = (module: string): boolean => {
//   if (!user) return false;
//   if (user.role === "Super Admin") return true;

//   const accessMap: Record<UserRole, string[]> = {
//     "Super Admin": ["admin", "marketing", "sales", "account-management", "finance", "finance-associates"],
//     Marketing: ["marketing"],
//     Sales: ["sales"],
//     "Account Management": ["account-management"],
//     Finance: ["finance"],
//     "Marketing Associate": ["marketing"],
//     "Sales Associate": ["sales"],
//     "Finance Associate": ["finance-associates"],
//     "Accounts Associate": ["account-management"],
//   };

//   return accessMap[user.role]?.includes(module) || false;
// };


//   return (
//     <AuthContext.Provider value={{ user, login, logout, hasAccess }}>
//       {children}
//     </AuthContext.Provider>
//   );
// }

// export function useAuth() {
//   const context = useContext(AuthContext);
//   if (!context) {
//     throw new Error("useAuth must be used inside AuthProvider");
//   }
//   return context;
// }



// function convertRole(role: string): UserRole {
//   const map: Record<string, UserRole> = {
//     Admin: "Super Admin",
//     Marketing: "Marketing",
//     Sales: "Sales",
//     Finance: "Finance",
//     Accounts: "Account Management", 
//     "Marketing Associate": "Marketing Associate",
//     "Sales Associate": "Sales Associate",
//     "Finance Associate": "Finance Associate",
//     "Accounts Associate": "Accounts Associate",
//     "Finance Team": "Finance",
//     "Sales Team": "Sales",
//     "Marketing Team": "Marketing",
//     "Account Management Team": "Account Management",
//   };

//   return map[role] || "Super Admin";
// }




//components/providers/auth-provider.tsx

"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";
import { getRoles } from "@/utils/roles";

export type UserRole =
  | "Super Admin"
  | "Marketing"
  | "Sales"
  | "Account Management"
  | "Finance"
  | "Marketing Associate"
  | "Sales Associate"
  | "Finance Associate"
  | "Accounts Associate"
  | "Technical Head"
  | "Technical Associate"
  | "Resume Head"
  | "Resume Associate"
  | "Sales Head"
  | "Resume Head-Sales Associate"
  | "Resume Associate-Sales Associate";


interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roles: UserRole[];
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  hasAccess: (module: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const restoreSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setUser(null);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("auth_id", user.id)
        .single();

      if (!profile || profileError) {
        setUser(null);
        return;
      }

      if (profile.is_active === 'false') {
        await supabase.auth.signOut();
        setUser(null);
        return;
      }

      const userData: User = {
        id: profile.user_id,
        name: profile.full_name || user.user_metadata?.full_name || "User",
        email: user.email!,
        role: convertRole(profile.roles),
        roles: convertRoles(profile.roles),
      };

      setUser(userData);
    };

    restoreSession();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      return { success: false, error: "Invalid email or password" };
    }

    const authId = authData.user.id;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("auth_id", authId)
      .single();

    if (profileError || !profile) {
      return { success: false, error: "Profile not found" };
    }

    if (profile.is_active === 'false') {
      await supabase.auth.signOut();
      return { success: false, error: "Account is deactivated. Please contact support." };
    }

    const userData: User = {
      id: profile.user_id,
      name: profile.full_name || authData.user.user_metadata?.full_name || "User",
      email: authData.user.email!,
      role: convertRole(profile.roles),
      roles: convertRoles(profile.roles),
    };

    setUser(userData);

    // Route based on first role
    const primaryRole = userData.roles[0];

    switch (primaryRole) {
      case "Super Admin":
        router.push("/");
        break;
      case "Marketing":

        router.push("/marketing");
        break;
      case "Marketing Associate":
        router.push("/marketingAssociates");
        break;
      case "Sales":
      case "Sales Head":
      case "Sales Associate":
        router.push("/sales");
        break;
      case "Account Management":
        router.push("/account-management");
        break;
      case "Accounts Associate":
        router.push("/account-management");
        break;
      case "Finance":
        router.push("/finance");
        break;
      case "Finance Associate":
        router.push("/finance-associates");
        break;
      case "Technical Head":
        router.push("/technicalTeam");
        break;
      case "Technical Associate":
        router.push("/technicalTeam");
        break;
      case "Resume Head":
        router.push("/resumeTeam");
        break;
      case "Resume Associate":
        router.push("/resumeTeam");
        break;

      default:
        router.push("/unauthorized");
        break;
    }

    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push("/");
  };

  const hasAccess = (module: string): boolean => {
    if (!user) return false;
    // Super Admin has access to everything
    if (user.roles.includes("Super Admin")) return true;

    // hasAccess
    const accessMap: Record<UserRole, string[]> = {
      "Super Admin": [
        "admin", "marketing", "sales", "account-management", "finance", "finance-associates", "marketingAssociate",
        "technical", "technical-associate", "resume", "resume-associate", "onboard"
      ],
      Marketing: ["marketing", "marketingAssociate", "onboard", "sales"],
      "Sales Head": ["sales", "onboard"],
      Sales: ["sales", "Sales Associate", "onboard"],
      "Account Management": ["account-management", "onboard"],
      Finance: ["finance", "onboard"],                     // keep as-is unless you want Onboard here too
      "Marketing Associate": ["marketingAssociates"],
      "Sales Associate": ["sales", "Sales Associate", "onboard"],
      "Finance Associate": ["finance-associates"],
      "Accounts Associate": ["account-management",],
      "Technical Head": ["technical", "onboard"],
      "Technical Associate": ["technical-associate"],
      "Resume Head": ["resume", "onboard"],
      "Resume Associate": ["resume-associate"],
      "Resume Head-Sales Associate": [
        "admin", "marketing", "sales", "finance", "finance-associates", "marketingAssociate",
        "technical", "technical-associate", "resume", "resume-associate", "onboard"
      ],
      "Resume Associate-Sales Associate": [
        "admin", "marketing", "sales", "finance", "finance-associates", "marketingAssociate",
        "technical", "technical-associate", "resume", "resume-associate", "onboard"
      ],
    };

    // Check if ANY of the user's roles has access to the module
    return user.roles.some(role => accessMap[role]?.includes(module) || false);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, hasAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
function convertRole(role: string): UserRole {
  const map: Record<string, UserRole> = {
    Admin: "Super Admin",
    Marketing: "Marketing",
    Sales: "Sales",
    Finance: "Finance",
    Accounts: "Account Management",
    "Marketing Associate": "Marketing Associate",
    "Sales Associate": "Sales Associate",
    "Finance Associate": "Finance Associate",
    "Accounts Associate": "Accounts Associate",
    "Finance Team": "Finance",
    "Sales Team": "Sales",
    "Marketing Team": "Marketing",
    "Account Management Team": "Account Management",

    "Technical Head": "Technical Head",
    "Technical Associate": "Technical Associate",
    "Resume Head": "Resume Head",
    "Resume Associate": "Resume Associate",
    "Sales Head": "Sales Head",
    "Head-Sales Associate": "Resume Head-Sales Associate",
    "Associate": "Resume Associate-Sales Associate",
    "Resume Head-Sales Associate": "Resume Head-Sales Associate",
    "Resume Associate-Sales Associate": "Resume Associate-Sales Associate",
    "Head-Sales Associate Resume Associate-Sales Associate": "Resume Associate-Sales Associate",
    "Head-Sales Associate-Resume Associate-Sales Associate": "Resume Associate-Sales Associate",
  };

  return map[role] ?? "Super Admin";
}

/**
 * Convert a role string (e.g., "Resume Head-Sales Associate") to an array of UserRole
 */
function convertRoles(roleString: string): UserRole[] {
  const rolesArray = getRoles(roleString);
  const map: Record<string, UserRole> = {
    Admin: "Super Admin",
    Marketing: "Marketing",
    Sales: "Sales",
    Finance: "Finance",
    Accounts: "Account Management",
    "Marketing Associate": "Marketing Associate",
    "Sales Associate": "Sales Associate",
    "Finance Associate": "Finance Associate",
    "Accounts Associate": "Accounts Associate",
    "Finance Team": "Finance",
    "Sales Team": "Sales",
    "Marketing Team": "Marketing",
    "Account Management Team": "Account Management",
    "Technical Head": "Technical Head",
    "Technical Associate": "Technical Associate",
    "Resume Head": "Resume Head",
    "Resume Associate": "Resume Associate",
    "Sales Head": "Sales Head",
    "Head-Sales Associate": "Resume Head-Sales Associate",
    "Associate": "Resume Associate-Sales Associate",
    "Resume Head-Sales Associate": "Resume Head-Sales Associate",
    "Resume Associate-Sales Associate": "Resume Associate-Sales Associate",
    "Head-Sales Associate Resume Associate-Sales Associate": "Resume Associate-Sales Associate",
    "Head-Sales Associate-Resume Associate-Sales Associate": "Resume Associate-Sales Associate",
  };

  const userRoles = rolesArray.map(r => map[r]).filter(Boolean) as UserRole[];
  return userRoles.length > 0 ? userRoles : ["Super Admin"];
}

