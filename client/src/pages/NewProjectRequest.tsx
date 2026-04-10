import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, X, FileIcon, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

interface UploadedFile {
  name: string;
  url: string;
  key: string;
  size: number;
  type: string;
}

interface PendingFile {
  file: File;
  progress: number; // 0-100
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
  uploaded?: UploadedFile;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function NewProjectRequest() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitterName, setSubmitterName] = useState("");
  const [submitterEmail, setSubmitterEmail] = useState("");
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getUploadUrl = trpc.clientRequests.getUploadUrl.useMutation();
  const submitRequest = trpc.clientRequests.submit.useMutation();

  const uploadFileToS3 = useCallback(async (file: File, index: number): Promise<UploadedFile | null> => {
    try {
      // Get presigned URL
      const { uploadUrl, fileKey, publicUrl } = await getUploadUrl.mutateAsync({
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
      });

      // Upload directly to S3 using XHR for progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setPendingFiles((prev) =>
              prev.map((pf, i) => (i === index ? { ...pf, progress: pct } : pf))
            );
          }
        });
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed: ${xhr.status}`));
        });
        xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.send(file);
      });

      const uploaded: UploadedFile = {
        name: file.name,
        url: publicUrl,
        key: fileKey,
        size: file.size,
        type: file.type || "application/octet-stream",
      };

      setPendingFiles((prev) =>
        prev.map((pf, i) => (i === index ? { ...pf, status: "done", progress: 100, uploaded } : pf))
      );
      return uploaded;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setPendingFiles((prev) =>
        prev.map((pf, i) => (i === index ? { ...pf, status: "error", error: msg } : pf))
      );
      return null;
    }
  }, [getUploadUrl]);

  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files);
    setPendingFiles((prev) => {
      const startIdx = prev.length;
      const newEntries: PendingFile[] = arr.map((f) => ({
        file: f,
        progress: 0,
        status: "uploading" as const,
      }));
      // Start uploads
      arr.forEach((f, i) => {
        uploadFileToS3(f, startIdx + i);
      });
      return [...prev, ...newEntries];
    });
  }, [uploadFileToS3]);

  const removeFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !submitterName.trim() || !submitterEmail.trim()) {
      toast.error("Please fill in title, your name, and email.");
      return;
    }

    const uploading = pendingFiles.filter((f) => f.status === "uploading" || f.status === "pending");
    if (uploading.length > 0) {
      toast.error("Please wait for all files to finish uploading.");
      return;
    }

    const uploadedFiles = pendingFiles
      .filter((f) => f.status === "done" && f.uploaded)
      .map((f) => f.uploaded!);

    try {
      await submitRequest.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        submitterName: submitterName.trim(),
        submitterEmail: submitterEmail.trim(),
        files: uploadedFiles,
      });
      setSubmitted(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submission failed";
      toast.error(msg);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
        <Card className="max-w-md w-full bg-[#111] border-white/10 text-center">
          <CardContent className="pt-10 pb-10 flex flex-col items-center gap-4">
            <CheckCircle2 className="w-16 h-16 text-green-400" />
            <h2 className="text-2xl font-bold text-white">Request Submitted!</h2>
            <p className="text-white/60 text-sm leading-relaxed">
              Your project request has been received. The Faderlabs team will review it and get back to you shortly.
            </p>
            <Link href="/">
              <Button variant="outline" className="mt-4 border-white/20 text-white hover:bg-white/10 bg-transparent">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Portal
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/10">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-white">New Project Request</h1>
          <p className="text-xs text-white/40">Multi-Wing Content Hub</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Tell us about your project</h2>
          <p className="text-white/50 text-sm">
            Share your brief, reference files, and any relevant materials. Our team will review and reach out to you.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contact Info */}
          <Card className="bg-[#111] border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base">Your Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-white/70 text-sm">Full Name <span className="text-red-400">*</span></Label>
                  <Input
                    value={submitterName}
                    onChange={(e) => setSubmitterName(e.target.value)}
                    placeholder="Jane Smith"
                    required
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white/70 text-sm">Email <span className="text-red-400">*</span></Label>
                  <Input
                    type="email"
                    value={submitterEmail}
                    onChange={(e) => setSubmitterEmail(e.target.value)}
                    placeholder="jane@company.com"
                    required
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30"
                  />
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Project Details */}
          <Card className="bg-[#111] border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base">Project Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-white/70 text-sm">Project Title <span className="text-red-400">*</span></Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Brand Identity Sound Design"
                  required
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/70 text-sm">Description <span className="text-white/30 text-xs">(optional)</span></Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your project, goals, timeline, or any other relevant details..."
                  rows={4}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30 resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* File Upload */}
          <Card className="bg-[#111] border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base">Files</CardTitle>
              <CardDescription className="text-white/40 text-xs">
                Upload any reference materials, briefs, videos, or assets. No file size limits.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? "border-white/40 bg-white/5"
                    : "border-white/15 hover:border-white/30 hover:bg-white/5"
                }`}
              >
                <Upload className="w-8 h-8 text-white/30 mx-auto mb-3" />
                <p className="text-white/60 text-sm font-medium">Drop files here or click to browse</p>
                <p className="text-white/30 text-xs mt-1">Any file type · No size limit</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
                />
              </div>

              {/* File list */}
              {pendingFiles.length > 0 && (
                <div className="space-y-2">
                  {pendingFiles.map((pf, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2.5">
                      <FileIcon className="w-4 h-4 text-white/40 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-white/80 text-sm truncate">{pf.file.name}</span>
                          <span className="text-white/30 text-xs shrink-0">{formatBytes(pf.file.size)}</span>
                        </div>
                        {pf.status === "uploading" && (
                          <div className="mt-1.5">
                            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-white/60 rounded-full transition-all duration-300"
                                style={{ width: `${pf.progress}%` }}
                              />
                            </div>
                            <span className="text-white/30 text-xs mt-0.5 block">{pf.progress}%</span>
                          </div>
                        )}
                        {pf.status === "error" && (
                          <span className="text-red-400 text-xs mt-0.5 block">{pf.error}</span>
                        )}
                      </div>
                      <div className="shrink-0">
                        {pf.status === "uploading" && <Loader2 className="w-4 h-4 text-white/40 animate-spin" />}
                        {pf.status === "done" && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                        {(pf.status === "error" || pf.status === "done") && (
                          <button
                            type="button"
                            onClick={() => removeFile(i)}
                            className="ml-1 text-white/30 hover:text-white/60 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-1">
                    <Badge variant="outline" className="border-white/15 text-white/40 text-xs">
                      {pendingFiles.filter((f) => f.status === "done").length} / {pendingFiles.length} uploaded
                    </Badge>
                    {pendingFiles.some((f) => f.status === "error") && (
                      <button
                        type="button"
                        onClick={() => setPendingFiles((prev) => prev.filter((f) => f.status !== "error"))}
                        className="text-red-400/70 hover:text-red-400 text-xs transition-colors"
                      >
                        Remove failed
                      </button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit */}
          <Button
            type="submit"
            disabled={submitRequest.isPending || pendingFiles.some((f) => f.status === "uploading")}
            className="w-full bg-white text-black hover:bg-white/90 font-semibold h-11"
          >
            {submitRequest.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : pendingFiles.some((f) => f.status === "uploading") ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Waiting for uploads...
              </>
            ) : (
              "Submit Project Request"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
