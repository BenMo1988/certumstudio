import Link from "next/link";

export function StudioHeader() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex h-14 max-w-5xl items-center px-6">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-[15px] font-semibold tracking-tight text-ink">
            Certum Studio
          </span>
          <span className="text-xs text-muted">Bureau Certum</span>
        </Link>
      </div>
    </header>
  );
}
