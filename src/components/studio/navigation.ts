import type { IconName } from "./Icon";

export interface NavItem {
  label: string;
  href: string;
  icon: IconName;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: "dashboard" },
  { label: "Nieuwe training", href: "/trainings/new", icon: "plus" },
  { label: "Casus invoeren", href: "/cases/new", icon: "case" },
  { label: "Mijn trainingen", href: "/trainings", icon: "trainings" },
];
