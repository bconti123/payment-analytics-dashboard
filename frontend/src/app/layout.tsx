import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"

import { MobileNav, Sidebar } from "@/components/app-nav"

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
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <Providers>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-foreground focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-background focus:shadow-md"
          >
            Skip to content
          </a>
          <div className="flex min-h-screen flex-col md:flex-row">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-x-auto">
              <MobileNav />
              <main id="main" className="flex-1">
                {children}
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  )
}
