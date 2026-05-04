import { Suspense, lazy } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

const Home = lazy(() => import("@/pages/Home"));
const ShareRoom = lazy(() => import("@/pages/ShareRoom"));
const ShareCodeOnline = lazy(() => import("@/pages/ShareCodeOnline"));
const ShareZipFilesOnline = lazy(() => import("@/pages/ShareZipFilesOnline"));
const PasteCodeAndShareLink = lazy(() => import("@/pages/PasteCodeAndShareLink"));
const InstantFileSharing = lazy(() => import("@/pages/InstantFileSharing"));

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/share" component={Home} />
      <Route path="/upload" component={Home} />
      <Route path="/live" component={Home} />
      <Route path="/share-code-online" component={ShareCodeOnline} />
      <Route path="/share-zip-files-online" component={ShareZipFilesOnline} />
      <Route path="/paste-code-and-share-link" component={PasteCodeAndShareLink} />
      <Route path="/instant-file-sharing" component={InstantFileSharing} />
      <Route path="/share/:id" component={ShareRoom} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Suspense fallback={<div className="min-h-screen bg-slate-950 text-white p-6">Loading…</div>}>
            <Router />
          </Suspense>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
