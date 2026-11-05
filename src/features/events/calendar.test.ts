import { describe, expect, it } from "vitest";

import { buildIcs, escapeIcsText, googleCalendarUrl, icsDate } from "./calendar";

const event = {
  id: "e1",
  title: "ملتقى, التقنية; 2026",
  description: "سطر أول\nسطر ثانٍ",
  location: "أبراج الكويت",
  url: "https://example.com/ar/events/x",
  startsAt: "2026-11-10T16:00:00.000Z",
  endsAt: "2026-11-10T19:30:00.000Z",
};

describe("التقويم", () => {
  it("تنسيق التاريخ UTC", () => {
    expect(icsDate("2026-11-10T16:00:00.000Z")).toBe("20261110T160000Z");
  });

  it("يهرّب الفواصل والأسطر", () => {
    expect(escapeIcsText("a,b;c\\d\ne")).toBe("a\\,b\\;c\\\\d\\ne");
  });

  it("ملف ICS صالح", () => {
    const ics = buildIcs(event, new Date("2026-11-01T00:00:00Z"));
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("DTSTART:20261110T160000Z");
    expect(ics).toContain("DTEND:20261110T193000Z");
    expect(ics).toContain("SUMMARY:ملتقى\\, التقنية\\; 2026");
    expect(ics).toContain("DESCRIPTION:سطر أول\\nسطر ثانٍ");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("رابط Google Calendar", () => {
    const url = new URL(googleCalendarUrl(event));
    expect(url.hostname).toBe("calendar.google.com");
    expect(url.searchParams.get("dates")).toBe("20261110T160000Z/20261110T193000Z");
    expect(url.searchParams.get("location")).toBe("أبراج الكويت");
  });
});
