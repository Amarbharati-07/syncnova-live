import { useParams, useLocation, Link } from "wouter";
import { useGetShare, useDeleteShare, getGetShareQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
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
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import Editor from "@monaco-editor/react";
import { useState } from "react";

export default function ShareView() {
  const params = useParams<{ id: string }>();
  const id = params.id || "";
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const { data: share, isLoading, error, dataUpdatedAt } = useGetShare(id, {
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
        toast({ title: "Share deleted", description: "The share has been removed." });
        setLocation("/");
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to delete the share.", variant: "destructive" });
      }
    }
  });

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/${id}` : `/${id}`;

  const copyUrl = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Link copied!", description: "Share URL copied to clipboard." });
  };

  const copyCode = async () => {
    if (share?.content) {
      await navigator.clipboard.writeText(share.content);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
      toast({ title: "Copied!", description: "Code copied to clipboard." });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col font-sans">
        <Header />
        <main className="flex-1 container mx-auto p-4 md:p-6 lg:p-8 max-w-5xl flex flex-col gap-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-[400px] w-full" />
        </main>
      </div>
    );
  }

  if (error || !share) {
    return (
      <div className="min-h-screen bg-background flex flex-col font-sans">
        <Header />
        <main className="flex-1 container mx-auto p-4 md:p-6 lg:p-8 max-w-2xl flex flex-col items-center justify-center text-center min-h-[60vh]">
          <div className="bg-destructive/10 text-destructive p-4 rounded-full mb-4">
            <ExternalLink className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold font-mono mb-2">Share not found</h1>
          <p className="text-muted-foreground mb-8">This share may have expired or been deleted.</p>
          <Link href="/"><Button>Create New Share</Button></Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-6 lg:p-8 max-w-5xl flex flex-col gap-6">

        {/* Share URL bar */}
        <div className="flex flex-col gap-3 bg-card/40 border border-border p-4 rounded-xl backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Share URL — send this to anyone</span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
              <RefreshCw className="h-3 w-3" />
              Live — updates every 8s
            </div>
          </div>
          <div className="flex items-stretch gap-0 w-full bg-background border border-border rounded-lg overflow-hidden">
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
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
              data-testid="button-copy-url"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span className="hidden sm:inline">{copied ? "Copied!" : "Copy Link"}</span>
            </button>
          </div>
        </div>

        {/* Title, meta, and actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl md:text-3xl font-bold font-mono flex items-center gap-3">
              <div className="bg-primary/10 text-primary p-2 rounded-lg">
                {share.type === "code" ? <Code className="h-6 w-6" /> : <FileIcon className="h-6 w-6" />}
              </div>
              {share.title || (share.type === "code" ? "Untitled Snippet" : "Shared Files")}
            </h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground font-mono">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {formatDistanceToNow(new Date(share.createdAt), { addSuffix: true })}
              </div>
              <div className="flex items-center gap-1.5 text-primary font-semibold">
                <Eye className="h-3.5 w-3.5" />
                {share.viewCount} {share.viewCount === 1 ? "view" : "views"}
              </div>
              {share.expiresAt && (
                <div className="flex items-center gap-1.5 text-amber-400/90">
                  Expires {format(new Date(share.expiresAt), "MMM d, yyyy HH:mm")}
                </div>
              )}
              {share.type === "code" && share.language && (
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20 text-xs">
                  {share.language}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link href="/">
              <Button variant="outline" size="sm" className="font-mono uppercase tracking-wider text-xs" data-testid="button-new-share">
                <Plus className="h-4 w-4 mr-1.5" />
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
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Delete
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="bg-card/50 border border-border rounded-xl overflow-hidden">
          {share.type === "code" ? (
            <div className="relative">
              <div className="absolute top-3 right-3 z-10">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={copyCode}
                  className="font-mono text-xs uppercase tracking-wider backdrop-blur-md bg-background/80"
                  data-testid="button-copy-code"
                >
                  {codeCopied ? (
                    <><Check className="h-3 w-3 mr-2 text-green-400" />Copied</>
                  ) : (
                    <><Copy className="h-3 w-3 mr-2" />Copy Code</>
                  )}
                </Button>
              </div>
              <div className="h-[600px] w-full">
                <Editor
                  height="100%"
                  language={share.language || "plaintext"}
                  theme="vs-dark"
                  value={share.content || ""}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 14,
                    fontFamily: "JetBrains Mono, monospace",
                    lineHeight: 1.5,
                    padding: { top: 24, bottom: 24 },
                    scrollBeyondLastLine: false,
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="p-6">
              <h3 className="text-base font-semibold font-mono mb-4 flex items-center gap-2 text-muted-foreground uppercase tracking-wider text-xs">
                <FileIcon className="h-4 w-4 text-primary" />
                Files ({share.files?.length || 0})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {share.files?.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 bg-background border border-border rounded-lg hover:border-primary/40 transition-colors"
                    data-testid={`file-row-${i}`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden min-w-0">
                      <div className="bg-primary/10 text-primary p-2 rounded shrink-0">
                        <FileIcon className="h-4 w-4" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-medium text-sm truncate" title={file.name}>{file.name}</p>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          {(file.size / 1024).toFixed(1)} KB — {file.mimeType}
                        </p>
                      </div>
                    </div>
                    <Button
                      asChild
                      size="sm"
                      variant="secondary"
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
        </div>
      </main>
    </div>
  );
}
