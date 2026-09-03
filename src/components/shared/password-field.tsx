"use client";

import { useState } from "react";
import { Dices, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function generateRandomPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  // Rejection sampling: drop any byte >= the largest multiple of
  // chars.length that fits in 256, so `byte % chars.length` stays uniform
  // instead of being biased toward the low end of the alphabet.
  const maxUnbiased = 256 - (256 % chars.length);
  const randomChar = () => {
    const buf = new Uint8Array(1);
    let b: number;
    do {
      window.crypto.getRandomValues(buf);
      b = buf[0];
    } while (b >= maxUnbiased);
    return chars[b % chars.length];
  };

  let s = "Nge";
  for (let i = 0; i < 8; i++) {
    s += randomChar();
  }
  return s + "!";
}

export function PasswordField({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-10"
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex items-center px-3"
          aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          <span className="sr-only">{show ? "Sembunyikan" : "Tampilkan"} password</span>
        </button>
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => onChange(generateRandomPassword())}
        title="Generate password acak"
      >
        <Dices className="size-4" />
        <span className="sr-only">Generate password acak</span>
      </Button>
    </div>
  );
}
