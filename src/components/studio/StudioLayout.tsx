import Link from "next/link";
import type { ReactNode } from "react";
import { SidebarNav } from "./SidebarNav";

/** Vaste studio-shell: sidebar links (op mobiel bovenaan), werkruimte rechts. */
export function StudioLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full md:pl-64">
      <aside className="border-b border-line bg-surface md:fixed md:inset-y-0 md:left-0 md:flex md:w-64 md:flex-col md:border-r md:border-b-0">
        <div className="px-6 pt-5 pb-3 md:pt-7 md:pb-8">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="grid size-7 place-items-center rounded-md bg-petrol-700 text-sm font-semibold text-white">
              C
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-ink">
              Certum Studio
            </span>
          </Link>
        </div>

        <div className="px-3 pb-3 md:flex-1 md:pb-0">
          <SidebarNav />
        </div>

        <div className="hidden border-t border-line px-6 py-5 text-xs leading-relaxed md:block">
          <p className="font-medium text-ink">Certum Studio</p>
          <p className="text-muted">Bureau Certum</p>
        </div>
      </aside>

      <main className="mx-auto max-w-5xl px-6 py-10 md:px-12 md:py-16">{children}</main>
    </div>
  );
}
