"use client";

import { useState } from "react";
import { Dices, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function generateRandomPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(8);
  window.crypto.getRandomValues(bytes);
  let s = "Nge";
  bytes.forEach((b) => {
    s += chars[b % chars.length];
  });
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
          tabIndex={-1}
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
