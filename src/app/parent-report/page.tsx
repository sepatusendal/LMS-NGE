"use client";

import { useState } from "react";
import Image from "next/image";
import { Search, AlertCircle, Loader2, PartyPopper, Download, GraduationCap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ReportItem {
  id: string;
  periodLabel: string;
  downloadUrl: string;
  status: string;
}

interface LookupResult {
  studentName: string;
  schoolName: string;
  reports: ReportItem[];
}

const CARD_ACCENTS = [
  { bg: "bg-[#4b60ac]/10", fg: "text-[#4b60ac]", ring: "ring-[#4b60ac]/15" },
  { bg: "bg-[#f15c5d]/10", fg: "text-[#f15c5d]", ring: "ring-[#f15c5d]/15" },
  { bg: "bg-[#1baf7a]/10", fg: "text-[#1baf7a]", ring: "ring-[#1baf7a]/15" },
  { bg: "bg-[#eda100]/10", fg: "text-[#eda100]", ring: "ring-[#eda100]/15" },
];

export default function ParentReportPage() {
  const [nis, setNis] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);

  async function handleLookup() {
    if (!nis.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(`/api/parent-report/lookup?nis=${encodeURIComponent(nis.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Laporan tidak ditemukan");
        return;
      }
      setResult(data);
    } catch {
      setError("Gagal menghubungi server. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#fef9f2]">
      {/* Decorative background blobs + shapes — purely visual, no layout impact */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <svg
          className="absolute -top-24 -left-24 size-72 opacity-70 sm:size-96"
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill="#4b60ac"
            fillOpacity="0.12"
            d="M45.3,-58.6C58.5,-49.9,68.6,-35.5,72.8,-19.5C77,-3.5,75.3,14.1,68.1,29.3C60.9,44.5,48.2,57.3,33.2,64.8C18.2,72.3,0.9,74.5,-16.9,71.8C-34.7,69.1,-53,61.5,-64.5,47.9C-76,34.3,-80.7,14.7,-78.4,-3.6C-76.1,-21.9,-66.8,-38.9,-53.2,-47.9C-39.6,-56.9,-21.7,-57.9,-3.3,-54.1C15.1,-50.3,32.1,-67.3,45.3,-58.6Z"
            transform="translate(100 100)"
          />
        </svg>
        <svg
          className="absolute -right-20 top-1/4 size-64 opacity-70 sm:size-80"
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill="#f15c5d"
            fillOpacity="0.10"
            d="M39.6,-51.2C52.6,-43.5,65.4,-33.4,70.8,-19.9C76.2,-6.5,74.2,10.3,66.9,24.2C59.6,38.1,47,49.1,32.7,57.2C18.4,65.3,2.4,70.5,-13.9,68.9C-30.2,67.3,-46.8,58.9,-58.4,45.6C-70,32.3,-76.6,14.1,-75.8,-3.7C-75,-21.5,-66.8,-38.9,-53.9,-46.9C-41,-54.9,-23.4,-53.5,-6.9,-45.7C9.6,-37.9,26.6,-58.9,39.6,-51.2Z"
            transform="translate(100 100)"
          />
        </svg>
        <svg
          className="absolute bottom-0 left-1/3 size-80 opacity-60 sm:size-[28rem]"
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill="#eda100"
            fillOpacity="0.08"
            d="M44.7,-56.3C57.5,-47.8,66.7,-33.5,70.4,-17.9C74.1,-2.3,72.3,14.6,64.9,28.6C57.5,42.6,44.5,53.7,29.9,61.1C15.3,68.5,-0.9,72.2,-16.8,69.4C-32.7,66.6,-48.3,57.3,-58.9,43.8C-69.5,30.3,-75.1,12.6,-73.7,-4.2C-72.3,-21,-63.9,-36.9,-51.4,-45.6C-38.9,-54.3,-22.3,-55.8,-5.4,-49.1C11.5,-42.4,31.9,-64.8,44.7,-56.3Z"
            transform="translate(100 100)"
          />
        </svg>
        {/* Floating dots/stars for a playful sprinkle */}
        <Sparkles className="absolute top-16 right-[15%] size-5 text-[#eda100] opacity-70 sm:top-20" />
        <Sparkles className="absolute bottom-24 left-[10%] size-4 text-[#4b60ac] opacity-50" />
        <div className="absolute top-[40%] right-[8%] size-3 rounded-full bg-[#f15c5d]/40" />
        <div className="absolute bottom-[15%] right-[20%] size-2.5 rounded-full bg-[#1baf7a]/50" />
        <div className="absolute top-[12%] left-[20%] size-2 rounded-full bg-[#4b60ac]/40" />
      </div>

      <div className="relative flex min-h-dvh flex-col items-center px-4 py-10 sm:py-16">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-4 text-center">
            <div className="inline-flex items-center justify-center rounded-3xl bg-white p-3 shadow-[0_8px_30px_-8px_rgba(75,96,172,0.25)]">
              <Image
                src="/brand/nufa-logo.png"
                alt="NUFA Global Education"
                width={168}
                height={46}
                className="h-auto w-40 sm:w-44"
                priority
              />
            </div>
            <div>
              <h1 className="text-[1.7rem] leading-tight font-extrabold tracking-tight text-[#1e3a5f] sm:text-3xl">
                Laporan Perkembangan{" "}
                <span className="relative inline-block">
                  <span className="relative z-10">Ananda</span>
                  <span className="absolute inset-x-0 bottom-1 -z-0 h-3 -rotate-1 rounded-full bg-[#f15c5d]/25" />
                </span>
              </h1>
              <p className="text-muted-foreground mx-auto mt-2 max-w-xs text-sm leading-relaxed sm:text-base">
                Masukkan NIS untuk melihat progres belajar bahasa Inggris si kecil bulan ini 🎈
              </p>
            </div>
          </div>

          <div className="rounded-[1.75rem] border-2 border-[#4b60ac]/10 bg-white p-6 shadow-[0_20px_50px_-20px_rgba(75,96,172,0.35)] sm:p-7">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#1e3a5f]">
                  Nomor Induk Siswa (NIS)
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Contoh: 2024001"
                    value={nis}
                    onChange={(e) => setNis(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                    className="h-12 rounded-xl border-2 text-lg tracking-widest focus-visible:border-[#4b60ac] focus-visible:ring-[#4b60ac]/20"
                    autoFocus
                  />
                  <Button
                    onClick={handleLookup}
                    disabled={loading || !nis.trim()}
                    className="h-12 shrink-0 rounded-xl bg-[#4b60ac] px-5 font-semibold shadow-[0_6px_16px_-4px_rgba(75,96,172,0.5)] transition-transform hover:scale-[1.03] hover:bg-[#3d4f92] active:scale-95"
                  >
                    {loading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <>
                        <Search className="size-4" />
                        <span className="ml-1.5 hidden sm:inline">Cari</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {loading && (
                <div className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm">
                  <Loader2 className="size-4 animate-spin text-[#4b60ac]" />
                  Sedang mencari laporan...
                </div>
              )}

              {error && !loading && (
                <div className="flex animate-in fade-in slide-in-from-top-1 items-start gap-3 rounded-2xl border-2 border-[#f15c5d]/15 bg-[#f15c5d]/5 p-4 duration-300">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#f15c5d]/15">
                    <AlertCircle className="size-4 text-[#f15c5d]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#c23f40]">
                      Laporan Belum Ditemukan
                    </p>
                    <p className="mt-0.5 text-xs text-[#c23f40]/80">{error}</p>
                  </div>
                </div>
              )}

              {result && !loading && (
                <div className="animate-in fade-in slide-in-from-top-1 space-y-4 duration-300">
                  <div className="flex items-center gap-3 rounded-2xl bg-[#1baf7a]/8 p-4 ring-1 ring-[#1baf7a]/15">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#1baf7a]/15">
                      <PartyPopper className="size-5 text-[#1baf7a]" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#0e7a53]">
                        {result.reports.length} laporan tersedia!
                      </p>
                      <p className="text-xs text-[#0e7a53]/80">
                        Ketuk salah satu untuk mengunduh
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-2xl bg-[#4b60ac]/6 p-4">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#4b60ac]/15">
                      <GraduationCap className="size-5 text-[#4b60ac]" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#1e3a5f]">
                        {result.studentName}
                      </p>
                      <p className="text-muted-foreground text-xs">{result.schoolName}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                      Laporan Tersedia
                    </p>
                    <div className="space-y-2">
                      {result.reports.map((r, i) => {
                        const accent = CARD_ACCENTS[i % CARD_ACCENTS.length];
                        return (
                          <a key={r.id} href={r.downloadUrl} className="block">
                            <div
                              className={`group flex items-center gap-3 rounded-2xl border-2 border-transparent bg-white p-3.5 ring-1 transition-all hover:-translate-y-0.5 hover:border-current hover:shadow-md ${accent.fg} ${accent.ring}`}
                            >
                              <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${accent.bg}`}>
                                <Download className={`size-4.5 ${accent.fg}`} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-[#1e3a5f]">
                                  {r.periodLabel}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                  Laporan Bulanan · PDF
                                </p>
                              </div>
                              <span className="text-muted-foreground text-xs font-medium opacity-0 transition-opacity group-hover:opacity-100">
                                Unduh
                              </span>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <p className="text-muted-foreground text-center text-xs">
            &copy; {new Date().getFullYear()} NUFA Global Education — Portal Belajar & Laporan Siswa
          </p>
        </div>
      </div>
    </div>
  );
}
