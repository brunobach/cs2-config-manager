import { MoonIcon, SunIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";

export function ThemeToggle() {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      className="w-full justify-start gap-2"
      onClick={toggleTheme}
      aria-label={t("shell.theme.toggle")}
      title={t("shell.theme.toggle")}
    >
      {theme === "dark" ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
      {theme === "dark" ? t("shell.theme.light") : t("shell.theme.dark")}
    </Button>
  );
}
