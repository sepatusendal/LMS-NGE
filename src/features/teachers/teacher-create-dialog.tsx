"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { teacherCreateSchema, type TeacherCreateInput } from "./schema";
import { useCreateTeacher } from "./use-teachers";

export function TeacherCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createTeacher = useCreateTeacher();
  const [result, setResult] = useState<{ email: string; tempPassword: string } | null>(
    null,
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TeacherCreateInput>({ resolver: zodResolver(teacherCreateSchema) });

  async function onSubmit(values: TeacherCreateInput) {
    const created = await createTeacher.mutateAsync(values);
    setResult(created);
    reset();
  }

  function handleClose(open: boolean) {
    if (!open) setResult(null);
    onOpenChange(open);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle>Akun Teacher Berhasil Dibuat</DialogTitle>
              <DialogDescription>
                Catat kredensial ini sekarang — password tidak akan ditampilkan
                lagi. Sampaikan ke teacher yang bersangkutan secara langsung.
              </DialogDescription>
            </DialogHeader>
            <div className="bg-muted space-y-2 rounded-lg p-4 text-sm">
              <p>
                <span className="text-muted-foreground">Email:</span>{" "}
                {result.email}
              </p>
              <p>
                <span className="text-muted-foreground">Password Sementara:</span>{" "}
                <span className="font-mono">{result.tempPassword}</span>
              </p>
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Email: ${result.email}\nPassword: ${result.tempPassword}`,
                  );
                  toast.success("Kredensial disalin ke clipboard");
                }}
              >
                Salin Kredensial
              </Button>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Selesai
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Tambah Teacher</DialogTitle>
              <DialogDescription>
                Akun login akan dibuat otomatis dengan password sementara.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nama Lengkap</Label>
                <Input id="fullName" {...register("fullName")} />
                {errors.fullName && (
                  <p className="text-destructive text-sm">
                    {errors.fullName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register("email")} />
                {errors.email && (
                  <p className="text-destructive text-sm">
                    {errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">No. HP</Label>
                <Input id="phone" {...register("phone")} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createTeacher.isPending}>
                  {createTeacher.isPending ? "Membuat akun..." : "Buat Akun"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
