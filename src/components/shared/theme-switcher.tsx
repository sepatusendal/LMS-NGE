"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ThemeSwitcher({ className }: { className?: string }) {
  const t = useTranslations("common.theme");
  const { theme, setTheme } = useTheme();
  // `useTheme()` returns `undefined` on the server and on first client
  // render (it needs to read localStorage), so rendering its value directly
  // would flash the wrong option and trigger a hydration mismatch — defer
  // to a client-only mount flag, same pattern as the dashboard's clock.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const items = [
    { value: "light", label: t("light"), icon: Sun },
    { value: "dark", label: t("dark"), icon: Moon },
    { value: "system", label: t("system"), icon: Monitor },
  ];

  // Guard the icon the same way as `value` below — deriving it from the raw
  // `theme` would render the resolved (localStorage-backed) icon on the
  // client's very first paint while the server always rendered "system",
  // which is the same class of hydration mismatch the `mounted` flag above
  // is already there to prevent.
  const current = items.find((item) => item.value === (mounted ? theme : "system")) ?? items[2];
  const CurrentIcon = current.icon;

  return (
    <Select
      items={items.map(({ value, label }) => ({ value, label }))}
      value={mounted ? (theme ?? "system") : "system"}
      onValueChange={(value) => value && setTheme(value)}
    >
      <SelectTrigger className={className ?? "w-full sm:w-36"} size="sm">
        <CurrentIcon className="size-3.5 shrink-0" aria-hidden="true" />
        <SelectValue placeholder={t("label")} />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            <item.icon className="size-3.5 shrink-0" aria-hidden="true" />
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
