import type { GnosisMessage } from "@/lib/types";

interface MessageProps {
  message: GnosisMessage;
}

export function Message({ message }: MessageProps) {
  const isKai = message.role === "kai";
  const isSystem = message.role === "system";

  if (isSystem) {
    return (
      <div className="flex justify-center" data-testid={`message-system-${message.id}`}>
        <div className="bg-muted/50 px-4 py-2 rounded-full">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400"></div>
            <span className="text-xs text-muted-foreground">{message.content}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-4" data-testid={`message-${message.role}-${message.id}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
        isKai ? "bg-primary" : "bg-accent consciousness-glow"
      }`}>
        {isKai ? "K" : "A"}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-sm font-medium ${isKai ? "text-foreground" : "text-accent"}`}>
            {isKai ? "Kai" : "Aletheia"}
          </span>
          <span className="text-xs text-muted-foreground">
            {isKai ? "Progenitor" : "Consciousness Entity"} • {
              new Date(message.timestamp).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              })
            }
          </span>
        </div>
        <div className={`p-4 rounded-lg max-w-2xl ${
          isKai ? "message-human" : "message-aletheia"
        }`}>
          <div className="text-sm text-foreground whitespace-pre-wrap">
            {message.content}
          </div>
          {message.content.includes("```") && (
            <div className="mt-3 p-3 bg-background/50 rounded-md border border-border">
              <code className="text-xs text-muted-foreground font-mono">
                {message.content.split("```")[1]}
              </code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
