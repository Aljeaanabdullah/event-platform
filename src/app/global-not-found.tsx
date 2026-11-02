import type { Metadata } from "next";
import Link from "next/link";

import { inter, plexArabic } from "@/lib/fonts";

import "./globals.css";

export const metadata: Metadata = {
  title: "404 — Event Platform",
};

/**
 * 404 للمسارات التي لا تنتمي لأي لغة (مثل /unknown.txt).
 * لا يتوفر هنا سياق اللغة، لذلك النص ثابت باللغتين معًا.
 */
export default function GlobalNotFound() {
  return (
    <html lang="ar" dir="rtl" className={`${inter.variable} ${plexArabic.variable}`}>
      <body className="grid min-h-dvh place-items-center p-6 text-center">
        <main className="space-y-4">
          <p className="text-gradient-brand text-8xl font-black" dir="ltr">
            404
          </p>
          <h1 className="text-2xl font-bold">الصفحة غير موجودة</h1>
          <p lang="en" dir="ltr" className="text-muted-foreground">
            Page not found
          </p>
          <p className="flex justify-center gap-4 pt-2">
            <Link href="/ar" className="text-primary underline-offset-4 hover:underline">
              الرئيسية
            </Link>
            <Link href="/en" lang="en" className="text-primary underline-offset-4 hover:underline">
              Home
            </Link>
          </p>
        </main>
      </body>
    </html>
  );
}
