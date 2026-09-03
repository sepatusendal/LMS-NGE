"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { loginSchema, type LoginInput } from "@/features/auth/login-schema";
import { roleLandingPath } from "@/features/auth/role-routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: LoginInput) {
    setIsSubmitting(true);
    const supabase = createClient();

    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword(values);

    if (authError || !authData.user) {
      toast.error("Login gagal", {
        description: authError?.message ?? "Email atau password salah.",
      });
      setIsSubmitting(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", authData.user.id)
      .single();

    if (profileError || !profile) {
      toast.error("Login gagal", {
        description: "Profil user tidak ditemukan. Hubungi Administrator.",
      });
      await supabase.auth.signOut();
      setIsSubmitting(false);
      return;
    }

    const role = profile.role as keyof typeof roleLandingPath;
    router.push(roleLandingPath[role]);
    router.refresh();
  }

  return (
    <div className="relative flex min-h-dvh overflow-hidden bg-[#fbf7ef]">
      {/* Decorative blobs — visual only */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <svg className="absolute -top-28 -left-28 size-80 opacity-70 sm:size-104" viewBox="0 0 200 200">
          <path
            fill="#4b60ac"
            fillOpacity="0.10"
            d="M45.3,-58.6C58.5,-49.9,68.6,-35.5,72.8,-19.5C77,-3.5,75.3,14.1,68.1,29.3C60.9,44.5,48.2,57.3,33.2,64.8C18.2,72.3,0.9,74.5,-16.9,71.8C-34.7,69.1,-53,61.5,-64.5,47.9C-76,34.3,-80.7,14.7,-78.4,-3.6C-76.1,-21.9,-66.8,-38.9,-53.2,-47.9C-39.6,-56.9,-21.7,-57.9,-3.3,-54.1C15.1,-50.3,32.1,-67.3,45.3,-58.6Z"
            transform="translate(100 100)"
          />
        </svg>
        <svg className="absolute -right-32 -bottom-24 size-96 opacity-70 sm:size-120" viewBox="0 0 200 200">
          <path
            fill="#f15c5d"
            fillOpacity="0.10"
            d="M39.6,-51.2C52.6,-43.5,65.4,-33.4,70.8,-19.9C76.2,-6.5,74.2,10.3,66.9,24.2C59.6,38.1,47,49.1,32.7,57.2C18.4,65.3,2.4,70.5,-13.9,68.9C-30.2,67.3,-46.8,58.9,-58.4,45.6C-70,32.3,-76.6,14.1,-75.8,-3.7C-75,-21.5,-66.8,-38.9,-53.9,-46.9C-41,-54.9,-23.4,-53.5,-6.9,-45.7C9.6,-37.9,26.6,-58.9,39.6,-51.2Z"
            transform="translate(100 100)"
          />
        </svg>
      </div>

      {/* Left brand panel — desktop only */}
      <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-[#4b60ac] p-10 text-white lg:flex xl:w-[42%]">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <svg className="absolute -top-10 -right-16 size-72 opacity-30" viewBox="0 0 200 200">
            <path
              fill="#ffffff"
              d="M45.3,-58.6C58.5,-49.9,68.6,-35.5,72.8,-19.5C77,-3.5,75.3,14.1,68.1,29.3C60.9,44.5,48.2,57.3,33.2,64.8C18.2,72.3,0.9,74.5,-16.9,71.8C-34.7,69.1,-53,61.5,-64.5,47.9C-76,34.3,-80.7,14.7,-78.4,-3.6C-76.1,-21.9,-66.8,-38.9,-53.2,-47.9C-39.6,-56.9,-21.7,-57.9,-3.3,-54.1C15.1,-50.3,32.1,-67.3,45.3,-58.6Z"
              transform="translate(100 100)"
            />
          </svg>
          <svg className="absolute -bottom-16 -left-12 size-64 opacity-20" viewBox="0 0 200 200">
            <path
              fill="#f15c5d"
              d="M39.6,-51.2C52.6,-43.5,65.4,-33.4,70.8,-19.9C76.2,-6.5,74.2,10.3,66.9,24.2C59.6,38.1,47,49.1,32.7,57.2C18.4,65.3,2.4,70.5,-13.9,68.9C-30.2,67.3,-46.8,58.9,-58.4,45.6C-70,32.3,-76.6,14.1,-75.8,-3.7C-75,-21.5,-66.8,-38.9,-53.9,-46.9C-41,-54.9,-23.4,-53.5,-6.9,-45.7C9.6,-37.9,26.6,-58.9,39.6,-51.2Z"
              transform="translate(100 100)"
            />
          </svg>
        </div>

        <Image src="/brand/nufa-mark.png" alt="NUFA" width={40} height={40} className="relative brightness-0 invert" />

        <div className="relative space-y-6">
          <WelcomeIllustration className="h-auto w-full max-w-sm" />
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight xl:text-3xl">
              Kelola kelas, lesson plan, dan laporan — semua di satu tempat.
            </h2>
            <p className="mt-3 text-sm text-white/75">
              Portal terpadu untuk tutor, koordinator, dan admin NUFA Global Education.
            </p>
          </div>
        </div>

        <p className="relative text-xs text-white/50">
          &copy; {new Date().getFullYear()} NUFA Global Education
        </p>
      </div>

      {/* Right form panel */}
      <div className="relative flex flex-1 flex-col items-center justify-center gap-8 p-4 sm:p-8">
        <Image
          src="/brand/nufa-logo.png"
          alt="NUFA Global Education"
          width={200}
          height={57}
          priority
          className="h-auto w-44 sm:w-48"
        />

        <div className="w-full max-w-sm rounded-[1.75rem] border-2 border-[#4b60ac]/10 bg-white p-7 shadow-[0_20px_50px_-20px_rgba(75,96,172,0.35)] sm:p-8">
          <div className="mb-6 space-y-1.5">
            <h1 className="text-2xl font-extrabold tracking-tight text-[#1e3a5f]">
              Selamat Datang 👋
            </h1>
            <p className="text-muted-foreground text-sm">
              Masuk ke Portal NUFA untuk melanjutkan
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#1e3a5f]">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="nama@nufaglobaledu.com"
                className="h-11 rounded-xl border-2 focus-visible:border-[#4b60ac] focus-visible:ring-[#4b60ac]/20"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-destructive text-sm">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#1e3a5f]">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="h-11 rounded-xl border-2 pr-10 focus-visible:border-[#4b60ac] focus-visible:ring-[#4b60ac]/20"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex items-center px-3"
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  <span className="sr-only">
                    {showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  </span>
                </button>
              </div>
              {errors.password && (
                <p className="text-destructive text-sm">{errors.password.message}</p>
              )}
            </div>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-11 w-full rounded-xl bg-[#4b60ac] font-semibold shadow-[0_6px_16px_-4px_rgba(75,96,172,0.5)] transition-transform hover:scale-[1.01] hover:bg-[#3d4f92] active:scale-95"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <LogIn className="size-4" />
                  <span className="ml-1.5">Masuk</span>
                </>
              )}
            </Button>
          </form>
        </div>

        <p className="text-muted-foreground text-center text-xs lg:hidden">
          &copy; {new Date().getFullYear()} NUFA Global Education
        </p>
      </div>
    </div>
  );
}

function WelcomeIllustration({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 320 220" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="160" cy="196" rx="120" ry="12" fill="#000000" fillOpacity="0.12" />
      {/* Desk */}
      <rect x="40" y="150" width="240" height="14" rx="4" fill="#ffffff" fillOpacity="0.18" />
      {/* Open book */}
      <path d="M100 150 L100 108 Q130 96 160 108 L160 150 Z" fill="#ffffff" fillOpacity="0.92" />
      <path d="M220 150 L220 108 Q190 96 160 108 L160 150 Z" fill="#ffffff" fillOpacity="0.78" />
      <path d="M108 116 Q130 108 152 116" stroke="#4b60ac" strokeWidth="2" strokeLinecap="round" />
      <path d="M108 128 Q130 120 152 128" stroke="#4b60ac" strokeWidth="2" strokeLinecap="round" />
      <path d="M168 116 Q190 108 212 116" stroke="#4b60ac" strokeWidth="2" strokeLinecap="round" />
      <path d="M168 128 Q190 120 212 128" stroke="#4b60ac" strokeWidth="2" strokeLinecap="round" />
      {/* Graduation cap floating */}
      <g transform="translate(160 50)">
        <ellipse cx="0" cy="10" rx="30" ry="9" fill="#f15c5d" />
        <path d="M-30 10 L0 -8 L30 10 L0 22 Z" fill="#ffffff" />
        <circle cx="24" cy="14" r="2.5" fill="#eda100" />
        <line x1="24" y1="14" x2="24" y2="30" stroke="#eda100" strokeWidth="2" />
      </g>
      {/* Sparkles */}
      <g fill="#eda100">
        <circle cx="60" cy="60" r="3" />
        <circle cx="256" cy="70" r="2.5" />
        <circle cx="240" cy="40" r="2" />
      </g>
      <g fill="#f15c5d" fillOpacity="0.8">
        <circle cx="46" cy="100" r="2.5" />
        <circle cx="270" cy="110" r="3" />
      </g>
    </svg>
  );
}
