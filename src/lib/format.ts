const DATE_FORMAT = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Amsterdam",
});

/** ISO-datum naar bijv. "1 okt 2026". */
export function formatDate(iso: string): string {
  return DATE_FORMAT.format(new Date(iso));
}
