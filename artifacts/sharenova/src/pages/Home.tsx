import { useLocation } from "wouter";
import { nanoid } from "nanoid";
import { Header } from "@/components/layout/Header";
import { HeroBackground } from "@/components/HeroBackground";
import { ArrowRight, Zap, Link2, Users } from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();

  const createSession = () => {
    const id = nanoid(6);
    setLocation(`/share/${id}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Header />
      <main className="relative flex-1 flex flex-col items-center justify-center p-6 text-center gap-10 overflow-hidden">
        <HeroBackground />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/60 via-background/30 to-background/70"
        />
        <div className="relative z-10 flex flex-col items-center gap-10 w-full">
        <div className="flex flex-col items-center gap-4 max-w-xl">
          <div className="bg-primary/10 text-primary p-4 rounded-2xl">
            <Link2 className="h-10 w-10" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold font-mono tracking-tight">
            Send Once.<br />
            <span className="text-primary">Share Instantly.</span>
          </h1>
          <p className="text-muted-foreground text-base max-w-sm">
            Create one link, send code, text, or files — your friends see every update live without refreshing.
          </p>
        </div>

        <button
          onClick={createSession}
          className="group relative flex items-center gap-3 bg-primary hover:bg-primary/90 text-primary-foreground font-mono font-bold text-lg uppercase tracking-wider px-10 py-5 rounded-2xl shadow-lg shadow-primary/25 transition-all hover:scale-105 active:scale-100"
        >
          <Zap className="h-5 w-5" />
          Share Now
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </button>

        <div className="flex flex-col sm:flex-row gap-6 text-sm text-muted-foreground font-mono">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            One permanent link
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Instant real-time sync
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Multiple viewers
          </div>
        </div>
        </div>
      </main>
    </div>
  );
}
