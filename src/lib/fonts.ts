import { IBM_Plex_Sans_Arabic, Inter } from "next/font/google";

// تُحمَّل الخطوط ذاتيًا من نطاق الموقع (بلا طلبات لـ Google وقت التصفح)
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-arabic",
  display: "swap",
});
