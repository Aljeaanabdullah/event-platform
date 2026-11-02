/** روابط التنقل الرئيسية — المفاتيح من ملفات الترجمة (Nav.*) */
export const mainNav = [
  { href: "/events", key: "events" },
  { href: "/#categories", key: "categories" },
  { href: "/#organizers", key: "forOrganizers" },
] as const;

export const routes = {
  login: "/login",
  addEvent: "/organizer/events/new",
} as const;
