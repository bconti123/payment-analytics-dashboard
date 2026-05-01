import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"

import { Sidebar } from "@/components/sidebar"

import "./globals.css"
import { Providers } from "./providers"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Payment Analytics Dashboard",
  description:
    "Track transactions, refunds, revenue trends, and operational metrics.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <Providers>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 overflow-x-auto">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  )
}
