import { useState } from "react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateCodeShare } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { CreateCodeShareBodyExpiresIn } from "@workspace/api-client-react/src/generated/api.schemas";

const LANGUAGES = [
  "plaintext",
  "javascript",
  "typescript",
  "python",
  "go",
  "rust",
  "java",
  "cpp",
  "csharp",
  "ruby",
  "php",
  "swift",
  "kotlin",
  "sql",
  "html",
  "css",
  "json",
  "yaml",
  "markdown",
  "shell",
];

export function CodeEditor() {
  const [content, setContent] = useState("");
  const [language, setLanguage] = useState("plaintext");
  const [title, setTitle] = useState("");
  const [expiresIn, setExpiresIn] = useState<CreateCodeShareBodyExpiresIn>("permanent");
  
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const createCodeShare = useCreateCodeShare();

  const handleShare = () => {
    if (!content.trim()) {
      toast({
        title: "Empty content",
        description: "Please enter some code to share.",
        variant: "destructive",
      });
      return;
    }

    createCodeShare.mutate(
      {
        data: {
          content,
          language,
          title: title.trim() || undefined,
          expiresIn,
        },
      },
      {
        onSuccess: (share) => {
          toast({
            title: "Shared successfully",
            description: "Your code snippet is now available.",
          });
          setLocation(`/${share.id}`);
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to create share. Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Label htmlFor="title" className="sr-only">Title (optional)</Label>
          <Input
            id="title"
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-card font-mono text-sm"
          />
        </div>
        <div className="w-full sm:w-48">
          <Label htmlFor="language" className="sr-only">Language</Label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger id="language" className="bg-card font-mono text-sm">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang} value={lang} className="font-mono text-sm">
                  {lang}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-48">
          <Label htmlFor="expires" className="sr-only">Expires</Label>
          <Select value={expiresIn} onValueChange={(val) => setExpiresIn(val as CreateCodeShareBodyExpiresIn)}>
            <SelectTrigger id="expires" className="bg-card font-mono text-sm">
              <SelectValue placeholder="Expires in" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h" className="font-mono text-sm">1 Hour</SelectItem>
              <SelectItem value="24h" className="font-mono text-sm">24 Hours</SelectItem>
              <SelectItem value="permanent" className="font-mono text-sm">Permanent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border border-border rounded-md overflow-hidden h-[400px]">
        <Editor
          height="100%"
          language={language}
          theme="vs-dark"
          value={content}
          onChange={(val) => setContent(val || "")}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "JetBrains Mono, monospace",
            lineHeight: 1.5,
            padding: { top: 16, bottom: 16 },
            scrollBeyondLastLine: false,
            roundedSelection: false,
            scrollbar: {
              useShadows: false,
              verticalScrollbarSize: 10,
            },
          }}
        />
      </div>

      <div className="flex justify-end mt-2">
        <Button 
          onClick={handleShare} 
          disabled={createCodeShare.isPending}
          className="w-full sm:w-auto min-w-[120px] font-mono font-bold uppercase tracking-wider"
        >
          {createCodeShare.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sharing
            </>
          ) : (
            "Share Now"
          )}
        </Button>
      </div>
    </div>
  );
}
