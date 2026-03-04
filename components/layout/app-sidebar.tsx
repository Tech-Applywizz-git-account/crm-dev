// // components/layout/app-sidebar.tsx
// "use client"

// import {
//   Sidebar,
//   SidebarContent,
//   SidebarFooter,
//   SidebarGroup,
//   SidebarGroupContent,
//   SidebarGroupLabel,
//   SidebarHeader,
//   SidebarMenu,
//   SidebarMenuButton,
//   SidebarMenuItem,
// } from "@/components/ui/sidebar"
// import {
//   Users,
//   TrendingUp,
//   UserCheck,
//   DollarSign,
//   Building2,
//   Wrench,
//   FileText,
// } from "lucide-react"
// import Link from "next/link"
// import { usePathname } from "next/navigation"
// import { useAuth } from "@/components/providers/auth-provider"
// import { cn } from "@/lib/utils"

// const navigationItems = [
//   {
//     title: "Marketing CRM",
//     url: "/marketing",
//     icon: Users,
//     module: "marketing",
//     description: "Leads Management",
//   },
//   {
//     title: "Marketing Associates",
//     url: "/marketingAssociates",
//     icon: Users,
//     module: "marketingAssociates",
//     description: "Leads Management",

//   },
//   {
//     title: "Sales CRM",
//     url: "/sales",
//     icon: TrendingUp,
//     module: "sales",
//     description: "Sales Pipeline",
//   },
//   {
//     title: "Account Management",
//     url: "/account-management",
//     icon: UserCheck,
//     module: "account-management",
//     description: "Client Relations",
//   },
//   {
//     title: "Finance CRM",
//     url: "/finance",
//     icon: DollarSign,
//     module: "finance",
//     description: "Revenue Management",
//   },
//  // Onboard Client
// {
//   title: "Sale Done Form",
//   url: "/SalesForm",
//   icon: FileText,
//   module: "onboard",            // ← was "sales"
//   description: "Add a new client",
// },



//   // 🔧 Technical
//   {
//     title: "Technical Head",
//     url: "/technicalTeam",
//     icon: Wrench,
//     module: "technical",
//     description: "Tech Oversight",
//   },
//   {
//     title: "Technical Associate",
//     url: "/technicalTeam",
//     icon: Wrench,
//     module: "technical-associate",
//     description: "Tech Operations",
//   },

//   // 📄 Resume
//   {
//     title: "Resume Head",
//     url: "/resumeTeam",
//     icon: FileText,
//     module: "resume",
//     description: "Resume Team Lead",
//   },
//   {
//     title: "Resume Assocaite",
//     url: "/resumeTeam",
//     icon: FileText,
//     module: "resume-associate",
//     description: "Resume Operations",
//   },

//   // Admin utilities
//   {
//     title: "Add User",
//     url: "/add-user",
//     icon: Building2,
//     module: "admin",
//     description: "User Management",
//   },
//   {
//     title: "Finance Associates",
//     url: "/finance-associates",
//     icon: DollarSign,
//     module: "finance-associates",
//     description: "Associate Management",
//   },
// ]

// export function AppSidebar() {
//   const pathname = usePathname()
//   const { hasAccess, user } = useAuth()
//   const accessibleItems = navigationItems.filter((item) => hasAccess(item.module))

//   return (
//     <Sidebar className="border-r border-gray-200">
//       <SidebarHeader className="border-b border-gray-200 p-6">
//         <div className="flex flex-col items-center gap-1">
//           <Link href="/" className="cursor-pointer">
//             <img
//               src="https://storage.googleapis.com/solwizz/website_content/Black%20Version.png"
//               alt="Applywizz logo"
//               className="w-[100%] max-w-[120px] h-auto"
//             />
//           </Link>
//           <p className="text-sm text-gray-500">CRM System</p>
//         </div>
//       </SidebarHeader>

//       <SidebarContent className="p-4">
//         <SidebarGroup>
//           <SidebarGroupLabel className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
//             CRM Modules
//           </SidebarGroupLabel>
//           <SidebarGroupContent>
//             <SidebarMenu className="space-y-1">
//               {accessibleItems.map((item) => (
//                 <SidebarMenuItem key={item.title}>
//                   <SidebarMenuButton
//                     asChild
//                     isActive={pathname.startsWith(item.url)}
//                     className={cn(
//                       "w-full justify-start gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors",
//                       pathname.startsWith(item.url)
//                         ? "bg-blue-50 text-blue-700 border border-blue-200"
//                         : "text-gray-700 hover:bg-gray-100",
//                     )}
//                   >
//                     <Link href={item.url} className="flex items-center gap-3 w-full">
//                       <item.icon className="h-5 w-5" />
//                       <div className="flex flex-col items-start">
//                         <span>{item.title}</span>
//                         <span className="text-xs text-gray-500">{item.description}</span>
//                       </div>
//                     </Link>
//                   </SidebarMenuButton>
//                 </SidebarMenuItem>
//               ))}
//             </SidebarMenu>
//           </SidebarGroupContent>
//         </SidebarGroup>
//       </SidebarContent>

