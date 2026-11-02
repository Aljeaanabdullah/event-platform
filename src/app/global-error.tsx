"use client";

import Link from "next/link";
import { useEffect } from "react";

import "./globals.css";

/**
 * خطأ 500 على مستوى الجذر (عندما يفشل التخطيط نفسه).
 * يستبدل الصفحة كاملة، ولا يتوفر سياق الترجمة، لذلك النص باللغتين.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body className="grid min-h-dvh place-items-center bg-background p-6 text-center font-sans text-foreground">
        <main className="max-w-md space-y-4">
          <p className="text-gradient-brand text-7xl font-black" dir="ltr">
            500
          </p>
          <h1 className="text-2xl font-bold">حدث خطأ غير متوقع</h1>
          <p lang="en" dir="ltr" className="text-muted-foreground">
            Something went wrong
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={reset}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              إعادة المحاولة · Try again
            </button>
            <Link href="/" className="rounded-lg border px-4 py-2 text-sm font-medium">
              الرئيسية · Home
            </Link>
          </div>
          {error.digest ? (
            <p className="text-xs text-muted-foreground" dir="ltr">
              Ref: {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
