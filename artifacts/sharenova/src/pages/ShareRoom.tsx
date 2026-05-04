import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "wouter";
import { io, Socket } from "socket.io-client";
import {
  Upload, X, Download, Loader2, Copy, Check, Users,
  WifiOff, Wifi, Moon, Sun, Trash2, FileText, ChevronRight,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

interface FileInfo { name: string; url: string; size: number; mimeType: string; }
interface RoomUpdate { id: string; type: "text" | "file"; content?: string; files?: FileInfo[]; timestamp: number; }
interface IncomingUpload {
  uploadId: string; fileCount: number; fileNames: string[];
  loaded: number; total: number; speed: number; eta: number;
  state: "uploading" | "completed" | "cancelled" | "failed"; updatedAt: number;
}

function formatSize(b: number) {
  if (b >= 1024 ** 3) return `${(b / 1024 ** 3).toFixed(1)} GB`;
  if (b >= 1024 ** 2) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  if (b >= 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${b} B`;
}
function formatSpeed(bps: number) {
  if (bps <= 0) return "—";
  if (bps >= 1024 ** 2) return `${(bps / 1024 ** 2).toFixed(1)} MB/s`;
  return `${(bps / 1024).toFixed(1)} KB/s`;
}
function formatEta(s: number) {
  if (s <= 0 || !isFinite(s)) return "—";
  if (s >= 3600) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  if (s >= 60) return `${Math.floor(s / 60)}m ${Math.floor(s % 60)}s`;
  return `${Math.floor(s)}s`;
}
function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ShareRoom() {
  const params = useParams<{ id: string }>();
  const roomId = params.id ?? "";
  const { theme, toggle } = useTheme();

  const socketRef = useRef<Socket | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);

  const [connected, setConnected] = useState(false);
  const [userCount, setUserCount] = useState(1);
  const [text, setText] = useState("");
  const [syncState, setSyncState] = useState<"idle" | "syncing" | "synced">("idle");
  const [copied, setCopied] = useState(false);
  const [fileUpdates, setFileUpdates] = useState<RoomUpdate[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<null | { loaded: number; total: number; speed: number; eta: number; fileCount: number }>(null);
  const [incomingUploads, setIncomingUploads] = useState<Record<string, IncomingUpload>>({});
  const [typingPeers, setTypingPeers] = useState<Record<string, number>>({});
  const [dragOver, setDragOver] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Refs for sync logic
  const suppressSyncRef = useRef(false);
  const textSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef({ value: false, at: 0 });

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/share/${roomId}`
    : `/share/${roomId}`;

  // ── Socket setup ──────────────────────────────────────────────────────────
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

    socket.on("user-count", ({ count }: { count: number }) => setUserCount(count));

    // Receive current text state when joining
    socket.on("text-state", ({ text: t }: { text: string }) => {
      suppressSyncRef.current = true;
      setText(t);
      setTimeout(() => { suppressSyncRef.current = false; }, 50);
    });

    // Receive live text updates from peers
    socket.on("text-sync", ({ text: t }: { text: string }) => {
      suppressSyncRef.current = true;
      setText(t);
      setSyncState("synced");
      setTimeout(() => { suppressSyncRef.current = false; }, 50);
    });

    // File history on join
    socket.on("room-history", (history: RoomUpdate[]) => {
      setFileUpdates(history.filter((u) => u.type === "file"));
    });

    // New file from anyone
    socket.on("receive-data", (update: RoomUpdate) => {
      if (update.type === "file") {
        setFileUpdates((prev) => [...prev, update]);
      }
    });

    socket.on("room-cleared", () => {
      setFileUpdates([]);
      setIncomingUploads({});
      setText("");
      setSyncState("idle");
    });

    socket.on("typing", ({ socketId, isTyping }: { socketId: string; isTyping: boolean }) => {
      if (!socketId) return;
      setTypingPeers((prev) => {
        const next = { ...prev };
        if (isTyping) next[socketId] = Date.now();
        else delete next[socketId];
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

    return () => { socket.disconnect(); };
  }, [roomId]);

  // Stale sweep
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      setIncomingUploads((prev) => {
        const next: Record<string, IncomingUpload> = {};
        let changed = false;
        for (const [k, v] of Object.entries(prev)) {
          if (now - v.updatedAt > 15000) { changed = true; continue; }
          next[k] = v;
        }
        return changed ? next : prev;
      });
      setTypingPeers((prev) => {
        const next: Record<string, number> = {};
        let changed = false;
        for (const [k, t] of Object.entries(prev)) {
          if (now - t > 4000) { changed = true; continue; }
          next[k] = t;
        }
        return changed ? next : prev;
      });
    }, 1500);
    return () => clearInterval(id);
  }, []);

  // Auto-clear "synced" after 2s
  useEffect(() => {
    if (syncState === "synced") {
      const t = setTimeout(() => setSyncState("idle"), 2000);
      return () => clearTimeout(t);
    }
  }, [syncState]);

  // ── Text change handler ───────────────────────────────────────────────────
  const handleTextChange = useCallback((value: string) => {
    setText(value);
    if (suppressSyncRef.current) return;

    setSyncState("syncing");

    if (textSyncTimer.current) clearTimeout(textSyncTimer.current);
    textSyncTimer.current = setTimeout(() => {
      socketRef.current?.emit("text-sync", { roomId, text: value });
      setSyncState("synced");
    }, 200);

    // Typing indicator
    const now = Date.now();
    const last = lastTypingSentRef.current;
    if (!last.value || now - last.at > 1500) {
      lastTypingSentRef.current = { value: true, at: now };
      socketRef.current?.emit("typing", { roomId, isTyping: true });
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      lastTypingSentRef.current = { value: false, at: Date.now() };
      socketRef.current?.emit("typing", { roomId, isTyping: false });
    }, 2000);
  }, [roomId]);

  // ── Copy link ─────────────────────────────────────────────────────────────
  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── File upload ───────────────────────────────────────────────────────────
  const uploadFiles = useCallback(async (files: FileList | File[] | null) => {
    if (!files || !socketRef.current || !connected) return;
    const fileArray = Array.isArray(files) ? files : Array.from(files);
    if (fileArray.length === 0) return;

    const fileNames = fileArray.map((f) => f.name);
    const totalBytes = fileArray.reduce((s, f) => s + f.size, 0);
    const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    setUploading(true);
    setUploadProgress({ loaded: 0, total: totalBytes, speed: 0, eta: 0, fileCount: fileArray.length });

    const broadcast = (state: IncomingUpload["state"], loaded: number, speed: number, eta: number) => {
      socketRef.current?.emit("upload-status", {
        roomId,
        status: { uploadId, fileCount: fileArray.length, fileNames, loaded, total: totalBytes, speed, eta, state },
      });
    };

    broadcast("uploading", 0, 0, 0);
    const formData = new FormData();
    fileArray.forEach((f) => formData.append("files", f));

    try {
      const uploaded = await new Promise<FileInfo[]>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;
        let lastTime = Date.now(), lastLoaded = 0, smoothedSpeed = 0, lastBroadcast = 0;

        xhr.upload.addEventListener("progress", (e) => {
          if (!e.lengthComputable) return;
          const now = Date.now();
          const dt = (now - lastTime) / 1000;
          if (dt >= 0.25) {
            const inst = (e.loaded - lastLoaded) / dt;
            smoothedSpeed = smoothedSpeed === 0 ? inst : smoothedSpeed * 0.7 + inst * 0.3;
            lastTime = now; lastLoaded = e.loaded;
          }
          const eta = smoothedSpeed > 0 ? (e.total - e.loaded) / smoothedSpeed : 0;
          setUploadProgress({ loaded: e.loaded, total: e.total, speed: smoothedSpeed, eta, fileCount: fileArray.length });
          if (now - lastBroadcast >= 400) { lastBroadcast = now; broadcast("uploading", e.loaded, smoothedSpeed, eta); }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try { resolve((JSON.parse(xhr.responseText) as { files: FileInfo[] }).files); }
            catch { reject(new Error("Invalid response")); }
          } else { reject(new Error(`Upload failed (${xhr.status})`)); }
        });
        xhr.addEventListener("error", () => reject(new Error("Network error")));
        xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));
        xhr.open("POST", "/api/upload");
        xhr.send(formData);
      });

      broadcast("completed", totalBytes, 0, 0);
      socketRef.current?.emit("send-data", { roomId, data: { type: "file", files: uploaded } });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      broadcast(msg === "Upload cancelled" ? "cancelled" : "failed", 0, 0, 0);
      if (msg !== "Upload cancelled") alert(msg);
    } finally {
      xhrRef.current = null;
      setUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [connected, roomId]);

  const cancelUpload = () => xhrRef.current?.abort();

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    uploadFiles(Array.from(e.dataTransfer.files));
  }, [uploadFiles]);

  const clearRoom = () => {
    if (!socketRef.current) return;
    if (!confirm("Clear everything from this room?")) return;
    socketRef.current.emit("clear-room", roomId);
  };

  const typingCount = Object.keys(typingPeers).length;
  const incomingList = Object.values(incomingUploads);

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden font-sans">

      {/* ── TOP BAR ─────────────────────────────────────────────────────── */}
      <div className="shrink-0 h-12 border-b border-border bg-card/60 backdrop-blur-sm flex items-center px-3 gap-2">
        {/* Logo */}
        <a href="/" className="flex items-center gap-1.5 shrink-0 mr-2 hover:opacity-80 transition-opacity">
          <img src="/favicon.png" alt="ShareNova" className="h-6 w-6" />
          <span className="font-mono font-bold text-sm text-foreground hidden sm:inline">ShareNova</span>
        </a>

        {/* Status dot */}
        <div className={`w-2 h-2 rounded-full shrink-0 ${connected ? "bg-green-400" : "bg-red-400"}`} />

        {/* URL bar */}
        <div className="flex-1 flex items-center gap-1 min-w-0 bg-background border border-border rounded-md px-2 py-1">
          <span className="text-xs font-mono text-muted-foreground truncate flex-1 select-all">{shareUrl}</span>
          <button
            onClick={copyLink}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            title="Copy link"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Users count */}
        <div className="flex items-center gap-1 shrink-0 text-xs font-mono text-muted-foreground" title="Users online">
          <Users className="h-3.5 w-3.5 text-primary" />
          <span>{userCount}</span>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="shrink-0 p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          title="Toggle theme"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Sidebar toggle (mobile) */}
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className="shrink-0 p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground lg:hidden"
          title="Toggle sidebar"
        >
          <ChevronRight className={`h-4 w-4 transition-transform ${sidebarOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* ── STATUS BAR ──────────────────────────────────────────────────── */}
      <div className="shrink-0 h-7 border-b border-border/50 bg-background/80 flex items-center px-3 gap-4 text-xs font-mono text-muted-foreground">
        {/* Connection */}
        <div className="flex items-center gap-1">
          {connected
            ? <><Wifi className="h-3 w-3 text-green-400" /><span className="text-green-400">Connected</span></>
            : <><WifiOff className="h-3 w-3 text-red-400" /><span className="text-red-400">Disconnected</span></>}
        </div>

        {/* Sync state */}
        {syncState === "syncing" && (
          <div className="flex items-center gap-1 text-primary animate-pulse">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Syncing…</span>
          </div>
        )}
        {syncState === "synced" && (
          <div className="flex items-center gap-1 text-green-400">
            <Check className="h-3 w-3" />
            <span>Synced</span>
          </div>
        )}

        {/* Typing indicator */}
        {typingCount > 0 && (
          <div className="flex items-center gap-1.5 text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: "150ms" }} />
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: "300ms" }} />
            <span>{typingCount === 1 ? "Someone is typing…" : `${typingCount} people typing…`}</span>
          </div>
        )}

        <span className="ml-auto">{text.length} chars · {text.split("\n").length} lines</span>
      </div>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">

        {/* LEFT — Editor ───────────────────────────────────────────────── */}
        <div ref={editorRef} className="flex-1 flex flex-col min-w-0 min-h-0">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            placeholder="Type or paste code here — syncs live to everyone in the room…"
            className="flex-1 w-full h-full resize-none bg-[#0d1117] dark:bg-[#0d1117] text-[#e6edf3] caret-primary font-mono text-sm leading-relaxed p-4 focus:outline-none border-0 placeholder:text-[#484f58]"
            style={{
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', ui-monospace, monospace",
              tabSize: 2,
              whiteSpace: "pre",
              overflowWrap: "normal",
              overflowX: "auto",
              minHeight: 0,
            }}
          />
        </div>

        {/* RIGHT — Sidebar ─────────────────────────────────────────────── */}
        {sidebarOpen && (
          <div className="w-72 shrink-0 border-l border-border flex flex-col min-h-0 bg-card">

            {/* File upload section */}
            <div className="shrink-0 border-b border-border">
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">Send Files</span>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!connected || uploading}
                  className="text-xs font-mono text-primary hover:text-primary/80 disabled:opacity-40 transition-colors"
                >
                  Browse
                </button>
              </div>

              <div className="px-3 pb-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => uploadFiles(e.target.files)}
                />

                {uploading && uploadProgress ? (
                  <div className="border border-primary/30 rounded-lg p-3 flex flex-col gap-2 bg-primary/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Loader2 className="h-3.5 w-3.5 text-primary animate-spin shrink-0" />
                        <span className="text-xs font-mono text-foreground truncate">
                          Uploading {uploadProgress.fileCount} file{uploadProgress.fileCount !== 1 ? "s" : ""}…
                        </span>
                      </div>
                      <button onClick={cancelUpload} className="shrink-0 text-xs font-mono text-destructive hover:text-destructive/80 flex items-center gap-0.5">
                        <X className="h-3 w-3" /> Cancel
                      </button>
                    </div>
                    <div className="h-1.5 w-full bg-background rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-150"
                        style={{ width: `${uploadProgress.total > 0 ? (uploadProgress.loaded / uploadProgress.total) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs font-mono text-muted-foreground">
                      <span>{formatSize(uploadProgress.loaded)} / {formatSize(uploadProgress.total)}</span>
                      <span>{formatSpeed(uploadProgress.speed)} · ETA {formatEta(uploadProgress.eta)}</span>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!connected || uploading}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    className={`w-full flex flex-col items-center gap-1.5 border-2 border-dashed rounded-lg p-4 transition-colors disabled:opacity-40 disabled:cursor-not-allowed
                      ${dragOver ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 hover:bg-primary/5"}`}
                  >
                    <Upload className={`h-5 w-5 transition-colors ${dragOver ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="text-xs font-mono text-muted-foreground">
                      {dragOver ? "Drop to upload" : "Drag & drop or click"}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground/50">Any type · Up to 10 GB</span>
                  </button>
                )}
              </div>
            </div>

            {/* Incoming upload progress (from peers) */}
            {incomingList.length > 0 && (
              <div className="shrink-0 border-b border-border px-3 py-2 flex flex-col gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">Incoming</span>
                {incomingList.map((u) => {
                  const pct = u.total > 0 ? (u.loaded / u.total) * 100 : 0;
                  return (
                    <div key={u.uploadId} className="flex flex-col gap-1.5 border border-primary/20 rounded-lg p-2.5 bg-primary/5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Loader2 className="h-3 w-3 text-primary animate-spin shrink-0" />
                        <span className="text-xs font-mono text-foreground truncate">
                          {u.fileCount} file{u.fileCount !== 1 ? "s" : ""} · {pct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-1 w-full bg-background rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-all duration-150" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-mono text-muted-foreground/70 truncate">{u.fileNames[0]}{u.fileNames.length > 1 ? ` +${u.fileNames.length - 1}` : ""}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* File list */}
            <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
              <div className="px-3 py-2 flex items-center justify-between shrink-0">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
                  Files {fileUpdates.length > 0 ? `(${fileUpdates.reduce((s, u) => s + (u.files?.length ?? 0), 0)})` : ""}
                </span>
                {fileUpdates.length > 0 && (
                  <button
                    onClick={clearRoom}
                    className="text-xs font-mono text-destructive hover:text-destructive/80 flex items-center gap-0.5 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" /> Clear
                  </button>
                )}
              </div>

              {fileUpdates.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-3 py-8">
                  <FileText className="h-8 w-8 text-muted-foreground/20" />
                  <p className="text-xs font-mono text-muted-foreground/50">No files yet</p>
                </div>
              ) : (
                <div className="flex flex-col gap-1 px-2 pb-2">
                  {fileUpdates.flatMap((update) =>
                    (update.files ?? []).map((file) => (
                      <div key={`${update.id}-${file.name}`} className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 transition-colors group">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-mono text-foreground truncate">{file.name}</p>
                          <p className="text-xs font-mono text-muted-foreground/60">{formatSize(file.size)} · {formatTime(update.timestamp)}</p>
                        </div>
                        <a
                          href={file.url}
                          download={file.name}
                          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
