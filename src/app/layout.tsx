import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { cn } from "@/lib/utils";

import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: {
    default: "Event Platform",
    template: "%s | Event Platform",
  },
  description: "اكتشف واحجز أفضل الفعاليات في الكويت",
};

// ملاحظة: اللغة والاتجاه والثيم ستُدار ديناميكيًا في Phase 2 (next-intl + next-themes).
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className={cn("font-sans", geist.variable)}>
      <body className="min-h-dvh bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
