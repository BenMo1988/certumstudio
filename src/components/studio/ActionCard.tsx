import Link from "next/link";
import { Icon, type IconName } from "./Icon";

interface ActionCardProps {
  title: string;
  description: string;
  icon: IconName;
  /** Zonder href is de kaart (nog) niet klikbaar. */
  href?: string;
}

export function ActionCard({ title, description, icon, href }: ActionCardProps) {
  const content = (
    <>
      <span className="grid size-10 place-items-center rounded-md bg-petrol-50 text-petrol-700">
        <Icon name={icon} />
      </span>
      <span className="mt-6 flex items-center justify-between gap-2">
        <span className="text-base font-semibold text-ink">{title}</span>
        {href && (
          <Icon
            name="arrowRight"
            className="size-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-petrol-600"
          />
        )}
      </span>
      <span className="mt-1.5 block text-sm leading-relaxed text-muted">{description}</span>
    </>
  );

  const base = "flex flex-col rounded-lg border border-line bg-canvas p-6";

  if (!href) return <div className={base}>{content}</div>;

  return (
    <Link
      href={href}
      className={`group ${base} transition-colors hover:border-petrol-600/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petrol-600`}
    >
      {content}
    </Link>
  );
}
