import { useLocation } from "wouter";
import { nanoid } from "nanoid";
import { HeroBackground } from "@/components/HeroBackground";
import { ArrowRight, Zap, Link2, Users, Code2, Upload, Eye } from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();

  const createSession = () => {
    const id = nanoid(6);
    setLocation(`/share/${id}`);
  };

  return (
    <div className="min-h-screen flex flex-col overflow-hidden relative" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Glow orbs */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-60 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full opacity-30"
          style={{ background: "radial-gradient(ellipse, rgba(255,106,0,0.35) 0%, transparent 65%)", filter: "blur(80px)" }} />
        <div className="absolute bottom-0 -left-40 w-80 h-80 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.5) 0%, transparent 70%)", filter: "blur(60px)" }} />
        <div className="absolute top-1/3 -right-20 w-64 h-64 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, rgba(255,106,0,0.4) 0%, transparent 70%)", filter: "blur(50px)" }} />
      </div>

      {/* Animated network background */}
      <div className="absolute inset-0 z-0">
        <HeroBackground />
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 z-0 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, rgba(2,6,23,0.4) 0%, rgba(2,6,23,0.15) 40%, rgba(2,6,23,0.5) 100%)" }} />

      {/* Navbar */}
      <nav className="relative z-50 shrink-0 h-14 flex items-center px-6 glass-dark border-b border-white/6"
        style={{ boxShadow: "0 1px 0 rgba(255,255,255,0.04)" }}>
        <div className="flex items-center gap-2">
          <img src="/favicon.png" alt="ShareNova"
            className="h-7 w-7 drop-shadow-[0_0_10px_rgba(255,106,0,0.7)]" />
          <span className="font-bold text-white tracking-tight"
            style={{ textShadow: "0 0 20px rgba(255,106,0,0.4)" }}>ShareNova</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={createSession}
            className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-sm font-medium text-white/70 glass hover:text-white transition-all">
            <Zap className="h-3.5 w-3.5 text-orange-400" />
            New Session
          </button>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-8 anim-in"
          style={{
            background: "rgba(255,106,0,0.1)",
            border: "1px solid rgba(255,106,0,0.25)",
            color: "#FF9E4F",
            boxShadow: "0 0 20px rgba(255,106,0,0.1)",
          }}>
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
          Real-time code & file sharing
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.05] anim-in"
          style={{ animationDelay: "60ms" }}>
          <span className="text-white">Send Once.</span>
          <br />
          <span style={{
            background: "linear-gradient(135deg, #FF6A00 0%, #FF9E4F 60%, #FFD280 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            filter: "drop-shadow(0 0 40px rgba(255,106,0,0.35))",
          }}>
            Share Instantly.
          </span>
        </h1>

        {/* Sub */}
        <p className="text-white/50 text-lg max-w-md mb-12 leading-relaxed anim-in"
          style={{ animationDelay: "100ms" }}>
          One link. Live sync. No refresh needed.
          <br />
          Code, text, or files — your team sees it the moment you type.
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-16 anim-in"
          style={{ animationDelay: "140ms" }}>
          <button onClick={createSession}
            className="group relative flex items-center gap-3 text-white font-semibold text-base px-8 py-4 rounded-2xl transition-all"
            style={{
              background: "linear-gradient(135deg, #FF6A00, #FF8C38)",
              boxShadow: "0 0 40px rgba(255,106,0,0.4), 0 4px 16px rgba(255,106,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                "0 0 60px rgba(255,106,0,0.55), 0 8px 24px rgba(255,106,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                "0 0 40px rgba(255,106,0,0.4), 0 4px 16px rgba(255,106,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)";
            }}
          >
            <Zap className="h-5 w-5" />
            Start Sharing
            <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
          </button>

          <div className="text-xs text-white/25 font-mono">No signup · No install · Instant</div>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-3 anim-in" style={{ animationDelay: "180ms" }}>
          {[
            { icon: Link2, label: "Permanent link" },
            { icon: Eye, label: "Live for all viewers" },
            { icon: Code2, label: "Code & text editor" },
            { icon: Upload, label: "Up to 10 GB files" },
            { icon: Users, label: "Unlimited viewers" },
          ].map(({ icon: Icon, label }) => (
            <div key={label}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-white/55 font-medium glass">
              <Icon className="h-3.5 w-3.5 text-orange-400/70" />
              {label}
            </div>
          ))}
        </div>

        {/* Editor preview mockup */}
        <div className="mt-16 w-full max-w-2xl mx-auto rounded-2xl overflow-hidden anim-in"
          style={{
            animationDelay: "220ms",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 32px 80px rgba(0,0,0,0.6), 0 0 60px rgba(255,106,0,0.08)",
            background: "rgba(2,6,23,0.8)",
            backdropFilter: "blur(20px)",
          }}>
          {/* Titlebar */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/6">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
            </div>
            <div className="flex-1 flex justify-center">
              <span className="text-xs font-mono text-white/30">sharenova.app/share/abc123</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono">2 online</span>
            </div>
          </div>
          {/* Fake code */}
          <div className="flex text-left" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "12px", lineHeight: "20px" }}>
            <div className="px-3 pt-3 pb-3 select-none text-right min-w-[36px]" style={{ color: "rgba(255,255,255,0.15)" }}>
              {[1,2,3,4,5,6,7].map(n => <div key={n}>{n}</div>)}
            </div>
            <div className="flex-1 p-3 overflow-hidden">
              <div><span style={{ color: "#79b8ff" }}>const</span><span style={{ color: "#e1e4e8" }}> shareNova </span><span style={{ color: "#f97583" }}>=</span><span style={{ color: "#e1e4e8" }}> {"{"}</span></div>
              <div><span style={{ color: "#e1e4e8" }}>  </span><span style={{ color: "#b392f0" }}>realtime</span><span style={{ color: "#e1e4e8" }}>: </span><span style={{ color: "#79b8ff" }}>true</span><span style={{ color: "#e1e4e8" }}>,</span></div>
              <div><span style={{ color: "#e1e4e8" }}>  </span><span style={{ color: "#b392f0" }}>maxFileSize</span><span style={{ color: "#e1e4e8" }}>: </span><span style={{ color: "#9ecbff" }}>"10GB"</span><span style={{ color: "#e1e4e8" }}>,</span></div>
              <div><span style={{ color: "#e1e4e8" }}>  </span><span style={{ color: "#b392f0" }}>viewers</span><span style={{ color: "#e1e4e8" }}>: </span><span style={{ color: "#9ecbff" }}>"unlimited"</span><span style={{ color: "#e1e4e8" }}>,</span></div>
              <div><span style={{ color: "#e1e4e8" }}>  </span><span style={{ color: "#b392f0" }}>setup</span><span style={{ color: "#e1e4e8" }}>: </span><span style={{ color: "#9ecbff" }}>"none"</span><span style={{ color: "#e1e4e8" }}>,</span></div>
              <div><span style={{ color: "#e1e4e8" }}>{"}"}</span><span style={{ color: "#e1e4e8" }}>;</span></div>
              <div className="flex items-center gap-0.5">
                <span style={{ color: "#e1e4e8" }}>&nbsp;</span>
                <span className="inline-block w-2 h-4 bg-orange-400 animate-pulse rounded-sm opacity-80" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
