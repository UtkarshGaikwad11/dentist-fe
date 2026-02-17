"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Room, RoomEvent } from "livekit-client";
import {
  LogOut,
  Bot,
  User,
  Sparkles,
  Loader2,
  Waves,
  MessageCircle,
  ShieldCheck,
  Mic,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const ACCENT = "#8bc34a";

type VoiceSession = {
  user_id: number;
  user_email: string;
  session_id: string;
  livekit_url: string;
  room_name: string;
  participant_identity: string;
  participant_name: string;
  agent_name: string;
  dispatch_id: string;
  access_token: string;
};

type ChatMsg = {
  id: string;
  type: "system" | "error" | "agent" | "user";
  text: string;
  speaker?: string;
  timestamp?: Date;
  streaming?: boolean;
};

function formatTime(d?: Date) {
  if (!d) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function VoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = React.useState<
    "disconnected" | "connecting" | "connected"
  >("disconnected");

  const [messages, setMessages] = React.useState<ChatMsg[]>([]);
  const [agentSpeaking, setAgentSpeaking] = React.useState(false);
  const [userSpeaking, setUserSpeaking] = React.useState(false);
  const [error, setError] = React.useState("");
  const [chatInput, setChatInput] = React.useState("");

  const roomRef = React.useRef<Room | null>(null);
  const audioElRef = React.useRef<HTMLAudioElement | null>(null);
  const endRef = React.useRef<HTMLDivElement | null>(null);

  const didConnectRef = React.useRef(false);


  // one bubble per streaming chunk session
  const agentStreamingIdRef = React.useRef<string | null>(null);
  const userStreamingIdRef = React.useRef<string | null>(null);

  const sessionId = searchParams.get("session_id");

  const sessionData: VoiceSession | null = React.useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("voice_session");
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, []);

  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const disconnect = React.useCallback((silent = false) => {
    if (roomRef.current) {
      try {
        roomRef.current.disconnect();
      } catch { }
      roomRef.current = null;
    }

    didConnectRef.current = false; // ✅ add this

    setStatus("disconnected");
    setAgentSpeaking(false);
    setUserSpeaking(false);
    agentStreamingIdRef.current = null;
    userStreamingIdRef.current = null;

    if (!silent) setError("");
  }, []);


  React.useEffect(() => {
    return () => {
      // In Next.js dev mode, React Strict Mode mounts/unmounts twice.
      // This causes LiveKit to log "Client initiated disconnect".
      // So we only disconnect if we were actually connected.
      if (roomRef.current && status === "connected") {
        disconnect(true);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const pushSystem = (text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `sys-${Date.now()}`,
        type: "system",
        text,
        speaker: "System",
        timestamp: new Date(),
      },
    ]);
  };

  const pushError = (text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `err-${Date.now()}`,
        type: "error",
        text,
        speaker: "Error",
        timestamp: new Date(),
      },
    ]);
  };

  const connectToRoom = React.useCallback(async () => {
    if (status !== "disconnected") return;
    if (!sessionData?.livekit_url || !sessionData?.access_token) {
      setError(
        "Missing livekit_url or access_token. Check localStorage voice_session."
      );
      setStatus("disconnected");
      return;
    }

    setStatus("connecting");
    setError("");
    setMessages([]);
    pushSystem("Connecting to receptionist...");

    try {
      const room = new Room();
      roomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === "audio") {
          const el = audioElRef.current;
          if (el) track.attach(el);
          pushSystem("Receptionist connected!");
        }
      });

      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        const agentIsSpeaking = speakers.some((s) =>
          s.identity?.includes("agent")
        );

        const userIsSpeakingNow = speakers.some(
          (s) => s.identity === sessionData.participant_identity
        );

        setAgentSpeaking(agentIsSpeaking);
        setUserSpeaking(userIsSpeakingNow);

        if (!agentIsSpeaking) {
          const id = agentStreamingIdRef.current;
          if (id) {
            setMessages((prev) =>
              prev.map((m) => (m.id === id ? { ...m, streaming: false } : m))
            );
            agentStreamingIdRef.current = null;
          }
        }

        if (!userIsSpeakingNow) {
          const id = userStreamingIdRef.current;
          if (id) {
            setMessages((prev) =>
              prev.map((m) => (m.id === id ? { ...m, streaming: false } : m))
            );
            userStreamingIdRef.current = null;
          }
        }
      });

      room.on(RoomEvent.DataReceived, (payload, participant) => {
        try {
          const decoder = new TextDecoder();
          const msg = decoder.decode(payload);
          const jsonData = JSON.parse(msg);

          const text = (jsonData?.text || jsonData?.message || "").trim();
          if (!text) return;

          // 🔥 IMPORTANT: detect role from payload (not participant.identity)
          const roleRaw =
            jsonData?.role ||
            jsonData?.speaker ||
            jsonData?.sender ||
            jsonData?.from ||
            jsonData?.participant ||
            "";

          const role = String(roleRaw).toLowerCase();

          const isUserMsg =
            role.includes("user") ||
            role.includes("patient") ||
            role === sessionData.participant_identity;

          const isAgentMsg =
            role.includes("assistant") ||
            role.includes("agent") ||
            role.includes("bot") ||
            role.includes("receptionist");

          // fallback: if unknown, assume agent
          const finalType: "user" | "agent" = isUserMsg
            ? "user"
            : isAgentMsg
              ? "agent"
              : "agent";

          // STREAM GROUPING
          const targetRef =
            finalType === "agent" ? agentStreamingIdRef : userStreamingIdRef;

          if (!targetRef.current) {
            const newId = `${finalType}-${Date.now()}`;
            targetRef.current = newId;

            setMessages((prev) => [
              ...prev,
              {
                id: newId,
                type: finalType,
                text: "",
                speaker: finalType === "agent" ? "Receptionist" : "You",
                timestamp: new Date(),
                streaming: true,
              },
            ]);
          }

          const id = targetRef.current;

          setMessages((prev) =>
            prev.map((m) =>
              m.id === id ? { ...m, text: (m.text + " " + text).trim() } : m
            )
          );
        } catch (e) {
          console.error("DataReceived parse error:", e);
        }
      });

      await room.connect(sessionData.livekit_url, sessionData.access_token);

      try {
        await room.localParticipant.setMicrophoneEnabled(true);
      } catch (micError) {
        console.error("Microphone error:", micError);
        setError("Microphone permission denied. Please allow mic access.");
      }

      setStatus("connected");
      pushSystem("Connected! Speak or type to continue.");
    } catch (err: any) {
      console.error("Room connection error:", err);
      setError(err?.message || "Failed to connect room");
      setStatus("disconnected");
      pushError(`Connection error: ${err?.message || "Unknown error"}`);
    }
  }, [sessionData]);

  React.useEffect(() => {
    if (!sessionId) return;
    if (!sessionData) return;

    // Prevent double connect in Next.js dev (React Strict Mode)
    if (didConnectRef.current) return;
    didConnectRef.current = true;

    connectToRoom();
  }, [sessionId, sessionData, connectToRoom]);


  const sendChatMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim() || !roomRef.current) return;

    const text = chatInput.trim();

    setMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        type: "user",
        text,
        speaker: "You",
        timestamp: new Date(),
      },
    ]);

    try {
      const encoder = new TextEncoder();
      await roomRef.current.localParticipant.publishData(
        encoder.encode(
          JSON.stringify({
            type: "chat",
            text,
            message: text,
            timestamp: new Date().toISOString(),
            sender: "user",
          })
        ),
        { reliable: true, destinationIdentities: [] }
      );
    } catch (err: any) {
      console.error("Send message error:", err);
      pushError(`Failed to send: ${err?.message || "Unknown error"}`);
    }

    setChatInput("");
  };

  const logout = () => {
    disconnect(true);
    localStorage.removeItem("access_token");
    localStorage.removeItem("voice_session");
    router.replace("/login");
  };

  const endCall = () => {
  disconnect(true);
  router.push("/dashboard");
};


  return (
    <div className="relative min-h-screen bg-white">
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

      </div>

      <div className="relative mx-auto w-full max-w-5xl space-y-5 px-4 py-6 md:py-8">
        {/* Header */}
        <Card className="border-foreground/10 bg-white/70 shadow-sm backdrop-blur">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-base">
                🦷 SmileCare • Virtual Receptionist
              </CardTitle>

              <div className="mt-2 flex flex-wrap gap-2">
                <Badge className="border border-foreground/10 bg-white/70 text-foreground shadow-sm backdrop-blur">
                  <Sparkles className="mr-1.5 h-4 w-4" style={{ color: ACCENT }} />
                  AI Voice Assistant
                </Badge>

                <Badge variant="outline" className="border-foreground/10 bg-white">
                  <ShieldCheck className="mr-1.5 h-4 w-4" style={{ color: ACCENT }} />
                  Secure session
                </Badge>

                <Badge
                  variant="outline"
                  className={cn(
                    "border-foreground/10 bg-white",
                    status === "connected" && "text-green-700",
                    status === "connecting" && "text-yellow-700"
                  )}
                >
                  {status === "connected" && "● Connected"}
                  {status === "connecting" && "⏳ Connecting"}
                  {status === "disconnected" && "○ Disconnected"}
                </Badge>
              </div>
            </div>

            <Button variant="outline" onClick={logout} className="rounded-2xl">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </CardHeader>
        </Card>

        {/* Voice */}
        <Card className="border-foreground/10 bg-white/70 shadow-xl backdrop-blur">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Waves className="h-5 w-5" style={{ color: ACCENT }} />
                <CardTitle className="text-sm">Voice</CardTitle>
              </div>

              <div className="flex items-center gap-2">
                {status === "disconnected" && (
                  <Button
                    onClick={connectToRoom}
                    className="rounded-2xl px-6"
                    style={{ backgroundColor: ACCENT, color: "#0b1b0a" }}
                  >
                    In Call
                  </Button>
                )}

                {status === "connecting" && (
                  <Button disabled className="rounded-2xl px-6">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </Button>
                )}

                {status === "connected" && (
                  <Button
                    onClick={endCall}
                    className="rounded-2xl px-6"
                    variant="destructive"
                  >
                    End Call
                  </Button>
                )}
              </div>

            </div>
          </CardHeader>


          <CardContent className="pb-7">
            {/* {error && (
              <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-700">
                ⚠️ {error}
              </div>
            )} */}

            <div className="rounded-2xl border border-foreground/10 bg-white/70 p-6 text-center shadow-sm">
              <ActiveSpeakerDisplay
                status={status}
                agentSpeaking={agentSpeaking}
                userSpeaking={userSpeaking}
              />

              <p className="mt-4 text-sm font-semibold text-foreground">
                {status === "connected"
                  ? agentSpeaking
                    ? "Receptionist is speaking..."
                    : userSpeaking
                      ? "You are speaking..."
                      : "Listening..."
                  : status === "connecting"
                    ? "Connecting..."
                    : "Disconnected"}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Speak normally — the assistant will respond automatically.
              </p>
            </div>

            <audio ref={audioElRef} autoPlay />
          </CardContent>
        </Card>

        {/* Chat (fixed height, always visible) */}
        <Card className="border-foreground/10 bg-white/70 shadow-xl backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="h-5 w-5" style={{ color: ACCENT }} />
              Conversation
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="h-[520px] overflow-auto rounded-2xl border border-foreground/10 bg-white p-4">
              <div className="space-y-3">
                {messages.map((m) => (
                  <ChatBubble key={m.id} m={m} />
                ))}
                <div ref={endRef} />
              </div>
            </div>

            <Separator className="my-4 bg-foreground/10" />

            <form onSubmit={sendChatMessage} className="flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type name, phone, date, issue..."
                className="h-12 rounded-2xl border-foreground/10 bg-white/80"
                disabled={status !== "connected"}
              />
              <Button
                type="submit"
                disabled={status !== "connected" || !chatInput.trim()}
                className="h-12 rounded-2xl px-6"
                style={{ backgroundColor: ACCENT, color: "#0b1b0a" }}
              >
                Send
              </Button>
            </form>
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

          @keyframes floaty {
            0% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-4px);
            }
            100% {
              transform: translateY(0px);
            }
          }
        `}</style>
      </div>
    </div>
  );
}

function ActiveSpeakerDisplay({
  status,
  agentSpeaking,
  userSpeaking,
}: {
  status: "disconnected" | "connecting" | "connected";
  agentSpeaking: boolean;
  userSpeaking: boolean;
}) {
  const showAgent = status === "connected" && agentSpeaking;
  const showUser = status === "connected" && !agentSpeaking && userSpeaking;

  return (
    <div className="flex justify-center">
      <div
        className={cn(
          "relative grid h-24 w-24 place-items-center rounded-full border",
          "shadow-[0_20px_50px_rgba(2,6,23,0.10)]"
        )}
        style={{
          borderColor: "rgba(139,195,74,0.35)",
          background:
            "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95), rgba(139,195,74,0.25))",
          animation:
            status === "connected" && (showAgent || showUser)
              ? "floaty 1.2s ease-in-out infinite"
              : undefined,
        }}
      >
        {(showAgent || showUser) && (
          <div
            aria-hidden
            className="absolute inset-0 rounded-full"
            style={{
              boxShadow: "0 0 0 0 rgba(139,195,74,0.25)",
              animation: "pulseRing 1.6s ease-out infinite",
            }}
          />
        )}

        {status === "connecting" && (
          <Loader2 className="h-10 w-10 animate-spin" style={{ color: "#0b1b0a" }} />
        )}

        {status === "disconnected" && (
          <Mic className="h-10 w-10" style={{ color: "#0b1b0a" }} />
        )}

        {showAgent && <Bot className="h-10 w-10" style={{ color: "#0b1b0a" }} />}
        {showUser && <User className="h-10 w-10" style={{ color: "#0b1b0a" }} />}

        {status === "connected" && !showAgent && !showUser && (
          <Waves className="h-10 w-10" style={{ color: "#0b1b0a" }} />
        )}
      </div>
    </div>
  );
}

function ChatBubble({ m }: { m: ChatMsg }) {
  const isUser = m.type === "user";
  const isAgent = m.type === "agent";
  const isSystem = m.type === "system";
  const isError = m.type === "error";

  if (isSystem || isError) {
    return (
      <div
        className={cn(
          "mx-auto max-w-[92%] rounded-2xl border px-4 py-3 text-xs",
          isSystem && "border-foreground/10 bg-muted/40 text-muted-foreground",
          isError && "border-red-500/20 bg-red-500/10 text-red-700"
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="font-medium">{m.text}</div>
          <div className="shrink-0 opacity-60">{formatTime(m.timestamp)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl border px-4 py-3 text-sm shadow-sm",
          isUser && "bg-white border-foreground/10",
          isAgent && "bg-white/70 border-foreground/10"
        )}
        style={
          isAgent
            ? {
              background:
                "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95), rgba(139,195,74,0.10))",
              borderColor: "rgba(139,195,74,0.20)",
            }
            : undefined
        }
      >
        <div className="mb-1 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            {isAgent ? (
              <>
                <Bot className="h-4 w-4" style={{ color: ACCENT }} />
                Receptionist
              </>
            ) : (
              <>
                <User className="h-4 w-4" />
                You
              </>
            )}
          </div>

          <div className="text-[11px] text-muted-foreground opacity-70">
            {formatTime(m.timestamp)}
          </div>
        </div>

        <div className="leading-relaxed text-foreground">
          {m.text}
          {m.streaming && <span className="ml-1 opacity-70">▊</span>}
        </div>
      </div>
    </div>
  );
}
