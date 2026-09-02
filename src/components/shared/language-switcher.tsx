"use client";

import { useTransition } from "react";
import { Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setLocale } from "@/i18n/set-locale";
import type { Locale } from "@/i18n/request";

export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const items = [
    { value: "id", label: t("languageIndonesian") },
    { value: "en", label: t("languageEnglish") },
  ];

  function handleChange(value: string | null) {
    if (!value || value === locale) return;
    startTransition(async () => {
      await setLocale(value as Locale);
      router.refresh();
    });
  }

  return (
    <Select
      items={items}
      value={locale}
      onValueChange={handleChange}
      disabled={isPending}
    >
      <SelectTrigger className={className ?? "w-full sm:w-36"} size="sm">
        <Globe className="size-3.5 shrink-0" aria-hidden="true" />
        <SelectValue placeholder={t("language")} />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
