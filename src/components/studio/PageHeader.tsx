import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  eyebrow?: string;
  description?: string;
  /** Optionele actie rechts van de titel, bijv. een knop. */
  action?: ReactNode;
}

export function PageHeader({ title, eyebrow, description, action }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="text-sm font-medium text-petrol-600">{eyebrow}</p>}
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink sm:text-[2.125rem]">
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
