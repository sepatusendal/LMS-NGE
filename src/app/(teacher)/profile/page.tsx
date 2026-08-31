"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrentTeacher } from "@/features/teachers/use-current-teacher";
import { ChangePasswordCard } from "@/features/auth/change-password-card";

export default function ProfilePage() {
  const router = useRouter();
  const { data: teacher, isLoading } = useCurrentTeacher();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Profil</h1>

      <Card>
        <CardContent className="space-y-3 pt-6">
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Memuat data...</p>
          ) : (
            <>
              <div>
                <p className="text-muted-foreground text-xs">Nama</p>
                <p className="font-medium">{teacher?.fullName}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Email</p>
                <p className="font-medium">{teacher?.email}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Tutor ID</p>
                <p className="font-medium">{teacher?.tutorId || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">No. HP</p>
                <p className="font-medium">{teacher?.phone || "-"}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <ChangePasswordCard />

      <Button variant="outline" className="w-full" onClick={handleLogout}>
        <LogOut className="size-4" aria-hidden="true" />
        Keluar
      </Button>
    </div>
  );
}
