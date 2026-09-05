"use client";

import Link from "next/link";
import {
  Building2,
  GraduationCap,
  Users,
  BookOpen,
  ListChecks,
  CalendarDays,
  ShieldUser,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";

function useQuickLinks() {
  const t = useTranslations("admin.settings.links");
  return [
    {
      href: "/schools",
      label: t("schools"),
      description: t("schoolsDescription"),
      icon: Building2,
    },
    {
      href: "/teachers",
      label: t("teachers"),
      description: t("teachersDescription"),
      icon: GraduationCap,
    },
    {
      href: "/users",
      label: t("users"),
      description: t("usersDescription"),
      icon: ShieldUser,
    },
    {
      href: "/students",
      label: t("students"),
      description: t("studentsDescription"),
      icon: Users,
    },
    {
      href: "/classes",
      label: t("classes"),
      description: t("classesDescription"),
      icon: BookOpen,
    },
    {
      href: "/curriculum",
      label: t("curriculum"),
      description: t("curriculumDescription"),
      icon: ListChecks,
    },
    {
      href: "/lesson-plans",
      label: t("lessonPlans"),
      description: t("lessonPlansDescription"),
      icon: CalendarDays,
    },
  ];
}

export default function SettingsPage() {
  const t = useTranslations("admin.settings");
  const tTheme = useTranslations("common.theme");
  const quickLinks = useQuickLinks();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{tTheme("label")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ThemeSwitcher className="w-full sm:w-48" />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href}>
              <Card className="hover:bg-muted/50 h-full transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Icon className="text-primary size-4" />
                    {link.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-xs">
                    {link.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
