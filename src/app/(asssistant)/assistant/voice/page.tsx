"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Room, RoomEvent } from "livekit-client";
import { Mic, PhoneOff, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const ACCENT = "#8bc34a";

/** Character-by-character streaming (ChatGPT feel) */
async function streamText(fullText: string, onUpdate: (t: string) => void) {
  if (!fullText) return;

  let current = "";
  for (let i = 0; i < fullText.length; i++) {
    current += fullText[i];
    onUpdate(current);
    await new Promise((r) => setTimeout(r, 10));
  }
}

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

  const sessionId = searchParams.get("session_id");

  // localStorage contains raw session object
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
      } catch {}
      roomRef.current = null;
    }

    setStatus("disconnected");
    setAgentSpeaking(false);
    setUserSpeaking(false);

    if (!silent) setError("");
  }, []);

  // ✅ IMPORTANT: silent cleanup (prevents console spam in dev mode)
  React.useEffect(() => {
    return () => disconnect(true);
  }, [disconnect]);

  const connectToRoom = React.useCallback(async () => {
    if (!sessionData?.livekit_url || !sessionData?.access_token) {
      setError(
        "Missing livekit_url or access_token. Check localStorage voice_session."
      );
      setStatus("disconnected");
      return;
    }

    setStatus("connecting");
    setError("");
    setMessages([
      {
        id: `sys-${Date.now()}`,
        type: "system",
        text: "Connecting to receptionist...",
        timestamp: new Date(),
      },
    ]);

    try {
      const room = new Room();
      roomRef.current = room;

      // Attach agent audio
      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === "audio") {
          const el = audioElRef.current;
          if (el) track.attach(el);

          setMessages((prev) => [
            ...prev,
            {
              id: `sys-${Date.now()}`,
              type: "system",
              text: "Receptionist connected!",
              timestamp: new Date(),
            },
          ]);
        }
      });

      // Speaking indicator
      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        const agentIsSpeaking = speakers.some((s) =>
          s.identity?.includes("agent")
        );

        const userIsSpeaking = speakers.some(
          (s) => s.identity === sessionData.participant_identity
        );

        setAgentSpeaking(agentIsSpeaking);
        setUserSpeaking(userIsSpeaking);
      });

      // Data messages (agent + user transcription)
      room.on(RoomEvent.DataReceived, (payload, participant) => {
        try {
          const decoder = new TextDecoder();
          const msg = decoder.decode(payload);
          const jsonData = JSON.parse(msg);

          if (jsonData.type === "transcription" || jsonData.text) {
            const isAgent = participant?.identity?.includes("agent");
            const text = jsonData.text || "";

            // ✅ ALWAYS stream agent messages
            if (isAgent) {
              const messageId = `msg-${Date.now()}`;

              setMessages((prev) => [
                ...prev,
                {
                  id: messageId,
                  type: "agent",
                  text: "",
                  speaker: "Receptionist",
                  timestamp: new Date(),
                  streaming: true,
                },
              ]);

              streamText(text, (currentText) => {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === messageId ? { ...m, text: currentText } : m
                  )
                );
              }).then(() => {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === messageId ? { ...m, streaming: false } : m
                  )
                );
              });

              return;
            }

            // user transcription (normal)
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
          }
        } catch (e) {
          console.error("DataReceived parse error:", e);
        }
      });

      // Connect
      await room.connect(sessionData.livekit_url, sessionData.access_token);

      // Enable microphone
      try {
        await room.localParticipant.setMicrophoneEnabled(true);
      } catch (micError) {
        console.error("Microphone error:", micError);
        setError("Microphone permission denied. Please allow mic access.");
      }

      setStatus("connected");
      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          type: "system",
          text: "Connected! You can now speak or type messages.",
          timestamp: new Date(),
        },
      ]);
    } catch (err: any) {
      console.error("Room connection error:", err);
      setError(err?.message || "Failed to connect room");
      setStatus("disconnected");

      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          type: "error",
          text: `Connection error: ${err?.message || "Unknown error"}`,
          timestamp: new Date(),
        },
      ]);
    }
  }, [sessionData]);

  // Auto connect
  React.useEffect(() => {
    if (!sessionId) return;
    if (!sessionData) return;

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

      const messageData = {
        type: "chat",
        text,
        message: text,
        timestamp: new Date().toISOString(),
        sender: "user",
      };

      await roomRef.current.localParticipant.publishData(
        encoder.encode(JSON.stringify(messageData)),
        { reliable: true, destinationIdentities: [] }
      );
    } catch (err: any) {
      console.error("Send message error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          type: "error",
          text: `Failed to send: ${err?.message || "Unknown error"}`,
          timestamp: new Date(),
        },
      ]);
    }

    setChatInput("");
  };

  const logout = () => {
    disconnect(true);
    localStorage.removeItem("access_token");
    localStorage.removeItem("voice_session");
    router.replace("/login");
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-white p-4 md:p-8">
      <div className="mx-auto grid w-full max-w-6xl gap-6">
        <Card className="border-foreground/10 bg-white/70 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              🦷 SmileCare • Virtual Receptionist
            </CardTitle>

            <Button variant="outline" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </CardHeader>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Voice Panel */}
          <Card className="border-foreground/10 bg-white/70 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">🎤 Voice</CardTitle>

              <div
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium",
                  status === "connected" && "bg-green-500/10 text-green-700",
                  status === "connecting" && "bg-yellow-500/10 text-yellow-700",
                  status === "disconnected" && "bg-muted text-muted-foreground"
                )}
              >
                {status === "connected" && "● Connected"}
                {status === "connecting" && "⏳ Connecting"}
                {status === "disconnected" && "○ Disconnected"}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {status === "disconnected" && (
                <div className="rounded-2xl border border-foreground/10 bg-white p-6 text-center">
                  <div className="text-5xl">👩‍⚕️</div>

                  <Button
                    onClick={connectToRoom}
                    className="mt-4 rounded-2xl"
                    style={{ backgroundColor: ACCENT, color: "#0b1b0a" }}
                  >
                    <Mic className="mr-2 h-4 w-4" />
                    Connect
                  </Button>
                </div>
              )}

              {status === "connected" && (
                <div className="rounded-2xl border border-foreground/10 bg-white p-6 text-center">
                  <div className="flex items-center justify-center gap-10">
                    <div>
                      <div
                        className={cn(
                          "grid h-20 w-20 place-items-center rounded-full border text-4xl",
                          agentSpeaking && "animate-pulse"
                        )}
                      >
                        👩‍⚕️
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Receptionist
                      </p>
                    </div>

                    <div>
                      <div
                        className={cn(
                          "grid h-20 w-20 place-items-center rounded-full border text-4xl",
                          userSpeaking && "animate-pulse"
                        )}
                      >
                        👤
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">You</p>
                    </div>
                  </div>

                  <Button
                    onClick={() => {
                      disconnect(true);
                      router.push("/dashboard");
                    }}
                    variant="outline"
                    className="mt-5 rounded-2xl"
                  >
                    <PhoneOff className="mr-2 h-4 w-4" />
                    End Call
                  </Button>
                </div>
              )}

              {error && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-700">
                  ⚠️ {error}
                </div>
              )}

              <audio ref={audioElRef} autoPlay />
            </CardContent>
          </Card>

          {/* Chat Panel */}
          <Card className="border-foreground/10 bg-white/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-base">💬 Conversation</CardTitle>
            </CardHeader>

            <CardContent className="flex h-[520px] flex-col">
              <div className="flex-1 space-y-3 overflow-auto rounded-2xl border border-foreground/10 bg-white p-4">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-2xl border px-4 py-3 text-sm"
                  >
                    {m.speaker && (
                      <div className="mb-1 text-xs font-semibold text-muted-foreground">
                        {m.speaker}
                      </div>
                    )}
                    <div>
                      {m.text}
                      {m.streaming && <span className="ml-1">▊</span>}
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>

              <form onSubmit={sendChatMessage} className="mt-4 flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type email, phone, name, etc..."
                  className="h-11 rounded-2xl border-foreground/10 bg-white"
                  disabled={status !== "connected"}
                />
                <Button
                  type="submit"
                  disabled={status !== "connected" || !chatInput.trim()}
                  className="h-11 rounded-2xl"
                  style={{ backgroundColor: ACCENT, color: "#0b1b0a" }}
                >
                  Send
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
