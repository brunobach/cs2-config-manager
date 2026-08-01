import { CrosshairIcon, GitCompareArrowsIcon, UsersIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";

import { cn } from "@/lib/utils";

import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";

const NAV_ITEMS = [
  { to: "/", labelKey: "shell.nav.accounts", icon: UsersIcon },
  { to: "/compare", labelKey: "shell.nav.compare", icon: GitCompareArrowsIcon },
] as const;

export function Sidebar() {
  const { t } = useTranslation();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 border-b px-4 py-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <CrosshairIcon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">CS2 Config Manager</p>
          <p className="text-xs text-muted-foreground">{t("shell.tagline")}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {NAV_ITEMS.map(({ to, labelKey, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                isActive && "bg-accent text-accent-foreground",
              )
            }
          >
            <Icon className="size-4" />
            {t(labelKey)}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-2 border-t p-3">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </aside>
  );
}
