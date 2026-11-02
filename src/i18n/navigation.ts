import { createNavigation } from "next-intl/navigation";

import { routing } from "./routing";

// بدائل لـ Link و useRouter في Next.js تضيف بادئة اللغة تلقائيًا
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
