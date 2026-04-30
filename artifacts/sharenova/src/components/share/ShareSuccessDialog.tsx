import { useState } from "react";
import { Check, Copy, ExternalLink, X, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface ShareSuccessDialogProps {
  shareId: string;
  onClose: () => void;
}

export function ShareSuccessDialog({ shareId, onClose }: ShareSuccessDialogProps) {
  const [copied, setCopied] = useState(false);
  const [, setLocation] = useLocation();

  const shareUrl = `${window.location.origin}/${shareId}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const openShare = () => {
    setLocation(`/${shareId}`);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8 flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          data-testid="button-close-dialog"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center">
            <Link2 className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-2xl font-bold font-mono tracking-tight">Share Created!</h2>
          <p className="text-sm text-muted-foreground">
            Anyone with this link can view your share. Send it to your friends.
          </p>
        </div>

        <div className="w-full flex flex-col gap-2">
          <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Your shareable link</span>
          <div className="flex items-center gap-0 w-full bg-background border border-border rounded-lg overflow-hidden">
            <span
              className="flex-1 px-4 py-3 font-mono text-sm text-primary truncate select-all cursor-text"
              data-testid="text-share-url"
            >
              {shareUrl}
            </span>
            <button
              onClick={copyLink}
              className={`shrink-0 px-4 py-3 flex items-center gap-2 text-sm font-mono font-bold uppercase tracking-wider transition-all border-l border-border ${
                copied
                  ? "bg-green-500/15 text-green-400"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
              }`}
              data-testid="button-copy-link"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Button
            onClick={openShare}
            className="flex-1 font-mono font-bold uppercase tracking-wider"
            data-testid="button-open-share"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Share
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 font-mono uppercase tracking-wider"
            data-testid="button-share-another"
          >
            Share Another
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center font-mono">
          Share ID: <span className="text-primary">{shareId}</span>
        </p>
      </div>
    </div>
  );
}
