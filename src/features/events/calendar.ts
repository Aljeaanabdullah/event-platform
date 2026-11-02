/**
 * "أضف إلى التقويم": ملف ICS (RFC 5545) ورابط Google Calendar.
 * بدون مكتبات — النص يُهرَّب حسب المعيار وتُطوى الأسطر عند 75 بايت تقريبًا.
 */
export type CalendarEvent = {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  url: string;
  startsAt: string;
  endsAt: string;
};

/** 20261103T200000Z */
export function icsDate(iso: string): string {
  return new Date(iso)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

export function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/([,;])/g, "\\$1");
}

/** طي الأسطر الطويلة (75 حرفًا) كما يشترط المعيار */
function fold(line: string): string {
  const chars = [...line];
  if (chars.length <= 74) return line;
  const parts: string[] = [];
  for (let i = 0; i < chars.length; i += 74) parts.push(chars.slice(i, i + 74).join(""));
  return parts.join("\r\n ");
}

export function buildIcs(event: CalendarEvent, now = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Event Platform//Kuwait//AR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@event-platform`,
    `DTSTAMP:${icsDate(now.toISOString())}`,
    `DTSTART:${icsDate(event.startsAt)}`,
    `DTEND:${icsDate(event.endsAt)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    event.description ? `DESCRIPTION:${escapeIcsText(event.description.slice(0, 1000))}` : null,
    event.location ? `LOCATION:${escapeIcsText(event.location)}` : null,
    `URL:${event.url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter((l): l is string => l !== null);
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function googleCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${icsDate(event.startsAt)}/${icsDate(event.endsAt)}`,
    details: [event.description?.slice(0, 500), event.url].filter(Boolean).join("\n\n"),
    ctz: "Asia/Kuwait",
  });
  if (event.location) params.set("location", event.location);
  return `https://calendar.google.com/calendar/render?${params}`;
}
