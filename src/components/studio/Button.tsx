import Link from "next/link";
import type { ReactNode } from "react";

type Variant = "primary" | "secondary";

interface ButtonProps {
  children: ReactNode;
  variant?: Variant;
  href?: string;
  disabled?: boolean;
  title?: string;
}

const VARIANTS: Record<Variant, string> = {
  primary: "bg-petrol-700 text-white hover:bg-petrol-800",
  secondary: "border border-line bg-canvas text-ink hover:bg-surface",
};

export function Button({ children, variant = "primary", href, disabled, title }: ButtonProps) {
  const className = `inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petrol-600 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]}`;

  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={className} disabled={disabled} title={title}>
      {children}
    </button>
  );
}
