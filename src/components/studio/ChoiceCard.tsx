import { Icon, type IconName } from "./Icon";

interface ChoiceCardProps {
  name: string;
  value: string;
  title: string;
  description: string;
  icon: IconName;
  checked: boolean;
  onSelect: (value: string) => void;
}

/** Selecteerbare kaart; technisch een radioknop, zodat toetsenbord en screenreader werken. */
export function ChoiceCard({ name, value, title, description, icon, checked, onSelect }: ChoiceCardProps) {
  return (
    <label
      className={`flex cursor-pointer flex-col rounded-lg border bg-canvas p-6 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-petrol-600 ${
        checked ? "border-petrol-600 ring-1 ring-petrol-600" : "border-line hover:border-petrol-600/40"
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onSelect(value)}
        className="sr-only"
      />
      <span
        className={`grid size-10 place-items-center rounded-md ${
          checked ? "bg-petrol-700 text-white" : "bg-petrol-50 text-petrol-700"
        }`}
      >
        <Icon name={icon} />
      </span>
      <span className="mt-6 text-base font-semibold text-ink">{title}</span>
      <span className="mt-1.5 text-sm leading-relaxed text-muted">{description}</span>
    </label>
  );
}
