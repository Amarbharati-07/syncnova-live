import { useGetRecentShares } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { History, FileIcon, Code, Clock } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";

export function RecentSharesWidget() {
  const { data: shares, isLoading } = useGetRecentShares();

  if (isLoading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-mono text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
            <History className="h-4 w-4" />
            Recent Shares
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!shares || shares.length === 0) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-mono text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
            <History className="h-4 w-4" />
            Recent Shares
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
            <History className="h-8 w-8 mb-2 opacity-20" />
            <p className="text-sm font-mono">No recent shares</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-mono text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
          <History className="h-4 w-4 text-primary" />
          Recent Shares
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {shares.slice(0, 5).map((share) => (
            <Link 
              key={share.id} 
              href={`/${share.id}`}
              className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors group"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="bg-primary/10 p-1.5 rounded-md flex-shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors text-primary">
                  {share.type === "code" ? (
                    <Code className="h-4 w-4" />
                  ) : (
                    <FileIcon className="h-4 w-4" />
                  )}
                </div>
                <div className="overflow-hidden flex flex-col justify-center">
                  <span className="text-sm font-medium truncate leading-tight">
                    {share.title || (share.type === "code" ? `Code Snippet (${share.language})` : `${share.fileCount} File(s)`)}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono flex items-center gap-1 mt-0.5">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(share.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground font-mono ml-2 flex-shrink-0 bg-background/50 px-1.5 py-0.5 rounded border border-border/40">
                {share.viewCount} views
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
