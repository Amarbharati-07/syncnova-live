import { Link } from "wouter";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import logoMark from "@/assets/logo-mark.png";

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center px-4">
        <Link href="/" className="flex items-center gap-2 mr-6 text-foreground hover:opacity-80 transition-opacity">
          <img
            src={logoMark}
            alt="SyncNova"
            className="h-9 w-9 object-contain drop-shadow-[0_2px_8px_rgba(249,115,22,0.25)]"
          />
          <div className="flex flex-col">
            <span className="font-bold font-mono tracking-tight leading-none">SyncNova</span>
            <span className="text-[10px] text-muted-foreground leading-none mt-0.5">Share Code & Files Instantly</span>
          </div>
        </Link>

        <button
          onClick={toggleTheme}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-foreground hover:bg-secondary hover:text-primary"
        >
          <span className="relative inline-flex h-4 w-4 items-center justify-center">
            <Sun
              className={`absolute h-4 w-4 transition-all duration-300 ${
                isDark ? "scale-0 -rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"
              }`}
            />
            <Moon
              className={`absolute h-4 w-4 transition-all duration-300 ${
                isDark ? "scale-100 rotate-0 opacity-100" : "scale-0 rotate-90 opacity-0"
              }`}
            />
          </span>
        </button>
      </div>
    </header>
  );
}
