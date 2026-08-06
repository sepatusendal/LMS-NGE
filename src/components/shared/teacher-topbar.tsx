"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function TeacherTopbar() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between border-b px-4 py-3">
      <Image src="/brand/nufa-mark.png" alt="NUFA" width={28} height={28} />
      <Button variant="ghost" size="sm" onClick={handleLogout}>
        Keluar
      </Button>
    </div>
  );
}
