/** Getoond als de database (DATABASE_URL) niet is ingesteld. Geen technische details. */
export function DatabaseNotice() {
  return (
    <p role="alert" className="rounded-md border border-attention/30 bg-attention-50 px-4 py-3 text-sm text-ink">
      De database is niet ingesteld. Zet <code>DATABASE_URL</code> in <code>.env.local</code> en herstart Certum Studio.
    </p>
  );
}
