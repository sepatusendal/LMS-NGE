"use client";

import { useState } from "react";
import Image from "next/image";
import { Search, AlertCircle, Loader2, ShieldCheck, Download, User, School, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

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
    <div className="from-brand/5 via-background to-coral/5 bg-linear-to-b flex min-h-dvh flex-col">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:py-20">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-5">
            <Image
              src="/brand/nufa-logo.png"
              alt="NUFA Global Education"
              width={180}
              height={50}
              className="mx-auto"
            />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#1e3a5f] sm:text-3xl">
                Laporan Perkembangan Siswa
              </h1>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed sm:text-base">
                Masukkan NIS ananda untuk mengunduh laporan bulanan
              </p>
            </div>
          </div>

          <Card className="border-brand/20 overflow-hidden shadow-lg">
            <div className="bg-brand h-1.5" />
            <CardContent className="p-6 sm:p-8">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Nomor Induk Siswa (NIS)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Contoh: 2024001"
                      value={nis}
                      onChange={(e) => setNis(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                      className="text-lg tracking-widest"
                      autoFocus
                    />
                    <Button
                      onClick={handleLookup}
                      disabled={loading || !nis.trim()}
                      className="bg-brand hover:bg-brand/90 shrink-0"
                    >
                      {loading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <>
                          <Search className="size-4" />
                          <span className="hidden sm:inline ml-1.5">Cari</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {loading && (
                  <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Mencari laporan...
                  </div>
                )}

                {error && !loading && (
                  <div className="flex items-start gap-3 rounded-lg bg-red-50 p-4">
                    <div className="bg-red-100 flex size-8 shrink-0 items-center justify-center rounded-full">
                      <AlertCircle className="text-red-600 size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-red-800">
                        Laporan Tidak Ditemukan
                      </p>
                      <p className="text-red-600 mt-0.5 text-xs">{error}</p>
                    </div>
                  </div>
                )}

                {result && !loading && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-4">
                      <div className="bg-emerald-100 flex size-10 shrink-0 items-center justify-center rounded-full">
                        <ShieldCheck className="text-emerald-600 size-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-emerald-800">
                          {result.reports.length} laporan tersedia
                        </p>
                        <p className="text-emerald-600 text-xs">
                          Silakan unduh laporan yang diinginkan
                        </p>
                      </div>
                    </div>

                    <div className="divide-y rounded-lg border">
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div className="bg-brand/10 flex size-9 shrink-0 items-center justify-center rounded-full">
                          <User className="text-brand size-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#1e3a5f]">
                            {result.studentName}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div className="bg-brand/10 flex size-9 shrink-0 items-center justify-center rounded-full">
                          <School className="text-brand size-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{result.schoolName}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                        Laporan Tersedia
                      </p>
                      {result.reports.map((r) => (
                        <a
                          key={r.id}
                          href={r.downloadUrl}
                          className="block"
                        >
                          <Card className="hover:bg-muted/50 cursor-pointer transition-colors">
                            <CardContent className="flex items-center gap-3 p-4">
                              <div className="bg-brand/10 flex size-10 shrink-0 items-center justify-center rounded-lg">
                                <FileText className="text-brand size-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {r.periodLabel}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                  Laporan Bulanan · PDF
                                </p>
                              </div>
                              <Download className="text-brand size-4 shrink-0" />
                            </CardContent>
                          </Card>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <p className="text-muted-foreground text-center text-xs">
            &copy; {new Date().getFullYear()} NUFA Global Education — English Course Management System
          </p>
        </div>
      </div>
    </div>
  );
}
