import { Link } from "wouter";
import { Terminal } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center px-4">
        <Link href="/" className="flex items-center gap-2 mr-6 text-foreground hover:opacity-80 transition-opacity">
          <div className="bg-primary/10 p-1.5 rounded-md">
            <Terminal className="h-5 w-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold font-mono tracking-tight leading-none">ShareNova</span>
            <span className="text-[10px] text-muted-foreground leading-none mt-0.5">Share Code & Files Instantly</span>
          </div>
        </Link>
      </div>
    </header>
  );
}
