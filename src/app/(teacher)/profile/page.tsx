"use client";

import { useRouter } from "next/navigation";
import { LogOut, Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentTeacher } from "@/features/teachers/use-current-teacher";
import { ChangePasswordCard } from "@/features/auth/change-password-card";
import { LanguageSwitcher } from "@/components/shared/language-switcher";

export default function ProfilePage() {
  const router = useRouter();
  const { data: teacher, isLoading } = useCurrentTeacher();
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{t("title")}</h1>

      <Card>
        <CardContent className="space-y-3 pt-6">
          {isLoading ? (
            <p className="text-muted-foreground text-sm">{tCommon("loadingData")}</p>
          ) : (
            <>
              <div>
                <p className="text-muted-foreground text-xs">{t("name")}</p>
                <p className="font-medium">{teacher?.fullName}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">{t("email")}</p>
                <p className="font-medium">{teacher?.email}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">{t("tutorId")}</p>
                <p className="font-medium">{teacher?.tutorId || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">{t("phone")}</p>
                <p className="font-medium">{teacher?.phone || "-"}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <ChangePasswordCard />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="size-4" aria-hidden="true" />
            {tCommon("language")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LanguageSwitcher className="w-full" />
        </CardContent>
      </Card>

      <Button variant="outline" className="w-full" onClick={handleLogout}>
        <LogOut className="size-4" aria-hidden="true" />
        {tCommon("logout")}
      </Button>
    </div>
  );
}
