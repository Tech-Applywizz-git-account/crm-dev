// //components/auth/login-form.tsx
// "use client"

// import type React from "react"
// import Link from "next/link";

// import { useState } from "react"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import { Alert, AlertDescription } from "@/components/ui/alert"
// import { useAuth } from "@/components/providers/auth-provider"
// import { Building2 } from "lucide-react"

// export function LoginForm() {
//   const [email, setEmail] = useState("")
//   const [password, setPassword] = useState("")
//   const [error, setError] = useState("")
//   const [showPassword, setShowPassword] = useState(false);
//   const [loading, setLoading] = useState(false)
//   const { login } = useAuth()

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault()
//     setLoading(true)
//     setError("")

//     const success = await login(email, password)
//     if (!success) {
//       setError("Invalid email or password")
//     }
//     setLoading(false)
//   }


//   return (
//     <div className="w-screen h-screen flex items-center justify-center bg-gray-100">

//       <Card className="w-full max-w-md">
//         <CardHeader className="text-center">
//           <div className="flex justify-center mb-4">
//             <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600">
//               <Building2 className="h-7 w-7 text-white" />
//             </div>
//           </div>
//           <CardTitle className="text-2xl font-bold">ApplyWizz CRM</CardTitle>
//           <CardDescription>Sign in to your account</CardDescription>
//         </CardHeader>
//         <CardContent>
//           <form onSubmit={handleSubmit} className="space-y-4">
//             <div className="space-y-2">
//               <Label htmlFor="email">Email</Label>
//               <Input
//                 id="email"
//                 type="email"
//                 placeholder="Enter your email"
//                 value={email}
//                 onChange={(e) => setEmail(e.target.value)}
//                 required
//               />
//             </div>
//             <div className="space-y-2">
//               <div className="relative w-full">
//                 <Input
//                   type={showPassword ? "text" : "password"}
//                   placeholder="Password"
//                   value={password}
//                   onChange={(e) => setPassword(e.target.value)}
//                   required
//                   className="w-full bg-white border border-gray-300 focus:border-black focus:ring-1 focus:ring-black focus:outline-none pr-12"
//                 />
//                 <button
//                   type="button"
//                   onClick={() => setShowPassword((prev) => !prev)}
//                   className="absolute inset-y-0 right-3 flex items-center text-gray-500"
//                   tabIndex={-1}
//                 >
//                   {showPassword ? (
//                     <svg
//                       xmlns="http://www.w3.org/2000/svg"
//                       className="h-5 w-5"
//                       viewBox="0 0 20 20"
//                       fill="currentColor"
//                     >
//                       <path d="M10 3C5 3 1.73 7.11 1 10c.73 2.89 4 7 9 7s8.27-4.11 9-7c-.73-2.89-4-7-9-7zm0 12c-2.5 0-4.71-1.28-6-3 1.29-1.72 3.5-3 6-3s4.71 1.28 6 3c-1.29 1.72-3.5 3-6 3z" />
//                       <path d="M10 7a3 3 0 100 6 3 3 0 000-6z" />
//                     </svg>
//                   ) : (
//                     <svg
//                       xmlns="http://www.w3.org/2000/svg"
//                       className="h-5 w-5"
//                       viewBox="0 0 20 20"
//                       fill="currentColor"
//                     >
//                       <path d="M4.293 4.293a1 1 0 011.414 0L15.707 14.293a1 1 0 01-1.414 1.414L13.1 14.514A8.45 8.45 0 0110 15c-5 0-8.27-4.11-9-7a8.456 8.456 0 014.048-5.394L4.293 4.293zM14.829 12.414L12.1 9.686A3 3 0 0010 7a3 3 0 00-1.143.232L5.707 4.08a8.464 8.464 0 014.293-1.08c5 0 8.27 4.11 9 7-.337 1.337-1.032 2.674-2.17 3.962l-1.707-1.548z" />
//                     </svg>
//                   )}
//                 </button>
//               </div>

//               {/* <p className="text-xs text-gray-500 mt-1">
//             Password must contain:
//             <ul className="list-disc list-inside space-y-0.5">
//               <li>At least 6 characters</li>
//               <li>One uppercase letter (A-Z)</li>
//               <li>One lowercase letter (a-z)</li>
//               <li>One number (0-9)</li>
//               <li>One special character (!@#$%^&*)</li>
//               <li>example: Ram@123</li>
//             </ul>
//           </p> */}

