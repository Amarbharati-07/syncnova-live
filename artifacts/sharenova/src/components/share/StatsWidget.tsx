import { useGetShareStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Code, FileText, Eye } from "lucide-react";

export function StatsWidget() {
  const { data: stats, isLoading } = useGetShareStats();

  if (isLoading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-mono text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
            <Activity className="h-4 w-4" />
            Platform Stats
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  return (
    <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-mono text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
          <Activity className="h-4 w-4 text-primary" />
          Platform Stats
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col">
            <span className="text-2xl font-bold font-mono text-foreground">{stats.totalShares.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider mt-1">Total Shares</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold font-mono text-foreground flex items-center gap-2">
              <Eye className="h-5 w-5 text-muted-foreground" />
              {stats.totalViews.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider mt-1">Total Views</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold font-mono text-foreground flex items-center gap-2">
              <Code className="h-5 w-5 text-primary" />
              {stats.codeShares.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider mt-1">Code Snippets</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold font-mono text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5 text-accent-foreground" />
              {stats.fileShares.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider mt-1">File Shares</span>
          </div>
        </div>

        {stats.topLanguages && stats.topLanguages.length > 0 && (
          <div className="mt-6 pt-6 border-t border-border/40">
            <h4 className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-3">Top Languages</h4>
            <div className="flex flex-wrap gap-2">
              {stats.topLanguages.slice(0, 5).map((lang) => (
                <div key={lang.language} className="bg-primary/10 border border-primary/20 text-primary px-2 py-1 rounded text-xs font-mono">
                  {lang.language} <span className="opacity-50">({lang.count})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
