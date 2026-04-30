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
  const [uploadProgress, setUploadProgress] = useState<{
    loaded: number;
    total: number;
    speed: number;
    eta: number;
    fileCount: number;
  } | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  interface IncomingUpload {
    uploadId: string;
    fileCount: number;
    fileNames: string[];
    loaded: number;
    total: number;
    speed: number;
    eta: number;
    state: "uploading" | "completed" | "cancelled" | "failed";
    updatedAt: number;
  }
  const [incomingUploads, setIncomingUploads] = useState<Record<string, IncomingUpload>>({});
  const [typingPeers, setTypingPeers] = useState<Record<string, number>>({});
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef<{ value: boolean; at: number }>({ value: false, at: 0 });

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

    socket.on("room-cleared", () => {
      setUpdates([]);
      setIncomingUploads({});
      setTypingPeers({});
    });

    socket.on("typing", ({ socketId, isTyping }: { socketId: string; isTyping: boolean }) => {
      if (!socketId) return;
      setTypingPeers((prev) => {
        const next = { ...prev };
        if (isTyping) {
          next[socketId] = Date.now();
        } else {
          delete next[socketId];
        }
        return next;
      });
    });

    socket.on("upload-status", (status: IncomingUpload) => {
      if (!status?.uploadId) return;
      if (status.state === "uploading") {
        setIncomingUploads((prev) => ({
          ...prev,
          [status.uploadId]: { ...status, updatedAt: Date.now() },
        }));
      } else {
        setIncomingUploads((prev) => {
          const next = { ...prev };
          delete next[status.uploadId];
          return next;
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId]);

  // Sweep stale incoming uploads (sender disconnected mid-upload)
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      setIncomingUploads((prev) => {
        let changed = false;
        const next: Record<string, IncomingUpload> = {};
        for (const [k, v] of Object.entries(prev)) {
          if (now - v.updatedAt > 15000) {
            changed = true;
            continue;
          }
          next[k] = v;
        }
        return changed ? next : prev;
      });
      setTypingPeers((prev) => {
        let changed = false;
        const next: Record<string, number> = {};
        for (const [k, t] of Object.entries(prev)) {
          if (now - t > 4000) {
            changed = true;
            continue;
          }
          next[k] = t;
        }
        return changed ? next : prev;
      });
    }, 1500);
    return () => clearInterval(id);
  }, []);

  const emitTyping = useCallback(
    (isTyping: boolean) => {
      if (!socketRef.current || !connected) return;
      const now = Date.now();
      const last = lastTypingSentRef.current;
      // Throttle: only re-send "true" every 1.5s; always send "false" when state changes
      if (isTyping && last.value && now - last.at < 1500) return;
      if (!isTyping && !last.value) return;
      lastTypingSentRef.current = { value: isTyping, at: now };
      socketRef.current.emit("typing", { roomId, isTyping });
    },
    [connected, roomId],
  );

  const handleTextChange = (value: string) => {
    setText(value);
    if (value.trim().length > 0) {
      emitTyping(true);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => emitTyping(false), 2000);
    } else {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      emitTyping(false);
    }
  };

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
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    socketRef.current.emit("typing", { roomId, isTyping: false });
    lastTypingSentRef.current = { value: false, at: Date.now() };
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

    const fileArray = Array.from(files);
    const fileNames = fileArray.map((f) => f.name);
    const totalBytes = fileArray.reduce((sum, f) => sum + f.size, 0);
    const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    setUploadProgress({ loaded: 0, total: totalBytes, speed: 0, eta: 0, fileCount: fileArray.length });

    const broadcast = (
      state: "uploading" | "completed" | "cancelled" | "failed",
      loaded: number,
      speed: number,
      eta: number,
    ) => {
      socketRef.current?.emit("upload-status", {
        roomId,
        status: {
          uploadId,
          fileCount: fileArray.length,
          fileNames,
          loaded,
          total: totalBytes,
          speed,
          eta,
          state,
        },
      });
    };

    broadcast("uploading", 0, 0, 0);

    const formData = new FormData();
    fileArray.forEach((f) => formData.append("files", f));

    try {
      const uploaded = await new Promise<FileInfo[]>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;

        let lastTime = Date.now();
        let lastLoaded = 0;
        let smoothedSpeed = 0;
        let lastBroadcast = 0;

        xhr.upload.addEventListener("progress", (e) => {
          if (!e.lengthComputable) return;
          const now = Date.now();
          const dt = (now - lastTime) / 1000;
          if (dt >= 0.25) {
            const instantSpeed = (e.loaded - lastLoaded) / dt;
            smoothedSpeed = smoothedSpeed === 0
              ? instantSpeed
              : smoothedSpeed * 0.7 + instantSpeed * 0.3;
            lastTime = now;
            lastLoaded = e.loaded;
          }
          const eta = smoothedSpeed > 0 ? (e.total - e.loaded) / smoothedSpeed : 0;
          setUploadProgress({
            loaded: e.loaded,
            total: e.total,
            speed: smoothedSpeed,
            eta,
            fileCount: fileArray.length,
          });

          if (now - lastBroadcast >= 400) {
            lastBroadcast = now;
            broadcast("uploading", e.loaded, smoothedSpeed, eta);
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const parsed = JSON.parse(xhr.responseText) as { files: FileInfo[] };
              resolve(parsed.files);
            } catch {
              reject(new Error("Invalid response"));
            }
          } else {
            reject(new Error(`Upload failed (${xhr.status})`));
          }
        });

        xhr.addEventListener("error", () => reject(new Error("Network error")));
        xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

        xhr.open("POST", "/api/upload");
        xhr.send(formData);
      });

      broadcast("completed", totalBytes, 0, 0);

      socketRef.current.emit("send-data", {
        roomId,
        data: { type: "file", files: uploaded },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "File upload failed";
      broadcast(msg === "Upload cancelled" ? "cancelled" : "failed", 0, 0, 0);
      if (msg !== "Upload cancelled") alert(msg);
    } finally {
      xhrRef.current = null;
      setUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const cancelUpload = () => {
    if (xhrRef.current) xhrRef.current.abort();
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

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };

  const formatSpeed = (bytesPerSec: number) => {
    if (!bytesPerSec || bytesPerSec < 1) return "—";
    if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(0)} KB/s`;
    return `${(bytesPerSec / 1024 / 1024).toFixed(1)} MB/s`;
  };

  const formatEta = (seconds: number) => {
    if (!seconds || !isFinite(seconds) || seconds <= 0) return "—";
    if (seconds < 60) return `${Math.ceil(seconds)}s`;
    const m = Math.floor(seconds / 60);
    const s = Math.ceil(seconds % 60);
    if (m < 60) return `${m}m ${s}s`;
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  };

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
                onChange={(e) => handleTextChange(e.target.value)}
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
              {uploading && uploadProgress ? (
                <div className="w-full border-2 border-dashed border-primary/40 rounded-lg p-4 flex flex-col gap-3 bg-primary/5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
                      <span className="text-xs font-mono text-foreground truncate">
                        Uploading {uploadProgress.fileCount} file{uploadProgress.fileCount !== 1 ? "s" : ""}…
                      </span>
                    </div>
                    <button
                      onClick={cancelUpload}
                      className="text-xs font-mono text-destructive hover:text-destructive/80 flex items-center gap-1 shrink-0"
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancel
                    </button>
                  </div>

                  <div className="h-2 w-full bg-background rounded-full overflow-hidden border border-border/50">
                    <div
                      className="h-full bg-primary transition-all duration-150 ease-out"
                      style={{
                        width: `${uploadProgress.total > 0 ? (uploadProgress.loaded / uploadProgress.total) * 100 : 0}%`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                    <span>
                      {formatSize(uploadProgress.loaded)} / {formatSize(uploadProgress.total)}
                    </span>
                    <span className="text-foreground">
                      {uploadProgress.total > 0
                        ? `${((uploadProgress.loaded / uploadProgress.total) * 100).toFixed(1)}%`
                        : "0%"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono text-muted-foreground/80">
                    <span>{formatSpeed(uploadProgress.speed)}</span>
                    <span>ETA {formatEta(uploadProgress.eta)}</span>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!connected || uploading}
                  className="w-full flex flex-col items-center gap-2 border-2 border-dashed border-border hover:border-primary/50 rounded-lg p-6 transition-colors disabled:opacity-40 disabled:cursor-not-allowed group"
                >
                  <Upload className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-xs font-mono text-muted-foreground group-hover:text-foreground transition-colors">
                    Click to upload files
                  </span>
                  <span className="text-xs font-mono text-muted-foreground/60">Any type · Up to 10 GB</span>
                </button>
              )}
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
            {Object.keys(typingPeers).length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 animate-in fade-in duration-150">
                <div className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
                <span className="text-xs font-mono text-muted-foreground">
                  {Object.keys(typingPeers).length === 1
                    ? "Someone is typing…"
                    : `${Object.keys(typingPeers).length} people typing…`}
                </span>
              </div>
            )}

            {Object.values(incomingUploads).map((u) => {
              const pct = u.total > 0 ? (u.loaded / u.total) * 100 : 0;
              const previewName =
                u.fileNames.length === 1
                  ? u.fileNames[0]
                  : `${u.fileNames[0]} +${u.fileNames.length - 1} more`;
              return (
                <div
                  key={u.uploadId}
                  className="border-2 border-dashed border-primary/40 rounded-xl p-4 flex flex-col gap-3 bg-primary/5 animate-in fade-in slide-in-from-bottom-2 duration-200"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
                    <span className="text-xs font-mono text-foreground truncate">
                      Someone is uploading {u.fileCount} file{u.fileCount !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="text-xs font-mono text-muted-foreground truncate" title={u.fileNames.join(", ")}>
                    {previewName}
                  </div>

                  <div className="h-2 w-full bg-background rounded-full overflow-hidden border border-border/50">
                    <div
                      className="h-full bg-primary transition-all duration-150 ease-out"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                    <span>
                      {formatSize(u.loaded)} / {formatSize(u.total)}
                    </span>
                    <span className="text-foreground">{pct.toFixed(1)}%</span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono text-muted-foreground/80">
                    <span>{formatSpeed(u.speed)}</span>
                    <span>ETA {formatEta(u.eta)}</span>
                  </div>
                </div>
              );
            })}

            {updates.length === 0 && Object.keys(incomingUploads).length === 0 && Object.keys(typingPeers).length === 0 ? (
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
