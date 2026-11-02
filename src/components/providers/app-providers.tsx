"use client";

import { MotionConfig } from "motion/react";
import { ThemeProvider } from "next-themes";

import { DirectionProvider } from "@/components/ui/direction";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { SessionProvider } from "./session-provider";

type Props = {
  children: React.ReactNode;
  dir: "rtl" | "ltr";
};

/**
 * مزوّدات الواجهة على مستوى التطبيق:
 * - ThemeProvider: يحقن سكربتًا قبل الرسم لتطبيق الثيم المحفوظ أو ثيم الجهاز، فلا يظهر وميض بألوان خاطئة.
 * - DirectionProvider: يجعل مكونات Radix (القوائم والنوافذ) تحترم اتجاه RTL/LTR.
 * - MotionConfig: يعطّل الحركات تلقائيًا لمن فعّل "تقليل الحركة" في جهازه.
 */
export function AppProviders({ children, dir }: Props) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="ep-theme"
    >
      <DirectionProvider dir={dir}>
        <MotionConfig reducedMotion="user">
          <TooltipProvider delayDuration={300}>
            <SessionProvider>{children}</SessionProvider>
            <Toaster position={dir === "rtl" ? "bottom-left" : "bottom-right"} dir={dir} richColors />
          </TooltipProvider>
        </MotionConfig>
      </DirectionProvider>
    </ThemeProvider>
  );
}
