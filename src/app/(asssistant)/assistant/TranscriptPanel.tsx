"use client";

import * as React from "react";
import { useRoomContext } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TranscriptMsg = {
  role: "user" | "assistant";
  text: string;
};

export default function TranscriptPanel() {
  const room = useRoomContext();
  const [messages, setMessages] = React.useState<TranscriptMsg[]>([]);

  React.useEffect(() => {
    const onData = (payload: Uint8Array) => {
      try {
        const decoded = new TextDecoder().decode(payload);
        const json = JSON.parse(decoded);

        if (json.type !== "transcript") return;

        setMessages((prev) => [
          ...prev,
          { role: json.role, text: json.text },
        ]);
      } catch (e) {
        console.log("Bad data message", e);
      }
    };

    room.on(RoomEvent.DataReceived, onData);

    return () => {
      room.off(RoomEvent.DataReceived, onData);
    };
  }, [room]);

  return (
    <Card className="border-foreground/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Conversation</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="h-[55vh] space-y-3 overflow-y-auto rounded-xl border border-foreground/10 bg-white p-4">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Start speaking… transcript will appear here.
            </p>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                  m.role === "assistant"
                    ? "bg-muted text-foreground"
                    : "ml-auto bg-[#8bc34a] text-black"
                }`}
              >
                {m.text}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
