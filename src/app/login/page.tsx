"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, Sparkles, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

import { loginUser } from "@/network/Api"; 

const ACCENT = "#8bc34a";

export default function LoginPage() {
  const router = useRouter();

  const [showPassword, setShowPassword] = React.useState(false);

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setError(null);

    if (!email || !password) {
      setError("Please enter email and password.");
      return;
    }

    try {
      setLoading(true);

      const res = await loginUser({
        email,
        password,
      });
      if (res?.success) {
        // ✅ save token
        localStorage.setItem("access_token", res.token);
        // ✅ redirect
        router.push("/dashboard");
      } else {
        setError(res?.message || "Login failed.");
      }
    } catch (err: any) {
      setError(err?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      {/* Background */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.05)_1px,transparent_1px)] bg-[size:48px_48px]" />

        <div
          className="absolute left-1/2 top-[-220px] h-[520px] w-[820px] -translate-x-1/2 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle at 50% 40%, rgba(139,195,74,0.35), rgba(139,195,74,0.10) 35%, rgba(255,255,255,0) 70%)",
          }}
        />

        <div
          className="absolute -right-40 bottom-[-240px] h-[520px] w-[520px] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(139,195,74,0.25), rgba(255,255,255,0) 65%)",
          }}
        />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-4 py-10">
        <div className="grid w-full items-center gap-8 md:grid-cols-2">
          {/* Left side */}
          <div className="hidden md:block">
            <Badge
              className="border border-foreground/10 bg-white/70 text-foreground shadow-sm backdrop-blur"
              variant="secondary"
            >
              <Sparkles className="mr-1.5 h-4 w-4" style={{ color: ACCENT }} />
              Dental Hospital • AI Assistant
            </Badge>

            <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight text-foreground">
              Welcome back to <span style={{ color: ACCENT }}>SmileCare</span>
            </h1>

            <p className="mt-3 max-w-md text-pretty text-sm leading-relaxed text-muted-foreground">
              Login to manage your appointments, patient queries, and continue
              conversations with the AI dental assistant.
            </p>

            <div className="mt-6 max-w-md rounded-2xl border border-foreground/10 bg-white/70 p-5 shadow-sm backdrop-blur">
              <div className="text-sm font-medium text-foreground">
                Why login?
              </div>
              <Separator className="my-3 bg-foreground/10" />
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Book appointments faster</li>
                <li>• Save conversation history</li>
                <li>• Receive follow-up reminders</li>
                <li>• Secure access for staff and patients</li>
              </ul>
            </div>
          </div>

          {/* Right side */}
          <Card className="mx-auto w-full max-w-md border-foreground/10 bg-white/70 shadow-xl backdrop-blur">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Login</CardTitle>
              <CardDescription>
                Enter your email and password to continue.
              </CardDescription>
            </CardHeader>

            <CardContent className="pb-7">
              {/* ✅ form wrapper */}
              <form onSubmit={handleLogin} className="grid gap-4">
                {/* Error */}
                {error && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                {/* Email */}
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 rounded-2xl border-foreground/10 bg-white pl-10"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link
                      href="#"
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 rounded-2xl border-foreground/10 bg-white pl-10 pr-10"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label="Toggle password"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox id="remember" />
                    <Label
                      htmlFor="remember"
                      className="text-sm font-normal text-muted-foreground"
                    >
                      Remember me
                    </Label>
                  </div>
                </div>

                {/* Login button */}
                <Button
                  type="submit"
                  disabled={loading}
                  className={cn(
                    "h-11 w-full rounded-2xl text-sm font-medium shadow-sm"
                  )}
                  style={{
                    backgroundColor: ACCENT,
                    color: "#0b1b0a",
                  }}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Logging in...
                    </span>
                  ) : (
                    "Login"
                  )}
                </Button>

                {/* Divider */}
                <div className="relative py-1">
                  <Separator className="bg-foreground/10" />
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-foreground/10 bg-white px-3 py-1 text-xs text-muted-foreground">
                    OR
                  </div>
                </div>

                {/* Google */}
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full rounded-2xl border-foreground/10 bg-white"
                >
                  Continue with Google
                </Button>

                {/* Signup */}
                <p className="pt-2 text-center text-sm text-muted-foreground">
                  Don&apos;t have an account?{" "}
                  <Link
                    href="#"
                    className="font-medium hover:underline"
                    style={{ color: ACCENT }}
                  >
                    Create one
                  </Link>
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
