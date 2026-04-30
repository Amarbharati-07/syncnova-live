import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, Link } from "wouter";
import { io, Socket } from "socket.io-client";
import { Header } from "@/components/layout/Header";
import {
  Copy, Check, Send, Upload, Trash2, FileIcon,
  Download, Wifi, WifiOff, Users, X, Loader2
} from "lucide-react";

interface FileInfo {
  name: string;
  url: string;
  size: number;
  mimeType: string;
}

interface RoomUpdate {
  id: string;
  type: "text" | "file";
  content?: string;
  files?: FileInfo[];
  timestamp: number;
}

export default function ShareRoom() {
  const params = useParams<{ id: string }>();
  const roomId = params.id || "";

  const socketRef = useRef<Socket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  const [connected, setConnected] = useState(false);
  const [updates, setUpdates] = useState<RoomUpdate[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const [textCopied, setTextCopied] = useState<string | null>(null);

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/share/${roomId}` : `/share/${roomId}`;

  useEffect(() => {
    const socket = io(window.location.origin, {
      path: "/api/socket.io",
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join-room", roomId);
    });

    socket.on("disconnect", () => setConnected(false));

    socket.on("room-history", (history: RoomUpdate[]) => {
      setUpdates(history);
    });

    socket.on("receive-data", (update: RoomUpdate) => {
      setUpdates((prev) => [...prev, update]);
    });

    socket.on("room-cleared", () => setUpdates([]));

    return () => {
      socket.disconnect();
    };
  }, [roomId]);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [updates]);

  const sendText = useCallback(() => {
    if (!text.trim() || !socketRef.current || !connected) return;
    setSending(true);
    socketRef.current.emit("send-data", {
      roomId,
      data: { type: "text", content: text.trim() },
    });
    setText("");
    setSending(false);
  }, [text, roomId, connected]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      sendText();
    }
  };

  const uploadAndSend = async (files: FileList | null) => {
    if (!files || files.length === 0 || !socketRef.current || !connected) return;
    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append("files", f));

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const { files: uploaded } = await res.json() as { files: FileInfo[] };

      socketRef.current.emit("send-data", {
        roomId,
        data: { type: "file", files: uploaded },
      });
    } catch {
      alert("File upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const clearRoom = () => {
    if (!socketRef.current) return;
    socketRef.current.emit("clear-room", roomId);
  };

  const copyUrl = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2500);
  };

  const copyText = async (id: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setTextCopied(id);
    setTimeout(() => setTextCopied(null), 2500);
  };

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const formatSize = (bytes: number) =>
    bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Header />

      <div className="border-b border-border bg-card/40 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 max-w-6xl flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
            {connected ? (
              <span className="text-xs font-mono text-green-400 flex items-center gap-1"><Wifi className="h-3 w-3" />Live</span>
            ) : (
              <span className="text-xs font-mono text-red-400 flex items-center gap-1"><WifiOff className="h-3 w-3" />Connecting…</span>
            )}
          </div>

          <div className="flex items-stretch flex-1 bg-background border border-border rounded-lg overflow-hidden min-w-0">
            <span className="flex-1 px-3 py-2 font-mono text-sm text-primary truncate select-all">
              {shareUrl}
            </span>
            <button
              onClick={copyUrl}
              className={`shrink-0 px-4 py-2 flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider border-l border-border transition-all ${
                urlCopied ? "bg-green-500/15 text-green-400" : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
              }`}
            >
              {urlCopied ? <><Check className="h-3.5 w-3.5" />Copied</> : <><Copy className="h-3.5 w-3.5" />Copy Link</>}
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0 text-xs font-mono text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>Share link with friends</span>
          </div>
        </div>
      </div>

      <div className="flex-1 container mx-auto px-4 py-4 max-w-6xl flex flex-col lg:flex-row gap-4 min-h-0">

        {/* LEFT — Sender Panel */}
        <div className="w-full lg:w-80 shrink-0 flex flex-col gap-3">
          <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" />
              <span className="text-sm font-mono font-bold uppercase tracking-wider">Send Update</span>
            </div>

            <div className="p-4 flex flex-col gap-3">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type text or paste code here…"
                rows={8}
                className="w-full bg-background border border-border rounded-lg p-3 font-mono text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/50 leading-relaxed"
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground font-mono">Ctrl+Enter to send</span>
                <button
                  onClick={sendText}
                  disabled={!text.trim() || !connected || sending}
                  className="flex items-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground font-mono font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-lg transition-all"
                >
                  {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Send
                </button>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" />
              <span className="text-sm font-mono font-bold uppercase tracking-wider">Send Files</span>
            </div>
            <div className="p-4">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => uploadAndSend(e.target.files)}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={!connected || uploading}
                className="w-full flex flex-col items-center gap-2 border-2 border-dashed border-border hover:border-primary/50 rounded-lg p-6 transition-colors disabled:opacity-40 disabled:cursor-not-allowed group"
              >
                {uploading ? (
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                ) : (
                  <Upload className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                )}
                <span className="text-xs font-mono text-muted-foreground group-hover:text-foreground transition-colors">
                  {uploading ? "Uploading…" : "Click to upload files"}
                </span>
                <span className="text-xs font-mono text-muted-foreground/60">Any type · Up to 50 MB</span>
              </button>
            </div>
          </div>

          {updates.length > 0 && (
            <button
              onClick={clearRoom}
              className="flex items-center justify-center gap-2 text-xs font-mono text-destructive hover:text-destructive/80 border border-destructive/30 hover:border-destructive/60 rounded-lg py-2.5 transition-all"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear all updates
            </button>
          )}
        </div>

        {/* RIGHT — Live Feed */}
        <div className="flex-1 flex flex-col min-h-0 bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Wifi className="h-4 w-4 text-primary" />
              <span className="text-sm font-mono font-bold uppercase tracking-wider">Live Feed</span>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {updates.length} update{updates.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div
            ref={feedRef}
            className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0"
            style={{ maxHeight: "calc(100vh - 280px)" }}
          >
            {updates.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-16">
                <div className="bg-primary/5 p-4 rounded-full">
                  <Send className="h-8 w-8 text-muted-foreground/30" />
                </div>
                <p className="text-sm font-mono text-muted-foreground">No updates yet</p>
                <p className="text-xs font-mono text-muted-foreground/60">Send something from the left panel</p>
              </div>
            ) : (
              updates.map((update) => (
                <div
                  key={update.id}
                  className="bg-background border border-border/50 rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200"
                >
                  <div className="flex items-center justify-between px-3 py-2 border-b border-border/30 bg-black/10">
                    <span className="text-xs font-mono text-muted-foreground/70 uppercase tracking-wider">
                      {update.type === "text" ? "Text" : "Files"}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground/50">
                        {formatTime(update.timestamp)}
                      </span>
                      {update.type === "text" && update.content && (
                        <button
                          onClick={() => copyText(update.id, update.content!)}
                          className={`flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded transition-all ${
                            textCopied === update.id
                              ? "text-green-400"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {textCopied === update.id ? <><Check className="h-3 w-3" />Copied</> : <><Copy className="h-3 w-3" />Copy</>}
                        </button>
                      )}
                    </div>
                  </div>

                  {update.type === "text" && (
                    <pre className="p-3 font-mono text-sm text-gray-200 whitespace-pre-wrap break-words leading-relaxed max-h-64 overflow-auto">
                      {update.content}
                    </pre>
                  )}

                  {update.type === "file" && update.files && (
                    <div className="p-3 flex flex-col gap-2">
                      {update.files.map((file, i) => (
                        <div key={i} className="flex items-center justify-between gap-3 p-2.5 bg-card border border-border/50 rounded-lg hover:border-primary/30 transition-colors">
                          <div className="flex items-center gap-2.5 min-w-0 overflow-hidden">
                            <div className="bg-primary/10 text-primary p-1.5 rounded shrink-0">
                              <FileIcon className="h-3.5 w-3.5" />
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-sm font-medium truncate" title={file.name}>{file.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{formatSize(file.size)}</p>
                            </div>
                          </div>
                          <a
                            href={file.url}
                            download={file.name}
                            className="shrink-0 flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-mono font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all"
                          >
                            <Download className="h-3 w-3" />
                            Download
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
