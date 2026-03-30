
import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/components/providers/auth-provider"
import { SidebarProvider } from "@/components/ui/sidebar" // ✅ added
import { LoadingProvider } from "@/components/providers/LoadingContext"
import SignupRedirectGuard from "@/components/providers/SignUpRedirectGuard"
import { EmailProvider } from './context/EmailProvider';

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "ApplyWizz CRM",
  description: "Enterprise CRM Solution",
  generator: 'v0.dev',
  icons: {
    icon: "/Applywizz_logo_new.jpg",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <SignupRedirectGuard /> {/* 🛑 Stops auto-login after email verification */}

        <LoadingProvider>
          <AuthProvider>
            <SidebarProvider> {/* ✅ Wrap your entire app with sidebar context */}
              <EmailProvider>
                {children}
                <Toaster />
                <SonnerToaster position="top-center" richColors />
              </EmailProvider>
            </SidebarProvider>
          </AuthProvider>
        </LoadingProvider>
      </body>
    </html>
  )
}

