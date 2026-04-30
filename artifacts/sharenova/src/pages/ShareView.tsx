import { useParams, useLocation, Link } from "wouter";
import { useGetShare, useDeleteShare, getGetShareQueryKey } from "@workspace/api-client-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Code,
  FileIcon,
  Copy,
  Download,
  Trash2,
  Clock,
  Eye,
  Plus,
  Loader2,
  ExternalLink,
  Check,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

export default function ShareView() {
  const params = useParams<{ id: string }>();
  const id = params.id || "";
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const { data: share, isLoading, error } = useGetShare(id, {
    query: {
      enabled: !!id,
      queryKey: getGetShareQueryKey(id),
      refetchInterval: 8000,
      refetchIntervalInBackground: false,
    }
  });

  const deleteShare = useDeleteShare({
    mutation: {
      onSuccess: () => {
        toast({ title: "Deleted", description: "Share removed." });
        setLocation("/");
      },
      onError: () => {
        toast({ title: "Error", description: "Could not delete.", variant: "destructive" });
      }
    }
  });

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/${id}` : `/${id}`;

  const copyUrl = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const copyCode = async () => {
    if (share?.content) {
      await navigator.clipboard.writeText(share.content);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2500);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col font-sans">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="font-mono text-sm">Loading share...</span>
          </div>
        </main>
      </div>
    );
  }

  if (error || !share) {
    return (
      <div className="min-h-screen bg-background flex flex-col font-sans">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4">
          <div className="bg-destructive/10 text-destructive p-4 rounded-full">
            <ExternalLink className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold font-mono">Share not found</h1>
          <p className="text-muted-foreground">This share may have expired or been deleted.</p>
          <Link href="/"><Button>Create New Share</Button></Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-6 max-w-3xl flex flex-col gap-5">

        {/* Share URL bar */}
        <div className="flex items-stretch gap-0 w-full bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <span
            className="flex-1 px-4 py-3 font-mono text-sm text-primary truncate select-all"
            data-testid="text-share-url"
          >
            {shareUrl}
          </span>
          <button
            onClick={copyUrl}
            className={`shrink-0 px-5 py-3 flex items-center gap-2 text-sm font-mono font-bold uppercase tracking-wider transition-all border-l border-border ${
              copied
                ? "bg-green-500/15 text-green-400"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
            }`}
            data-testid="button-copy-url"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? "Copied!" : "Copy Link"}</span>
          </button>
        </div>

        {/* Title + meta */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-xl font-bold font-mono flex items-center gap-2">
              <div className="bg-primary/10 text-primary p-1.5 rounded">
                {share.type === "code" ? <Code className="h-5 w-5" /> : <FileIcon className="h-5 w-5" />}
              </div>
              {share.title || (share.type === "code" ? "Untitled Snippet" : "Shared Files")}
            </h1>
            <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(share.createdAt), { addSuffix: true })}
              </span>
              <span className="flex items-center gap-1 text-primary font-semibold">
                <Eye className="h-3 w-3" />
                {share.viewCount} {share.viewCount === 1 ? "view" : "views"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link href="/">
              <Button variant="outline" size="sm" className="font-mono uppercase tracking-wider text-xs" data-testid="button-new-share">
                <Plus className="h-3.5 w-3.5 mr-1" />
                New
              </Button>
            </Link>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteShare.mutate({ id })}
              disabled={deleteShare.isPending}
              className="font-mono uppercase tracking-wider text-xs"
              data-testid="button-delete-share"
            >
              {deleteShare.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <><Trash2 className="h-3.5 w-3.5 mr-1" />Delete</>
              )}
            </Button>
          </div>
        </div>

        {/* Content */}
        {share.type === "code" ? (
          <div className="relative bg-[#1e1e1e] border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-black/20">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Content</span>
              <button
                onClick={copyCode}
                className={`flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider px-3 py-1.5 rounded transition-all ${
                  codeCopied
                    ? "bg-green-500/15 text-green-400"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
                }`}
                data-testid="button-copy-code"
              >
                {codeCopied ? <><Check className="h-3 w-3" />Copied</> : <><Copy className="h-3 w-3" />Copy</>}
              </button>
            </div>
            <pre className="p-4 overflow-auto max-h-[60vh] font-mono text-sm leading-relaxed text-gray-200 whitespace-pre-wrap break-words">
              {share.content}
            </pre>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border/50 bg-black/10">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Files ({share.files?.length || 0})
              </span>
            </div>
            <div className="p-4 flex flex-col gap-3">
              {share.files?.map((file, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-background border border-border rounded-lg hover:border-primary/40 transition-colors"
                  data-testid={`file-row-${i}`}
                >
                  <div className="flex items-center gap-3 overflow-hidden min-w-0">
                    <div className="bg-primary/10 text-primary p-2 rounded shrink-0">
                      <FileIcon className="h-4 w-4" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-medium text-sm truncate" title={file.name}>{file.name}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    asChild
                    size="sm"
                    className="ml-3 shrink-0 font-mono text-xs uppercase tracking-wider"
                    data-testid={`button-download-${i}`}
                  >
                    <a href={file.url} download={file.name}>
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      Download
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
