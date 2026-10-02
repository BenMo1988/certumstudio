"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";
import { NAV_ITEMS } from "./navigation";

function matches(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Het meest specifieke item wint: /trainings/new markeert "Nieuwe training", niet ook "Mijn trainingen". */
function activeHref(pathname: string) {
  return NAV_ITEMS.map((item) => item.href)
    .filter((href) => matches(pathname, href))
    .sort((a, b) => b.length - a.length)[0];
}

export function SidebarNav() {
  const current = activeHref(usePathname());

  return (
    <nav aria-label="Hoofdnavigatie">
      <ul className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
        {NAV_ITEMS.map((item) => {
          const active = item.href === current;
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-petrol-50 font-medium text-petrol-700"
                    : "text-muted hover:bg-canvas hover:text-ink"
                }`}
              >
                <Icon
                  name={item.icon}
                  className={`size-[18px] ${active ? "text-petrol-600" : ""}`}
                />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