//       <SidebarFooter className="border-t border-gray-200 p-4">
//         <div className="flex items-center gap-3 px-3 py-2">
//           <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
//             <span className="text-sm font-medium text-gray-600">
//               {user?.name
//                 .split(" ")
//                 .map((n) => n[0])
//                 .join("")}
//             </span>
//           </div>
//           <div className="flex-1 min-w-0">
//             <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
//             <p className="text-xs text-gray-500 truncate">{user?.role}</p>
//           </div>
//         </div>
//       </SidebarFooter>
//     </Sidebar>
//   )
// }













// components/layout/app-sidebar.tsx
"use client"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  Users,
  TrendingUp,
  UserCheck,
  DollarSign,
  Building2,
  Wrench,
  FileText,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"
import { cn } from "@/lib/utils"

const navigationItems = [
  {
    title: "Marketing CRM",
    url: "/marketing",
    icon: Users,
    module: "marketing",
    description: "Leads Management",
  },
  {
    title: "Marketing Associates",
    url: "/marketingAssociates",
    icon: Users,
    module: "marketingAssociates",
    description: "Leads Management",

  },
  {
    title: "Sales CRM",
    url: "/sales",
    icon: TrendingUp,
    module: "sales",
    description: "Sales Pipeline",
  },
  {
    title: "Account Management",
    url: "/account-management",
    icon: UserCheck,
    module: "account-management",
    description: "Client Relations",
  },
  {
    title: "Finance CRM",
    url: "/finance",
    icon: DollarSign,
    module: "finance",
    description: "Revenue Management",
  },
  // Onboard Client
  {
    title: "Sale Done Form",
    url: "/SalesForm",
    icon: FileText,
    module: "onboard",            // ← was "sales"
    description: "Add a new client",
  },



  // 🔧 Technical
  {
    title: "Technical Head",
    url: "/technicalTeam",
    icon: Wrench,
    module: "technical",
    description: "Tech Oversight",
  },
  {
    title: "Technical Associate",
    url: "/technicalTeam",
    icon: Wrench,
    module: "technical-associate",
    description: "Tech Operations",
  },

  // 📄 Resume
  {
    title: "Resume Head",
    url: "/resumeTeam",
    icon: FileText,
    module: "resume",
    description: "Resume Team Lead",
  },
  {
    title: "Resume Assocaite",
    url: "/resumeTeam",
    icon: FileText,
    module: "resume-associate",
    description: "Resume Operations",
  },

  // Admin utilities
  {
    title: "User Management",
    url: "/add-user",
    icon: Building2,
    module: "admin",
    description: "Activate/Deactivate Users",
  },
  {
    title: "Finance Associates",
    url: "/finance-associates",
    icon: DollarSign,
    module: "finance-associates",
    description: "Associate Management",
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { hasAccess, user } = useAuth()
  const accessibleItems = navigationItems.filter((item) => hasAccess(item.module))

  return (
    <Sidebar className="border-r border-gray-200">
      <SidebarHeader className="border-b border-gray-200 p-6">
        <div className="flex flex-col items-center gap-1">
          <Link href="/" className="cursor-pointer">
            <img
              src="https://storage.googleapis.com/solwizz/website_content/Black%20Version.png"
              alt="Applywizz logo"
              className="w-[100%] max-w-[120px] h-auto"
            />
          </Link>
          <p className="text-sm text-gray-500">CRM System</p>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            CRM Modules
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {accessibleItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(item.url)}
                    className={cn(
                      "w-full justify-start gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors",
                      pathname.startsWith(item.url)
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "text-gray-700 hover:bg-gray-100",
                    )}
                  >
                    <Link href={item.url} className="flex items-center gap-3 w-full">
                      <item.icon className="h-5 w-5" />
                      <div className="flex flex-col items-start">
                        <span>{item.title}</span>
                        <span className="text-xs text-gray-500">{item.description}</span>
                      </div>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-gray-200 p-4">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-sm font-medium text-gray-600">
              {user?.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.role}</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
