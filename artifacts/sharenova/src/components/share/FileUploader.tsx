import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { UploadCloud, X, Loader2, FileIcon } from "lucide-react";
import type { CreateFileShareBodyExpiresIn } from "@workspace/api-client-react";
import { ShareSuccessDialog } from "./ShareSuccessDialog";

export function FileUploader() {
  const [files, setFiles] = useState<File[]>([]);
  const [expiresIn, setExpiresIn] = useState<CreateFileShareBodyExpiresIn>("permanent");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [createdShareId, setCreatedShareId] = useState<string | null>(null);

  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      setFiles((prev) => [...prev, ...droppedFiles]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (indexToRemove: number) => {
    setFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      formData.append("expiresIn", expiresIn);

      const res = await fetch("/api/share/files", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to upload files");

      const share = await res.json();
      setCreatedShareId(share.id);
    } catch {
      toast({
        title: "Upload failed",
        description: "There was an error uploading your files. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      {createdShareId && (
        <ShareSuccessDialog
          shareId={createdShareId}
          onClose={() => setCreatedShareId(null)}
        />
      )}

      <div className="flex flex-col gap-4">
        <div className="flex justify-end">
          <div className="w-full sm:w-48">
            <Label htmlFor="file-expires" className="sr-only">Expires</Label>
            <Select value={expiresIn} onValueChange={(val) => setExpiresIn(val as CreateFileShareBodyExpiresIn)}>
              <SelectTrigger id="file-expires" className="bg-card font-mono text-sm" data-testid="select-file-expiry">
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

        <div
          className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors flex flex-col items-center justify-center min-h-[300px] cursor-pointer ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-card/50"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById("file-upload")?.click()}
          data-testid="dropzone"
        >
          <UploadCloud className={`h-12 w-12 mb-4 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
          <h3 className="text-lg font-medium mb-1">Drag & drop files here</h3>
          <p className="text-sm text-muted-foreground mb-4">or click to browse from your computer</p>
          <div className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md font-mono text-sm font-bold uppercase tracking-wider transition-colors inline-flex items-center justify-center">
            Select Files
          </div>
          <input
            id="file-upload"
            type="file"
            className="hidden"
            multiple
            onChange={handleFileSelect}
            data-testid="input-file-upload"
          />
        </div>

        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-medium font-mono text-muted-foreground uppercase tracking-wider mb-2">
              Selected Files ({files.length})
            </h4>
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between p-3 bg-card border border-border rounded-md group"
                  data-testid={`file-item-${index}`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileIcon className="h-5 w-5 text-primary flex-shrink-0" />
                    <div className="overflow-hidden">
                      <p className="text-sm font-medium truncate" title={file.name}>{file.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                    data-testid={`button-remove-file-${index}`}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Remove file</span>
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4">
              <Button
                onClick={handleUpload}
                disabled={isUploading}
                className="w-full sm:w-auto min-w-[160px] font-mono font-bold uppercase tracking-wider"
                data-testid="button-share-files"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Share Files"
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