//           <div className="text-xs text-gray-500 mt-1">
//   Password must contain:
//   <ul className="list-disc list-inside space-y-0.5">
//     <li>At least 6 characters</li>
//     <li>One uppercase letter (A-Z)</li>
//     <li>One lowercase letter (a-z)</li>
//     <li>One number (0-9)</li>
//     <li>One special character (!@#$%^&*)</li>
//     <li>example: Ram@123</li>
//   </ul>
// </div>


//             </div>
//             {error && (
//               <Alert variant="destructive">
//                 <AlertDescription>{error}</AlertDescription>
//               </Alert>
//             )}
//             <Button type="submit" className="w-full" disabled={loading}>
//   {loading ? "Signing in..." : "Sign In"}
// </Button>

//  {/* --- Forgot-password link --- */}
//  <p className="mt-2 text-center text-sm">
//    <Link
//      href="/forgot-password"
//      className="text-blue-600 hover:underline focus:outline-none"
//    >
//      Forgot password ?
//    </Link>
//  </p>

//           </form>

//         </CardContent>
//       </Card>
//     </div>
//   )
// }



















//components/auth/login-form.tsx
"use client"

import type React from "react"
import Link from "next/link";

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/components/providers/auth-provider"
import { Building2 } from "lucide-react"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const result = await login(email, password)
    if (!result.success) {
      setError(result.error || "Invalid email or password")
    }
    setLoading(false)
  }


  return (
    <div className="w-screen h-screen flex items-center justify-center bg-gray-100">

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600">
              <Building2 className="h-7 w-7 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">ApplyWizz CRM</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                suppressHydrationWarning
              />
            </div>
            <div className="space-y-2">
              <div className="relative w-full">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  suppressHydrationWarning
                  className="w-full bg-white border border-gray-300 focus:border-black focus:ring-1 focus:ring-black focus:outline-none pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-500"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M10 3C5 3 1.73 7.11 1 10c.73 2.89 4 7 9 7s8.27-4.11 9-7c-.73-2.89-4-7-9-7zm0 12c-2.5 0-4.71-1.28-6-3 1.29-1.72 3.5-3 6-3s4.71 1.28 6 3c-1.29 1.72-3.5 3-6 3z" />
                      <path d="M10 7a3 3 0 100 6 3 3 0 000-6z" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M4.293 4.293a1 1 0 011.414 0L15.707 14.293a1 1 0 01-1.414 1.414L13.1 14.514A8.45 8.45 0 0110 15c-5 0-8.27-4.11-9-7a8.456 8.456 0 014.048-5.394L4.293 4.293zM14.829 12.414L12.1 9.686A3 3 0 0010 7a3 3 0 00-1.143.232L5.707 4.08a8.464 8.464 0 014.293-1.08c5 0 8.27 4.11 9 7-.337 1.337-1.032 2.674-2.17 3.962l-1.707-1.548z" />
                    </svg>
                  )}
                </button>
              </div>

              {/* <p className="text-xs text-gray-500 mt-1">
            Password must contain:
            <ul className="list-disc list-inside space-y-0.5">
              <li>At least 6 characters</li>
              <li>One uppercase letter (A-Z)</li>
              <li>One lowercase letter (a-z)</li>
              <li>One number (0-9)</li>
              <li>One special character (!@#$%^&*)</li>
              <li>example: Ram@123</li>
            </ul>
          </p> */}

              <div className="text-xs text-gray-500 mt-1">
                Password must contain:
                <ul className="list-disc list-inside space-y-0.5">
                  <li>At least 6 characters</li>
                  <li>One uppercase letter (A-Z)</li>
                  <li>One lowercase letter (a-z)</li>
                  <li>One number (0-9)</li>
                  <li>One special character (!@#$%^&*)</li>
                  <li>example: Ram@123</li>
                </ul>
              </div>


            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>

            {/* --- Forgot-password link --- */}
            <p className="mt-2 text-center text-sm">
              <Link
                href="/forgot-password"
                className="text-blue-600 hover:underline focus:outline-none"
                suppressHydrationWarning
              >
                Forgot password ?
              </Link>
            </p>

          </form>

        </CardContent>
      </Card>
    </div>
  )
}
