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
  Check
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import Editor from "@monaco-editor/react";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export default function ShareView() {
  const params = useParams<{ id: string }>();
  const id = params.id || "";
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data: share, isLoading, error } = useGetShare(id, {
    query: {
      enabled: !!id,
      queryKey: getGetShareQueryKey(id),
    }
  });

  const deleteShare = useDeleteShare({
    mutation: {
      onSuccess: () => {
        toast({
          title: "Share deleted",
          description: "The share has been successfully removed.",
        });
        setLocation("/");
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to delete the share.",
          variant: "destructive",
        });
      }
    }
  });

  const copyUrl = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copied!",
      description: "Share URL copied to clipboard.",
    });
  };

  const copyCode = () => {
    if (share?.content) {
      navigator.clipboard.writeText(share.content);
      toast({
        title: "Copied!",
        description: "Code copied to clipboard.",
      });
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
        <main className="flex-1 container mx-auto p-4 md:p-6 lg:p-8 max-w-2xl flex flex-col items-center justify-center text-center">
          <div className="bg-destructive/10 text-destructive p-4 rounded-full mb-4">
            <ExternalLink className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold font-mono mb-2">Share not found</h1>
          <p className="text-muted-foreground mb-8">This share may have expired or been deleted.</p>
          <Link href="/">
            <Button>Create New Share</Button>
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-6 lg:p-8 max-w-5xl flex flex-col gap-6">
        
        {/* Top bar with URL and Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/30 border border-border p-4 rounded-xl backdrop-blur-sm">
          <div className="flex-1 flex flex-col gap-2 w-full">
            <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Share URL</span>
            <div className="flex gap-2 w-full max-w-lg">
              <Input 
                value={window.location.href} 
                readOnly 
                className="font-mono text-sm bg-background/50 border-border"
              />
              <Button onClick={copyUrl} variant="secondary" className="shrink-0 font-mono uppercase tracking-wider text-xs">
                {copied ? <Check className="h-4 w-4 mr-2 text-green-500" /> : <Copy className="h-4 w-4 mr-2" />}
                {copied ? "Copied" : "Copy URL"}
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-border/50">
            <Link href="/">
              <Button variant="outline" size="sm" className="font-mono uppercase tracking-wider text-xs w-full md:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                New
              </Button>
            </Link>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => deleteShare.mutate({ id })}
              disabled={deleteShare.isPending}
              className="font-mono uppercase tracking-wider text-xs w-full md:w-auto"
            >
              {deleteShare.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Title and Meta */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl md:text-3xl font-bold font-mono flex items-center gap-3">
            <div className="bg-primary/10 text-primary p-2 rounded-lg">
              {share.type === "code" ? <Code className="h-6 w-6" /> : <FileIcon className="h-6 w-6" />}
            </div>
            {share.title || (share.type === "code" ? "Untitled Snippet" : "Shared Files")}
          </h1>
          
          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground font-mono">
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {formatDistanceToNow(new Date(share.createdAt), { addSuffix: true })}
            </div>
            <div className="flex items-center gap-1.5">
              <Eye className="h-4 w-4" />
              {share.viewCount} views
            </div>
            {share.expiresAt && (
              <div className="flex items-center gap-1.5 text-amber-500/80">
                Expires: {format(new Date(share.expiresAt), "MMM d, yyyy HH:mm")}
              </div>
            )}
            {share.type === "code" && share.language && (
              <div className="flex items-center gap-1.5 bg-secondary px-2 py-0.5 rounded border border-border">
                {share.language}
              </div>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-card/50 border border-border rounded-xl overflow-hidden mt-4">
          {share.type === "code" ? (
            <div className="relative group">
              <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="sm" variant="secondary" onClick={copyCode} className="font-mono text-xs uppercase tracking-wider backdrop-blur-md bg-background/80">
                  <Copy className="h-3 w-3 mr-2" />
                  Copy Code
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
              <h3 className="text-lg font-medium font-mono mb-4 flex items-center gap-2">
                <FileIcon className="h-5 w-5 text-primary" />
                Files ({share.files?.length || 0})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {share.files?.map((file, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-background border border-border rounded-lg group hover:border-primary/50 transition-colors">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="bg-secondary p-2 rounded text-muted-foreground">
                        <FileIcon className="h-5 w-5" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-medium text-sm truncate" title={file.name}>{file.name}</p>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          {(file.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                    <Button asChild size="sm" variant="secondary" className="ml-4 shrink-0 font-mono text-xs uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                      <a href={file.url} download={file.name}>
                        <Download className="h-3 w-3 mr-2" />
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
