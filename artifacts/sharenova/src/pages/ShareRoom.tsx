import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "wouter";
import { io, Socket } from "socket.io-client";
import {
  Upload, X, Download, Loader2, Copy, Check, Users,
  WifiOff, Wifi, Moon, Sun, FileText, ChevronRight,
  Zap, Trash2,
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
function fileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg","jpeg","png","gif","svg","webp"].includes(ext)) return "🖼";
  if (["mp4","mov","avi","webm","mkv"].includes(ext)) return "🎬";
  if (["mp3","wav","ogg","flac"].includes(ext)) return "🎵";
  if (["zip","tar","gz","rar","7z"].includes(ext)) return "📦";
  if (["pdf"].includes(ext)) return "📕";
  if (["js","ts","tsx","jsx","py","rb","go","rs","java","cpp","c"].includes(ext)) return "⚡";
  return "📄";
}

export default function ShareRoom() {
  const params = useParams<{ id: string }>();
  const roomId = params.id ?? "";
  const { theme, toggle } = useTheme();

  const socketRef = useRef<Socket | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const lineNumsRef = useRef<HTMLDivElement | null>(null);

  const [connected, setConnected] = useState(false);
  const [userCount, setUserCount] = useState(1);
  const [text, setText] = useState("");
  const [syncState, setSyncState] = useState<"idle" | "syncing" | "synced">("idle");
  const [copied, setCopied] = useState(false);
  const [fileUpdates, setFileUpdates] = useState<RoomUpdate[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<null | {
    loaded: number; total: number; speed: number; eta: number; fileCount: number;
  }>(null);
  const [incomingUploads, setIncomingUploads] = useState<Record<string, IncomingUpload>>({});
  const [typingPeers, setTypingPeers] = useState<Record<string, number>>({});
  const [dragOver, setDragOver] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const suppressSyncRef = useRef(false);
  const textSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef({ value: false, at: 0 });

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/share/${roomId}`
    : `/share/${roomId}`;

  const lineCount = text.split("\n").length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  // ── Socket ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = io(window.location.origin, {
      path: "/api/socket.io",
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => { setConnected(true); socket.emit("join-room", roomId); });
    socket.on("disconnect", () => setConnected(false));
    socket.on("user-count", ({ count }: { count: number }) => setUserCount(count));

    socket.on("text-state", ({ text: t }: { text: string }) => {
      suppressSyncRef.current = true;
      setText(t);
      setTimeout(() => { suppressSyncRef.current = false; }, 50);
    });

    socket.on("text-sync", ({ text: t }: { text: string }) => {
      suppressSyncRef.current = true;
      setText(t);
      setSyncState("synced");
      setTimeout(() => { suppressSyncRef.current = false; }, 50);
    });

    socket.on("room-history", (history: RoomUpdate[]) => {
      setFileUpdates(history.filter((u) => u.type === "file"));
    });

    socket.on("receive-data", (update: RoomUpdate) => {
      if (update.type === "file") setFileUpdates((prev) => [...prev, update]);
    });

    socket.on("room-cleared", () => {
      setFileUpdates([]); setIncomingUploads({});
      setText(""); setSyncState("idle");
    });

    socket.on("typing", ({ socketId, isTyping }: { socketId: string; isTyping: boolean }) => {
      if (!socketId) return;
      setTypingPeers((prev) => {
        const next = { ...prev };
        if (isTyping) next[socketId] = Date.now(); else delete next[socketId];
        return next;
      });
    });

    socket.on("upload-status", (status: IncomingUpload) => {
      if (!status?.uploadId) return;
      if (status.state === "uploading") {
        setIncomingUploads((prev) => ({ ...prev, [status.uploadId]: { ...status, updatedAt: Date.now() } }));
      } else {
        setIncomingUploads((prev) => { const next = { ...prev }; delete next[status.uploadId]; return next; });
      }
    });

    return () => { socket.disconnect(); };
  }, [roomId]);

  // Stale sweep + auto-clear synced
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

  useEffect(() => {
    if (syncState === "synced") {
      const t = setTimeout(() => setSyncState("idle"), 2500);
      return () => clearTimeout(t);
    }
  }, [syncState]);

  // Sync line numbers scroll with textarea
  const handleScroll = () => {
    if (lineNumsRef.current && textareaRef.current) {
      lineNumsRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // ── Text sync ────────────────────────────────────────────────────────────
  const handleTextChange = useCallback((value: string) => {
    setText(value);
    if (suppressSyncRef.current) return;
    setSyncState("syncing");
    if (textSyncTimer.current) clearTimeout(textSyncTimer.current);
    textSyncTimer.current = setTimeout(() => {
      socketRef.current?.emit("text-sync", { roomId, text: value });
      setSyncState("synced");
    }, 200);
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

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  // ── File upload ──────────────────────────────────────────────────────────
  const uploadFiles = useCallback(async (files: FileList | File[] | null) => {
    if (!files || !socketRef.current || !connected) return;
    const fileArray = Array.isArray(files) ? files : Array.from(files);
    if (!fileArray.length) return;

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
    e.preventDefault(); setDragOver(false);
    uploadFiles(Array.from(e.dataTransfer.files));
  }, [uploadFiles]);

  const clearRoom = () => {
    if (!socketRef.current || !confirm("Clear all content from this room?")) return;
    socketRef.current.emit("clear-room", roomId);
  };

  const typingCount = Object.keys(typingPeers).length;
  const incomingList = Object.values(incomingUploads);
  const allFiles = fileUpdates.flatMap((u) => (u.files ?? []).map((f) => ({ ...f, ts: u.timestamp, uid: u.id })));

  return (
    <div className="h-screen flex flex-col overflow-hidden relative" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Background glow orbs */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, rgba(255,106,0,0.4) 0%, transparent 70%)", filter: "blur(60px)" }} />
        <div className="absolute top-1/2 -right-32 w-80 h-80 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.5) 0%, transparent 70%)", filter: "blur(60px)" }} />
      </div>

      {/* ── NAVBAR ──────────────────────────────────────────────────────── */}
      <nav className="relative z-50 shrink-0 h-14 glass-dark border-b border-white/8 flex items-center px-4 gap-3"
        style={{ boxShadow: "0 1px 0 rgba(255,255,255,0.05), 0 4px 24px rgba(0,0,0,0.4)" }}>

        {/* Logo */}
        <a href="/" className="flex items-center gap-2 shrink-0 mr-1 group">
          <img src="/favicon.png" alt="ShareNova" className="h-7 w-7 drop-shadow-[0_0_8px_rgba(255,106,0,0.6)]" />
          <span className="font-bold text-sm text-white hidden sm:inline tracking-tight"
            style={{ textShadow: "0 0 20px rgba(255,106,0,0.35)" }}>
            ShareNova
          </span>
        </a>

        {/* Divider */}
        <div className="hidden sm:block w-px h-5 bg-white/10" />

        {/* Connection badge */}
        <div className={`hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium
          ${connected
            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
          {connected ? "Live" : "Offline"}
        </div>

        {/* URL bar (center) */}
        <div className="flex-1 flex items-center gap-2 min-w-0 mx-2">
          <div className="flex-1 min-w-0 flex items-center gap-2 bg-white/5 border border-white/8 rounded-xl px-3 py-1.5
            hover:bg-white/8 hover:border-white/12 transition-all cursor-text"
            onClick={copyLink} title="Click to copy link">
            <span className="text-xs text-white/40 font-mono shrink-0">⟨/⟩</span>
            <span className="text-xs font-mono text-white/65 truncate flex-1">{shareUrl}</span>
            <button
              onClick={(e) => { e.stopPropagation(); copyLink(); }}
              className="shrink-0 flex items-center gap-1 text-xs text-white/50 hover:text-primary transition-colors"
            >
              {copied
                ? <><Check className="h-3 w-3 text-emerald-400" /><span className="text-emerald-400 hidden sm:inline">Copied!</span></>
                : <><Copy className="h-3 w-3" /><span className="hidden sm:inline">Copy</span></>}
            </button>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Users */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl glass text-xs font-medium text-white/70">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <Users className="h-3.5 w-3.5" />
            <span>{userCount}</span>
          </div>

          {/* Theme */}
          <button onClick={toggle}
            className="p-2 rounded-xl glass text-white/60 hover:text-white transition-all hover:bg-white/10">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Sidebar toggle */}
          <button onClick={() => setSidebarOpen((v) => !v)}
            className="p-2 rounded-xl glass text-white/60 hover:text-white transition-all hover:bg-white/10 lg:hidden">
            <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${sidebarOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
      </nav>

      {/* ── STATUS STRIP ────────────────────────────────────────────────── */}
      <div className="relative z-40 shrink-0 h-8 border-b border-white/5 flex items-center px-4 gap-5 text-xs"
        style={{ background: "rgba(2,6,23,0.6)" }}>

        {/* Sync state */}
        {syncState === "syncing" && (
          <div className="flex items-center gap-1.5 text-orange-400 anim-in">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Syncing…</span>
          </div>
        )}
        {syncState === "synced" && (
          <div className="flex items-center gap-1.5 text-emerald-400 anim-in">
            <Zap className="h-3 w-3" />
            <span>Synced</span>
          </div>
        )}
        {syncState === "idle" && (
          <div className="flex items-center gap-1.5 text-white/30">
            <span className="font-mono">⚡</span>
            <span>Auto-sync on</span>
          </div>
        )}

        {/* Typing indicator */}
        {typingCount > 0 && (
          <div className="flex items-center gap-2 text-orange-400 anim-in">
            <div className="flex gap-0.5">
              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" />
              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" />
              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" />
            </div>
            <span>{typingCount === 1 ? "Someone is typing" : `${typingCount} typing`}</span>
          </div>
        )}

        {/* Editor stats (right side) */}
        <div className="ml-auto flex items-center gap-3 text-white/25 font-mono">
          <span>{lineCount} ln</span>
          <span>·</span>
          <span>{text.length} ch</span>
          <span>·</span>
          <span>UTF-8</span>
        </div>
      </div>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex min-h-0 overflow-hidden p-3 gap-3">

        {/* ── EDITOR PANEL ─────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 rounded-2xl overflow-hidden glass focus-glow"
          style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.07), 0 8px 40px rgba(0,0,0,0.5)" }}>

          {/* Editor titlebar */}
          <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-white/6"
            style={{ background: "rgba(2,6,23,0.5)" }}>
            {/* Traffic lights */}
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/70" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
            </div>
            <div className="flex-1 flex items-center gap-2">
              <span className="text-xs font-mono text-white/30">session://</span>
              <span className="text-xs font-mono text-white/55">{roomId}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-white/25 font-mono">
              <span>Plain Text</span>
            </div>
          </div>

          {/* Editor body: line nums + textarea */}
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* Line numbers */}
            <div
              ref={lineNumsRef}
              className="shrink-0 w-12 select-none overflow-hidden text-right pr-3 pt-4"
              style={{
                background: "rgba(2,6,23,0.4)",
                borderRight: "1px solid rgba(255,255,255,0.04)",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "13px",
                lineHeight: "22px",
                color: "rgba(255,255,255,0.18)",
              }}
            >
              {lineNumbers.map((n) => (
                <div key={n} style={{ lineHeight: "22px" }}>{n}</div>
              ))}
            </div>

            {/* Textarea */}
            {text === "" ? (
              <div className="relative flex-1 min-h-0">
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => handleTextChange(e.target.value)}
                  onScroll={handleScroll}
                  spellCheck={false} autoComplete="off" autoCorrect="off" autoCapitalize="off"
                  className="absolute inset-0 w-full h-full resize-none border-0 focus:outline-none bg-transparent caret-orange-400 pl-4 pt-4 pr-4 pb-4"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "13px",
                    lineHeight: "22px",
                    color: "rgba(230,237,243,0)",
                    caretColor: "#f97316",
                    tabSize: 2,
                    whiteSpace: "pre",
                    overflowWrap: "normal",
                    overflowX: "auto",
                  }}
                />
                {/* Placeholder overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-4 pb-16">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                      style={{ background: "rgba(255,106,0,0.08)", border: "1px solid rgba(255,106,0,0.15)", boxShadow: "0 0 30px rgba(255,106,0,0.1)" }}>
                      <Zap className="h-8 w-8 text-orange-500 opacity-70" />
                    </div>
                    <div className="text-center">
                      <p className="text-white/50 text-sm font-medium">Start typing to share instantly ⚡</p>
                      <p className="text-white/25 text-xs mt-1 font-mono">All users in this room will see it live</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/20 font-mono">
                    <span>Code</span><span>·</span><span>Text</span><span>·</span><span>Commands</span><span>·</span><span>Anything</span>
                  </div>
                </div>
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => handleTextChange(e.target.value)}
                onScroll={handleScroll}
                spellCheck={false} autoComplete="off" autoCorrect="off" autoCapitalize="off"
                className="flex-1 resize-none border-0 focus:outline-none bg-transparent caret-orange-400 pl-4 pt-4 pr-4 pb-4 min-h-0"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "13px",
                  lineHeight: "22px",
                  color: "#e2e8f0",
                  caretColor: "#f97316",
                  tabSize: 2,
                  whiteSpace: "pre",
                  overflowWrap: "normal",
                  overflowX: "auto",
                }}
              />
            )}
          </div>
        </div>

        {/* ── RIGHT SIDEBAR ─────────────────────────────────────────────── */}
        {sidebarOpen && (
          <div className="w-72 shrink-0 flex flex-col gap-3 min-h-0 overflow-y-auto">

            {/* Upload card */}
            <div className="shrink-0 rounded-2xl overflow-hidden glass"
              style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.07), 0 4px 20px rgba(0,0,0,0.4)" }}>
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/6">
                <div className="flex items-center gap-2">
                  <Upload className="h-3.5 w-3.5 text-orange-400" />
                  <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">Send Files</span>
                </div>
                <button onClick={() => fileInputRef.current?.click()}
                  disabled={!connected || uploading}
                  className="text-xs text-orange-400 hover:text-orange-300 font-medium transition-colors disabled:opacity-40">
                  Browse
                </button>
              </div>

              <div className="p-3">
                <input ref={fileInputRef} type="file" multiple className="hidden"
                  onChange={(e) => uploadFiles(e.target.files)} />

                {uploading && uploadProgress ? (
                  <div className="flex flex-col gap-2.5 rounded-xl p-3"
                    style={{ background: "rgba(255,106,0,0.08)", border: "1px solid rgba(255,106,0,0.2)" }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Loader2 className="h-3.5 w-3.5 text-orange-400 animate-spin shrink-0" />
                        <span className="text-xs font-mono text-white/70 truncate">
                          Uploading {uploadProgress.fileCount} file{uploadProgress.fileCount !== 1 ? "s" : ""}…
                        </span>
                      </div>
                      <button onClick={cancelUpload}
                        className="shrink-0 text-red-400 hover:text-red-300 transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                      <div className="h-full rounded-full transition-all duration-150"
                        style={{
                          width: `${uploadProgress.total > 0 ? (uploadProgress.loaded / uploadProgress.total) * 100 : 0}%`,
                          background: "linear-gradient(90deg, #FF6A00, #FF9E4F)",
                          boxShadow: "0 0 8px rgba(255,106,0,0.5)",
                        }} />
                    </div>
                    <div className="flex justify-between text-xs font-mono text-white/40">
                      <span>{formatSize(uploadProgress.loaded)} / {formatSize(uploadProgress.total)}</span>
                      <span>{formatSpeed(uploadProgress.speed)}</span>
                    </div>
                    <div className="text-xs font-mono text-white/30 text-right">ETA {formatEta(uploadProgress.eta)}</div>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!connected || uploading}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    className="w-full flex flex-col items-center gap-2 rounded-xl p-5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      border: `2px dashed ${dragOver ? "rgba(255,106,0,0.7)" : "rgba(255,255,255,0.1)"}`,
                      background: dragOver ? "rgba(255,106,0,0.08)" : "rgba(255,255,255,0.02)",
                    }}
                  >
                    <div className={`p-2.5 rounded-xl transition-all ${dragOver ? "bg-orange-500/20" : "bg-white/5"}`}>
                      <Upload className={`h-5 w-5 transition-colors ${dragOver ? "text-orange-400" : "text-white/30"}`} />
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-white/50 font-medium">{dragOver ? "Drop to upload" : "Drag & drop"}</p>
                      <p className="text-xs text-white/25 font-mono mt-0.5">Any type · Up to 10 GB</p>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Incoming uploads from peers */}
            {incomingList.length > 0 && (
              <div className="shrink-0 rounded-2xl overflow-hidden glass"
                style={{ boxShadow: "0 0 0 1px rgba(255,106,0,0.15), 0 4px 20px rgba(0,0,0,0.4)" }}>
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/6">
                  <Loader2 className="h-3.5 w-3.5 text-orange-400 animate-spin" />
                  <span className="text-xs font-semibold text-orange-400/80 uppercase tracking-wider">Incoming</span>
                </div>
                <div className="p-3 flex flex-col gap-2">
                  {incomingList.map((u) => {
                    const pct = u.total > 0 ? (u.loaded / u.total) * 100 : 0;
                    return (
                      <div key={u.uploadId} className="flex flex-col gap-1.5 rounded-xl p-2.5"
                        style={{ background: "rgba(255,106,0,0.06)", border: "1px solid rgba(255,106,0,0.15)" }}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-white/60 truncate">
                            {u.fileCount} file{u.fileCount !== 1 ? "s" : ""} · {pct.toFixed(0)}%
                          </span>
                          <span className="text-xs font-mono text-orange-400/70 shrink-0 ml-2">{formatSpeed(u.speed)}</span>
                        </div>
                        <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                          <div className="h-full rounded-full transition-all duration-200"
                            style={{ width: `${pct}%`, background: "linear-gradient(90deg, #FF6A00, #FF9E4F)" }} />
                        </div>
                        <p className="text-xs font-mono text-white/30 truncate">
                          {u.fileNames[0]}{u.fileNames.length > 1 ? ` +${u.fileNames.length - 1} more` : ""}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Files card */}
            <div className="flex-1 min-h-[200px] rounded-2xl overflow-hidden glass flex flex-col"
              style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.07), 0 4px 20px rgba(0,0,0,0.4)" }}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/6 shrink-0">
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-white/50" />
                  <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">
                    Files {allFiles.length > 0 ? `(${allFiles.length})` : ""}
                  </span>
                </div>
                {allFiles.length > 0 && (
                  <button onClick={clearRoom}
                    className="text-xs text-red-400/60 hover:text-red-400 transition-colors flex items-center gap-1">
                    <Trash2 className="h-3 w-3" />
                    Clear
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto">
                {allFiles.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center gap-3 px-4 py-10">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <FileText className="h-6 w-6 text-white/15" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-white/30 font-medium">No files yet</p>
                      <p className="text-xs text-white/15 font-mono mt-1">Upload or drag files above</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-2 flex flex-col gap-1.5">
                    {allFiles.map((file) => (
                      <div key={`${file.uid}-${file.name}`}
                        className="group flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-all cursor-pointer anim-in"
                        style={{ background: "rgba(255,255,255,0.03)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                      >
                        <span className="text-lg shrink-0">{fileIcon(file.name)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white/75 truncate leading-tight">{file.name}</p>
                          <p className="text-xs text-white/30 font-mono mt-0.5">
                            {formatSize(file.size)} · {formatTime(file.ts)}
                          </p>
                        </div>
                        <a href={file.url} download={file.name}
                          className="shrink-0 opacity-0 group-hover:opacity-100 transition-all p-1.5 rounded-lg hover:bg-orange-500/20 text-white/40 hover:text-orange-400"
                          onClick={(e) => e.stopPropagation()}>
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
