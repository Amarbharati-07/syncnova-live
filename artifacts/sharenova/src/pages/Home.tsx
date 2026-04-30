import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeEditor } from "@/components/share/CodeEditor";
import { FileUploader } from "@/components/share/FileUploader";
import { Header } from "@/components/layout/Header";
import { Code2, FileStack } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Header />
      <main className="flex-1 container mx-auto p-4 md:p-6 lg:p-8 max-w-3xl flex flex-col">
        <div className="mb-6">
          <h1 className="text-3xl font-bold font-mono tracking-tight mb-2">Create New Share</h1>
          <p className="text-muted-foreground text-sm">Instantly share code snippets or files securely.</p>
        </div>

        <Tabs defaultValue="code" className="w-full">
          <TabsList className="w-full grid grid-cols-2 mb-6 bg-card border border-border h-12">
            <TabsTrigger value="code" className="font-mono text-sm uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Code2 className="h-4 w-4 mr-2" />
              Code Snippet
            </TabsTrigger>
            <TabsTrigger value="file" className="font-mono text-sm uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FileStack className="h-4 w-4 mr-2" />
              File Upload
            </TabsTrigger>
          </TabsList>
          <TabsContent value="code" className="mt-0">
            <div className="bg-card/30 border border-border rounded-xl p-4 md:p-6 shadow-sm backdrop-blur-sm">
              <CodeEditor />
            </div>
          </TabsContent>
          <TabsContent value="file" className="mt-0">
            <div className="bg-card/30 border border-border rounded-xl p-4 md:p-6 shadow-sm backdrop-blur-sm">
              <FileUploader />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
