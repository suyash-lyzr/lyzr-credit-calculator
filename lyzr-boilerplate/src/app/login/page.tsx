"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconLoader2, IconArrowLeft } from "@tabler/icons-react";

const LYZR_LOGO =
  "https://s3-us-west-2.amazonaws.com/cbi-image-service-prd/original/ed9b933b-bc18-4619-8e8a-e273334b8b34.png";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/credit-calculator";

  const [step, setStep] = React.useState<"email" | "code">("email");
  const [email, setEmail] = React.useState("");
  const [code, setCode] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);

  async function requestOtp(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const r = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error || "Couldn't send the code.");
      } else {
        setStep("code");
        setInfo(`We sent a 6-digit code to ${email}. It expires in 10 minutes.`);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function verify(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const r = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error || "Invalid code.");
      } else {
        router.replace(nextPath);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-8">
          <Image src={LYZR_LOGO} alt="Lyzr" width={88} height={88} unoptimized className="mb-4" />
          <h1 className="text-3xl font-bold mb-1">Sign in</h1>
          <p className="text-muted-foreground">to your Lyzr Credit Calculator</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          {step === "email" ? (
            <form onSubmit={requestOtp} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Email address</label>
                <Input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  disabled={loading}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading || !email.trim()}>
                {loading ? <IconLoader2 className="h-4 w-4 animate-spin" /> : "Send login code"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                We&apos;ll email you a one-time code. No password needed.
              </p>
            </form>
          ) : (
            <form onSubmit={verify} className="space-y-4">
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setError(null);
                  setInfo(null);
                }}
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                <IconArrowLeft className="h-3 w-3" /> Use a different email
              </button>
              <div>
                <label className="text-sm font-medium mb-1.5 block">6-digit code</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  autoFocus
                  disabled={loading}
                  className="text-center text-2xl tracking-[0.5em] font-mono"
                />
              </div>
              {info && !error && <p className="text-xs text-muted-foreground">{info}</p>}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
                {loading ? <IconLoader2 className="h-4 w-4 animate-spin" /> : "Verify & sign in"}
              </Button>
              <button
                type="button"
                onClick={() => requestOtp()}
                disabled={loading}
                className="block w-full text-xs text-muted-foreground hover:text-foreground mt-2"
              >
                Didn&apos;t get it? Resend code
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
