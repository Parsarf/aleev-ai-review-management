import { Analytics } from '@vercel/analytics/react'
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { MainLayout } from "@/components/layout/main-layout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Aleev - AI Review Management",
  description:
    "Manage your online reviews with AI-powered responses and analytics",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <MainLayout>{children}</MainLayout>
        <Analytics /> {/* 👈 Add this line right here */}
      </body>
    </html>
  )
}
