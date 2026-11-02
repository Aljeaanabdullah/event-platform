"use client";

import { domAnimation, LazyMotion, m, type Variants } from "motion/react";

type Props = {
  children: React.ReactNode;
  className?: string;
  /** تأخير بالثواني لإظهار العناصر بالتتابع */
  delay?: number;
  as?: "div" | "section" | "li";
};

const variants: Variants = {
  hidden: { opacity: 0, y: 28, filter: "blur(6px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)" },
};

/**
 * يُظهر المحتوى بحركة ناعمة عند دخوله الشاشة أثناء التمرير.
 * - LazyMotion + domAnimation: أصغر حزمة ممكنة من Motion.
 * - مع "تقليل الحركة" يتولى MotionConfig إلغاء الحركة فيظهر المحتوى مباشرة.
 * - بدون JavaScript تُظهر قاعدة <noscript> في الصفحة كل المحتوى (انظر layout).
 */
export function Reveal({ children, className, delay = 0, as = "div" }: Props) {
  const Component = m[as];
  return (
    <LazyMotion features={domAnimation} strict>
      <Component
        data-reveal
        className={className}
        variants={variants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "0px 0px -10% 0px" }}
        transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </Component>
    </LazyMotion>
  );
}
