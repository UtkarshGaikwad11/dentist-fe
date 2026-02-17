"use client";

import * as React from "react";
import Link from "next/link";
import { Mic, Send, Sparkles, Clock, CalendarDays } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";
import { startVoiceCall } from "@/network/Api";

const ACCENT = "#8bc34a";

export default function AssistantHomePage() {
  const [text, setText] = React.useState("");
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  const handleMic = async () => {
    try {
      setLoading(true);

      const res = await startVoiceCall();

      if (!res?.success) {
        throw new Error(res?.message || "Failed to start voice session");
      }

      if (!res?.data?.session_id) {
        throw new Error("Backend did not return session_id");
      }

      localStorage.setItem("voice_session", JSON.stringify(res.data));

      router.push(`/assistant/voice?session_id=${encodeURIComponent(res.data.session_id)}`);
    } catch (err: any) {
      console.error("startVoiceCall error:", err);
      alert(err?.message || "Failed to start voice call");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)] overflow-hidden bg-white">
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
            background: "radial-gradient(circle at 30% 30%, rgba(139,195,74,0.25), rgba(255,255,255,0) 65%)",
          }}
        />
      </div>

      <div className="relative mx-auto w-full max-w-5xl px-4 py-10 md:py-14">
        <div className="mx-auto max-w-3xl text-center">
          <Badge className="border border-foreground/10 bg-white/70 text-foreground shadow-sm backdrop-blur" variant="secondary">
            <Sparkles className="mr-1.5 h-4 w-4" style={{ color: ACCENT }} />
            Dental Hospital • AI Appointment Assistant
          </Badge>

          <h1 className="mt-5 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Chat or Talk <span style={{ color: ACCENT }}>with Your AI Assistant</span>
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
            Schedule appointments, ask about treatments, clinic timings, pricing, and follow-ups — using text or voice.
          </p>
        </div>

        <Card className="mt-8 overflow-hidden border-foreground/10 bg-white/70 shadow-xl backdrop-blur">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-lg">Start a conversation</CardTitle>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="border-foreground/10 bg-white">
                  <Clock className="mr-1.5 h-4 w-4" style={{ color: ACCENT }} />
                  24/7 Assistant
                </Badge>
                <Badge variant="outline" className="border-foreground/10 bg-white">
                  <CalendarDays className="mr-1.5 h-4 w-4" style={{ color: ACCENT }} />
                  Instant booking flow
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pb-7">
            <div className="grid gap-5">
              <button onClick={handleMic} disabled={loading} className="group">
                <div className="relative">
                  <div className="rounded-2xl border border-foreground/10 bg-white/70 p-6 shadow-sm">
                    <div className="flex flex-col items-center justify-center gap-4 py-8">
                      <div
                        className={cn(
                          "relative grid h-20 w-20 place-items-center rounded-full",
                          "shadow-[0_20px_50px_rgba(2,6,23,0.08)]",
                          "transition-transform duration-200 group-hover:scale-[1.03]"
                        )}
                        style={{
                          background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95), rgba(139,195,74,0.25))`,
                          border: "1px solid rgba(139,195,74,0.35)",
                        }}
                      >
                        <div
                          aria-hidden
                          className="absolute inset-0 rounded-full"
                          style={{
                            boxShadow: "0 0 0 0 rgba(139,195,74,0.25)",
                            animation: "pulseRing 2.2s ease-out infinite",
                          }}
                        />

                        <Mic className="h-8 w-8" style={{ color: "#0b1b0a" }} />
                      </div>

                      <div className="text-center">
                        <p className="text-sm font-medium text-foreground">
                          {loading ? "Starting..." : "Click to speak"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Voice conversation opens in a dedicated page
                        </p>
                      </div>

                      <div className="mx-auto w-full max-w-xl">
                        <Separator className="bg-foreground/10" />
                      </div>

                      <div className="mx-auto w-full max-w-2xl">
                        <div className="relative">
                          <Input
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Type your message…"
                            className={cn("h-12 rounded-2xl border-foreground/10 bg-white/80 pr-14 shadow-sm", "focus-visible:ring-2")}
                            style={{ outlineColor: ACCENT }}
                          />

                          <Link
                            href="/assistant/chat"
                            className={cn(
                              "absolute right-2 top-1/2 -translate-y-1/2",
                              "grid h-9 w-9 place-items-center rounded-xl",
                              "border border-foreground/10 bg-white shadow-sm",
                              "transition hover:shadow-md"
                            )}
                            aria-label="Send"
                          >
                            <Send className="h-4 w-4" style={{ color: ACCENT }} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </button>

              <div className="grid gap-3 md:grid-cols-3">
                <MiniInfoCard title="Quick booking" desc="Collects name, issue, preferred time, and confirms slots." />
                <MiniInfoCard title="Treatment guidance" desc="Explains procedures like RCT, aligners, cleaning, implants." />
                <MiniInfoCard title="Follow-up & reminders" desc="Creates a clean flow for post-treatment instructions." />
              </div>
            </div>
          </CardContent>
        </Card>

        <style jsx global>{`
          @keyframes pulseRing {
            0% {
              box-shadow: 0 0 0 0 rgba(139, 195, 74, 0.25);
            }
            70% {
              box-shadow: 0 0 0 22px rgba(139, 195, 74, 0);
            }
            100% {
              box-shadow: 0 0 0 0 rgba(139, 195, 74, 0);
            }
          }
        `}</style>
      </div>
    </div>
  );
}

function MiniInfoCard({ title, desc }: { title: string; desc: string }) {
  const ACCENT = "#8bc34a";
  return (
    <Card className="border-foreground/10 bg-white/70 shadow-sm backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription className="text-sm">{desc}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-1.5 w-full rounded-full bg-foreground/5">
          <div className="h-1.5 w-[55%] rounded-full" style={{ backgroundColor: ACCENT }} />
        </div>
      </CardContent>
    </Card>
  );
}
