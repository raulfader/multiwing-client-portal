import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Link } from "wouter";
import {
  Plus,
  Trash2,
  Upload,
  Music2,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  Loader2,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  Users,
  FileAudio,
  Folder,
  Film,
  Link2,
  Edit2,
  Globe,
} from "lucide-react";

const MW_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663488436824/MCxqt4HyvEAyGGokboGjqW/MWlogo_8bb403fd.webp";
const FL_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663488436824/iLXUQ5XAKoVQ9DttVq4BTX/faderlabs-logo-white_d7a18ec8.png";

const ACCENT_COLORS = ["#FFD600", "#64DD17", "#EF4444", "#A78BFA", "#38BDF8"];

// ── Create Pillar Form ─────────────────────────────────────────────────────────
function CreatePillarForm({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [open, setOpen] = useState(false);

  const createPillar = trpc.pillars.create.useMutation({
    onSuccess: () => {
      setTitle("");
      setDescription("");
      setOpen(false);
      onCreated();
      toast.success("Pillar created");
    },
    onError: (e) => toast.error(e.message),
  });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fl-btn-primary flex items-center gap-2"
      >
        <Plus size={16} />
        Add Pillar
      </button>
    );
  }

  return (
    <div className="fl-card p-5 space-y-4">
      <h3 className="font-bold text-sm uppercase tracking-widest" style={{ color: "#FFD600" }}>New Pillar</h3>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Pillar title (e.g. Brand Anthem)"
        className="w-full text-sm px-3 py-2.5 rounded-lg outline-none"
        style={{ background: "#111111", border: "1px solid #2A2A2A", color: "#FAFAFA" }}
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        rows={2}
        className="w-full text-sm px-3 py-2.5 rounded-lg outline-none resize-none"
        style={{ background: "#111111", border: "1px solid #2A2A2A", color: "#FAFAFA" }}
      />
      <div className="flex gap-2">
        <button
          onClick={() => createPillar.mutate({ title, description: description || undefined })}
          disabled={!title.trim() || createPillar.isPending}
          className="fl-btn-primary flex-1 justify-center py-2.5 text-sm"
        >
          {createPillar.isPending ? <Loader2 size={14} className="animate-spin" /> : "Create Pillar"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="px-4 py-2.5 rounded-lg text-sm font-semibold"
          style={{ background: "#1A1A1A", color: "#888888", border: "1px solid #2A2A2A" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Upload Track Form ──────────────────────────────────────────────────────────
function UploadTrackForm({ pillarId, trackCount, onUploaded }: { pillarId: number; trackCount: number; onUploaded: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadTrack = trpc.tracks.getUploadUrl.useMutation({
    onSuccess: () => {
      setTitle("");
      setDescription("");
      setFile(null);
      setOpen(false);
      onUploaded();
      toast.success("Track uploaded successfully");
    },
    onError: (e) => {
      toast.error(e.message);
      setUploading(false);
    },
  });

  const handleUpload = async () => {
    if (!file || !title.trim()) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadTrack.mutate({
        pillarId,
        filename: file.name,
        contentType: file.type || "audio/mpeg",
        title,
        description: description || undefined,
        fileBase64: base64,
        sortOrder: trackCount,
      });
      setUploading(false);
    };
    reader.onerror = () => {
      toast.error("Failed to read file");
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  if (trackCount >= 2) {
    return (
      <div className="text-xs py-2 px-3 rounded-lg" style={{ background: "#1A1A1A", color: "#555555" }}>
        Maximum 2 tracks reached for this pillar
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
        style={{ background: "#1A1A1A", color: "#FFD600", border: "1px solid rgba(255,214,0,0.2)" }}
      >
        <Upload size={12} />
        Upload Track {trackCount + 1}
      </button>
    );
  }

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: "#111111", border: "1px solid #2A2A2A" }}>
      <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: "#FFD600" }}>
        Upload Track {trackCount + 1}
      </h4>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Track title"
        className="w-full text-sm px-3 py-2 rounded-lg outline-none"
        style={{ background: "#0A0A0A", border: "1px solid #2A2A2A", color: "#FAFAFA" }}
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        className="w-full text-sm px-3 py-2 rounded-lg outline-none"
        style={{ background: "#0A0A0A", border: "1px solid #2A2A2A", color: "#FAFAFA" }}
      />

      {/* File picker */}
      <div
        onClick={() => fileRef.current?.click()}
        className="flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-colors"
        style={{ background: "#0A0A0A", border: `1px dashed ${file ? "#FFD600" : "#2A2A2A"}` }}
      >
        <FileAudio size={16} style={{ color: file ? "#FFD600" : "#555555" }} />
        <span className="text-sm" style={{ color: file ? "#FAFAFA" : "#555555" }}>
          {file ? file.name : "Click to select audio file (MP3, WAV, AAC…)"}
        </span>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {file && (
        <p className="text-xs" style={{ color: "#888888" }}>
          {(file.size / 1024 / 1024).toFixed(2)} MB · {file.type}
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleUpload}
          disabled={!file || !title.trim() || uploading || uploadTrack.isPending}
          className="fl-btn-primary flex-1 justify-center py-2 text-sm"
        >
          {uploading || uploadTrack.isPending ? (
            <><Loader2 size={14} className="animate-spin" /> Uploading…</>
          ) : (
            <><Upload size={14} /> Upload</>
          )}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="px-3 py-2 rounded-lg text-sm font-semibold"
          style={{ background: "#1A1A1A", color: "#888888", border: "1px solid #2A2A2A" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Pillar Admin Row ───────────────────────────────────────────────────────────
function PillarAdminRow({ pillar, accentColor, onRefresh }: { pillar: any; accentColor: string; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(true);
  const { data: tracks, refetch: refetchTracks } = trpc.tracks.byPillar.useQuery({ pillarId: pillar.id });
  const { data: approvals } = trpc.approvals.byPillar.useQuery({ pillarId: pillar.id });
  const deleteTrack = trpc.tracks.delete.useMutation({
    onSuccess: () => { refetchTracks(); toast.success("Track deleted"); },
    onError: (e) => toast.error(e.message),
  });
  const deletePillar = trpc.pillars.delete.useMutation({
    onSuccess: () => { onRefresh(); toast.success("Pillar deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const approvedCount = approvals?.filter((a) => a.status === "approved").length ?? 0;
  const rejectedCount = approvals?.filter((a) => a.status === "rejected").length ?? 0;

  return (
    <div className="fl-card overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        style={{ borderBottom: expanded ? "1px solid #2A2A2A" : "none" }}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <span className="text-lg font-black" style={{ color: accentColor, opacity: 0.5 }}>
            {String((pillar.sortOrder ?? 0) + 1).padStart(2, "0")}
          </span>
          <div>
            <h3 className="font-bold" style={{ color: "#FAFAFA" }}>{pillar.title}</h3>
            {pillar.description && (
              <p className="text-xs mt-0.5" style={{ color: "#888888" }}>{pillar.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Approval summary */}
          {approvals && approvals.length > 0 && (
            <div className="flex gap-2">
              {approvedCount > 0 && (
                <span className="status-approved text-xs px-2 py-0.5 rounded-full font-semibold">
                  {approvedCount} ✓
                </span>
              )}
              {rejectedCount > 0 && (
                <span className="status-rejected text-xs px-2 py-0.5 rounded-full font-semibold">
                  {rejectedCount} ✗
                </span>
              )}
            </div>
          )}
          <span className="text-xs" style={{ color: "#555555" }}>
            {tracks?.length ?? 0}/2 tracks
          </span>
          {expanded ? <ChevronUp size={16} style={{ color: "#555555" }} /> : <ChevronDown size={16} style={{ color: "#555555" }} />}
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* Tracks */}
          {tracks && tracks.length > 0 && (
            <div className="space-y-2">
              {tracks.map((track, ti) => (
                <div
                  key={track.id}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                  style={{ background: "#111111", border: "1px solid #2A2A2A" }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Music2 size={14} style={{ color: accentColor, flexShrink: 0 }} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "#FAFAFA" }}>{track.title}</p>
                      {track.description && (
                        <p className="text-xs truncate" style={{ color: "#666666" }}>{track.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: "#1A1A1A", color: "#888888" }}>
                      Track {ti + 1}
                    </span>
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${track.title}"?`)) deleteTrack.mutate({ id: track.id });
                      }}
                      className="p-1.5 rounded transition-colors"
                      style={{ color: "#555555" }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#EF4444")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#555555")}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upload form */}
          <UploadTrackForm
            pillarId={pillar.id}
            trackCount={tracks?.length ?? 0}
            onUploaded={() => refetchTracks()}
          />

          {/* Approvals */}
          {approvals && approvals.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#555555" }}>
                Client Decisions
              </p>
              <div className="space-y-1.5">
                {approvals.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg"
                    style={{ background: "#111111", border: "1px solid #2A2A2A" }}
                  >
                    <span className="text-sm" style={{ color: "#CCCCCC" }}>{a.userName ?? "Client"}</span>
                    <div className="flex items-center gap-2">
                      {a.note && (
                        <span className="text-xs italic max-w-32 truncate" style={{ color: "#666666" }}>
                          "{a.note}"
                        </span>
                      )}
                      {a.status === "approved" ? (
                        <span className="status-approved text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                          <CheckCircle2 size={10} /> Approved
                        </span>
                      ) : a.status === "rejected" ? (
                        <span className="status-rejected text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                          <XCircle size={10} /> Changes Requested
                        </span>
                      ) : (
                        <span className="status-pending text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                          <Clock size={10} /> Pending
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Delete pillar */}
          <div className="pt-2" style={{ borderTop: "1px solid #1A1A1A" }}>
            <button
              onClick={() => {
                if (confirm(`Delete pillar "${pillar.title}" and all its tracks?`)) {
                  deletePillar.mutate({ id: pillar.id });
                }
              }}
              className="text-xs flex items-center gap-1.5 transition-colors"
              style={{ color: "#444444" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#EF4444")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#444444")}
            >
              <Trash2 size={12} />
              Delete Pillar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Recent Comments Panel ──────────────────────────────────────────────────────
function RecentComments() {
  const { data: comments } = trpc.comments.all.useQuery();

  return (
    <div className="fl-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare size={16} style={{ color: "#FFD600" }} />
        <h3 className="font-bold text-sm" style={{ color: "#FAFAFA" }}>Recent Comments</h3>
        <span className="text-xs ml-auto" style={{ color: "#555555" }}>{comments?.length ?? 0} total</span>
      </div>
      {!comments || comments.length === 0 ? (
        <p className="text-sm text-center py-6" style={{ color: "#444444" }}>No comments yet</p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {comments.slice(0, 20).map((c) => (
            <div
              key={c.id}
              className="px-3 py-2.5 rounded-lg"
              style={{ background: "#111111", border: "1px solid #1A1A1A" }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold" style={{ color: "#FFD600" }}>
                  {c.userName ?? "Client"}
                </span>
                <span className="text-xs" style={{ color: "#444444" }}>
                  {new Date(c.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm" style={{ color: "#CCCCCC" }}>{c.content}</p>
              {c.timestampSeconds != null && (
                <span className="text-xs mt-1 inline-block font-mono px-1.5 py-0.5 rounded" style={{ background: "#2A2A2A", color: "#888888" }}>
                  @ {Math.floor(c.timestampSeconds / 60)}:{String(c.timestampSeconds % 60).padStart(2, "0")}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Stats Bar ──────────────────────────────────────────────────────────────────
function StatsBar({ pillars, allApprovals, allComments }: { pillars: any[]; allApprovals: any[]; allComments: any[] }) {
  const approved = allApprovals.filter((a) => a.status === "approved").length;
  const rejected = allApprovals.filter((a) => a.status === "rejected").length;
  const pending = allApprovals.filter((a) => a.status === "pending").length;

  const stats = [
    { label: "Pillars", value: pillars.length, icon: LayoutDashboard, color: "#FFD600" },
    { label: "Comments", value: allComments.length, icon: MessageSquare, color: "#A78BFA" },
    { label: "Approved", value: approved, icon: CheckCircle2, color: "#64DD17" },
    { label: "Changes Req.", value: rejected, icon: XCircle, color: "#EF4444" },
    { label: "Pending", value: pending, icon: Clock, color: "#888888" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
      {stats.map((s) => (
        <div key={s.label} className="fl-card p-4 flex items-center gap-3">
          <s.icon size={18} style={{ color: s.color, flexShrink: 0 }} />
          <div>
            <p className="text-xl font-black" style={{ color: "#FAFAFA" }}>{s.value}</p>
            <p className="text-xs" style={{ color: "#555555" }}>{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Create Project Form ────────────────────────────────────────────────────────
function CreateProjectForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("video");
  const [coverImageUrl, setCoverImageUrl] = useState("");

  const createProject = trpc.projects.create.useMutation({
    onSuccess: () => {
      setTitle(""); setSlug(""); setDescription(""); setCoverImageUrl("");
      setOpen(false);
      onCreated();
      toast.success("Project created");
    },
    onError: (e) => toast.error(e.message),
  });

  if (!open) return (
    <button onClick={() => setOpen(true)} className="fl-btn-primary flex items-center gap-2">
      <Plus size={16} /> Add Project
    </button>
  );

  return (
    <div className="fl-card p-5 space-y-3">
      <h3 className="font-bold text-sm uppercase tracking-widest" style={{ color: "#FFD600" }}>New Project</h3>
      <div className="grid grid-cols-2 gap-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="text-sm px-3 py-2.5 rounded-lg outline-none" style={{ background: "#111111", border: "1px solid #2A2A2A", color: "#FAFAFA" }} />
        <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="URL slug (e.g. acrex26)" className="text-sm px-3 py-2.5 rounded-lg outline-none" style={{ background: "#111111", border: "1px solid #2A2A2A", color: "#FAFAFA" }} />
      </div>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" rows={2} className="w-full text-sm px-3 py-2.5 rounded-lg outline-none resize-none" style={{ background: "#111111", border: "1px solid #2A2A2A", color: "#FAFAFA" }} />
      <div className="grid grid-cols-2 gap-3">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="text-sm px-3 py-2.5 rounded-lg outline-none" style={{ background: "#111111", border: "1px solid #2A2A2A", color: "#FAFAFA" }}>
          <option value="video">Video</option>
          <option value="brand">Brand</option>
          <option value="archive">Archive</option>
          <option value="document">Document</option>
          <option value="event">Event</option>
        </select>
        <input value={coverImageUrl} onChange={(e) => setCoverImageUrl(e.target.value)} placeholder="Cover image URL (optional)" className="text-sm px-3 py-2.5 rounded-lg outline-none" style={{ background: "#111111", border: "1px solid #2A2A2A", color: "#FAFAFA" }} />
      </div>
      <div className="flex gap-2">
        <button onClick={() => createProject.mutate({ title, slug, description: description || undefined, category, coverImageUrl: coverImageUrl || undefined })} disabled={!title.trim() || !slug.trim() || createProject.isPending} className="fl-btn-primary flex-1 justify-center py-2.5 text-sm">
          {createProject.isPending ? <Loader2 size={14} className="animate-spin" /> : "Create Project"}
        </button>
        <button onClick={() => setOpen(false)} className="px-4 py-2.5 rounded-lg text-sm font-semibold" style={{ background: "#1A1A1A", color: "#888888", border: "1px solid #2A2A2A" }}>Cancel</button>
      </div>
    </div>
  );
}

// ── Add Deliverable Form ───────────────────────────────────────────────────────
function AddDeliverableForm({ projectId, onCreated }: { projectId: number; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [fileType, setFileType] = useState("video");

  const create = trpc.deliverables.create.useMutation({
    onSuccess: () => {
      setTitle(""); setDescription(""); setDownloadUrl(""); setThumbnailUrl("");
      setOpen(false);
      onCreated();
      toast.success("Deliverable added");
    },
    onError: (e) => toast.error(e.message),
  });

  if (!open) return (
    <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: "rgba(255,214,0,0.1)", color: "#FFD600", border: "1px solid rgba(255,214,0,0.2)" }}>
      <Plus size={12} /> Add Deliverable
    </button>
  );

  return (
    <div className="mt-3 p-4 rounded-lg space-y-3" style={{ background: "#111111", border: "1px solid #2A2A2A" }}>
      <div className="grid grid-cols-2 gap-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="text-xs px-3 py-2 rounded-lg outline-none" style={{ background: "#0A0A0A", border: "1px solid #2A2A2A", color: "#FAFAFA" }} />
        <select value={fileType} onChange={(e) => setFileType(e.target.value)} className="text-xs px-3 py-2 rounded-lg outline-none" style={{ background: "#0A0A0A", border: "1px solid #2A2A2A", color: "#FAFAFA" }}>
          <option value="video">Video</option>
          <option value="document">Document</option>
          <option value="archive">Archive</option>
          <option value="image">Image</option>
        </select>
      </div>
      <input value={downloadUrl} onChange={(e) => setDownloadUrl(e.target.value)} placeholder="Download / link URL" className="w-full text-xs px-3 py-2 rounded-lg outline-none" style={{ background: "#0A0A0A", border: "1px solid #2A2A2A", color: "#FAFAFA" }} />
      <input value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} placeholder="Thumbnail image URL (optional)" className="w-full text-xs px-3 py-2 rounded-lg outline-none" style={{ background: "#0A0A0A", border: "1px solid #2A2A2A", color: "#FAFAFA" }} />
      <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className="w-full text-xs px-3 py-2 rounded-lg outline-none" style={{ background: "#0A0A0A", border: "1px solid #2A2A2A", color: "#FAFAFA" }} />
      <div className="flex gap-2">
        <button onClick={() => create.mutate({ projectId, title, description: description || undefined, downloadUrl: downloadUrl || undefined, thumbnailUrl: thumbnailUrl || undefined, fileType })} disabled={!title.trim() || create.isPending} className="fl-btn-primary flex-1 justify-center py-2 text-xs">
          {create.isPending ? <Loader2 size={12} className="animate-spin" /> : "Add"}
        </button>
        <button onClick={() => setOpen(false)} className="px-3 py-2 rounded-lg text-xs font-semibold" style={{ background: "#1A1A1A", color: "#888888", border: "1px solid #2A2A2A" }}>Cancel</button>
      </div>
    </div>
  );
}

// ── Project Admin Row ──────────────────────────────────────────────────────────
function ProjectAdminRow({ project, onRefresh }: { project: any; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const { data: deliverables, refetch: refetchDeliverables } = trpc.deliverables.byProject.useQuery(
    { projectId: project.id },
    { enabled: expanded }
  );

  const deleteProject = trpc.projects.delete.useMutation({
    onSuccess: () => { onRefresh(); toast.success("Project deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const deleteDeliverable = trpc.deliverables.delete.useMutation({
    onSuccess: () => { refetchDeliverables(); toast.success("Deliverable removed"); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="fl-card overflow-hidden">
      <div className="p-4 flex items-center gap-3">
        {project.coverImageUrl ? (
          <img src={project.coverImageUrl} alt={project.title} className="w-14 h-10 object-cover rounded" />
        ) : (
          <div className="w-14 h-10 rounded flex items-center justify-center" style={{ background: "#1A1A1A" }}>
            <Folder size={16} style={{ color: "#444" }} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm" style={{ color: "#FAFAFA" }}>{project.title}</span>
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(255,214,0,0.1)", color: "#FFD600" }}>{project.category}</span>
          </div>
          <p className="text-xs" style={{ color: "#555" }}>/projects/{project.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          <a href={`/projects/${project.slug}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded" style={{ color: "#888" }}>
            <Globe size={14} />
          </a>
          <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded" style={{ color: "#888" }}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button onClick={() => { if (confirm(`Delete project "${project.title}"?`)) deleteProject.mutate({ id: project.id }); }} className="p-1.5 rounded" style={{ color: "#EF4444" }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4" style={{ borderTop: "1px solid #1A1A1A" }}>
          <div className="pt-3 space-y-2">
            {!deliverables || deliverables.length === 0 ? (
              <p className="text-xs py-2" style={{ color: "#555" }}>No deliverables yet.</p>
            ) : (
              deliverables.map((d: any) => (
                <div key={d.id} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: "#111", border: "1px solid #2A2A2A" }}>
                  {d.thumbnailUrl && <img src={d.thumbnailUrl} alt={d.title} className="w-10 h-7 object-cover rounded" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: "#FAFAFA" }}>{d.title}</p>
                    <p className="text-xs" style={{ color: "#555" }}>{d.fileType}</p>
                  </div>
                  {d.downloadUrl && (
                    <a href={d.downloadUrl} target="_blank" rel="noopener noreferrer" className="p-1 rounded" style={{ color: "#FFD600" }}>
                      <Link2 size={12} />
                    </a>
                  )}
                  <button onClick={() => deleteDeliverable.mutate({ id: d.id })} className="p-1 rounded" style={{ color: "#EF4444" }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
            <AddDeliverableForm projectId={project.id} onCreated={refetchDeliverables} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Admin Page ─────────────────────────────────────────────────────────────────
export default function Admin() {
  const { user, loading, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<"sonic" | "projects">("projects");
  const { data: pillars, refetch: refetchPillars, isLoading: pillarsLoading } = trpc.pillars.list.useQuery();
  const { data: allApprovals } = trpc.approvals.all.useQuery();
  const { data: allComments } = trpc.comments.all.useQuery();
  const { data: projects, refetch: refetchProjects, isLoading: projectsLoading } = trpc.projects.listAdmin.useQuery();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0A0A" }}>
        <Loader2 size={24} className="animate-spin" style={{ color: "#FFD600" }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0A0A" }}>
        <div className="text-center">
          <p className="mb-4" style={{ color: "#888888" }}>Please sign in to access admin.</p>
          <a href="/" className="fl-btn-primary">Go to Portal</a>
        </div>
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0A0A" }}>
        <div className="text-center">
          <p className="text-lg font-bold mb-2" style={{ color: "#EF4444" }}>Access Denied</p>
          <p className="mb-4" style={{ color: "#888888" }}>Admin access required.</p>
          <Link href="/" className="fl-btn-primary">Back to Portal</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#0A0A0A" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50"
        style={{ background: "rgba(10,10,10,0.95)", borderBottom: "1px solid #1A1A1A", backdropFilter: "blur(12px)" }}
      >
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <img src={FL_LOGO} alt="Faderlabs" className="h-6 object-contain" />
            <div className="w-px h-5" style={{ background: "#2A2A2A" }} />
            <img src={MW_LOGO} alt="MultiWing" className="h-8 object-contain" />
            <div className="w-px h-5" style={{ background: "#2A2A2A" }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#FFD600" }}>
              Admin Dashboard
            </span>
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 text-sm transition-colors"
            style={{ color: "#888888" }}
          >
            <ArrowLeft size={14} />
            Client View
          </Link>
        </div>
      </header>

      <main className="container py-8 pb-16">
        {/* Stats */}
        {pillars && allApprovals && allComments && (
          <StatsBar pillars={pillars} allApprovals={allApprovals} allComments={allComments} />
        )}

        {/* Tab Navigation */}
        <div className="flex gap-1 p-1 rounded-xl w-fit mb-8" style={{ background: "#141414", border: "1px solid #2A2A2A" }}>
          <button
            onClick={() => setActiveTab("projects")}
            className="px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
            style={activeTab === "projects" ? { background: "#FFD600", color: "#0A0A0A" } : { color: "#888888" }}
          >
            <Folder size={14} /> Projects
          </button>
          <button
            onClick={() => setActiveTab("sonic")}
            className="px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
            style={activeTab === "sonic" ? { background: "#FFD600", color: "#0A0A0A" } : { color: "#888888" }}
          >
            <Music2 size={14} /> Sonic Branding
          </button>
        </div>

        {/* Projects Tab */}
        {activeTab === "projects" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-black" style={{ color: "#FAFAFA" }}>Content Hub Projects</h2>
                <CreateProjectForm onCreated={refetchProjects} />
              </div>
              {projectsLoading ? (
                <div className="flex items-center justify-center py-16 gap-3" style={{ color: "#555555" }}>
                  <Loader2 size={18} className="animate-spin" /><span>Loading…</span>
                </div>
              ) : !projects || projects.length === 0 ? (
                <div className="fl-card p-10 text-center">
                  <Folder size={32} className="mx-auto mb-3 opacity-20" style={{ color: "#FFD600" }} />
                  <p className="font-bold mb-1" style={{ color: "#FAFAFA" }}>No projects yet</p>
                  <p className="text-sm" style={{ color: "#555555" }}>Create your first project above.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {projects.map((project: any) => (
                    <ProjectAdminRow key={project.id} project={project} onRefresh={refetchProjects} />
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-4">
              <RecentComments />
              <div className="fl-card p-5">
                <h3 className="font-bold text-sm mb-3" style={{ color: "#FFD600" }}>Projects Guide</h3>
                <div className="space-y-2 text-xs" style={{ color: "#888888" }}>
                  <p>1. Create a project with a unique URL slug</p>
                  <p>2. Expand the project to add deliverables</p>
                  <p>3. Each deliverable can have a thumbnail, download link, and description</p>
                  <p>4. Clients can comment on individual deliverables</p>
                  <p>5. You get notified on every comment</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sonic Branding Tab */}
        {activeTab === "sonic" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-black" style={{ color: "#FAFAFA" }}>Sonic Branding Pillars</h2>
                <CreatePillarForm onCreated={refetchPillars} />
              </div>
              {pillarsLoading ? (
                <div className="flex items-center justify-center py-16 gap-3" style={{ color: "#555555" }}>
                  <Loader2 size={18} className="animate-spin" /><span>Loading…</span>
                </div>
              ) : !pillars || pillars.length === 0 ? (
                <div className="fl-card p-10 text-center">
                  <Music2 size={32} className="mx-auto mb-3 opacity-20" style={{ color: "#FFD600" }} />
                  <p className="font-bold mb-1" style={{ color: "#FAFAFA" }}>No pillars yet</p>
                  <p className="text-sm" style={{ color: "#555555" }}>Create your first sonic branding pillar above.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pillars.map((pillar, i) => (
                    <PillarAdminRow
                      key={pillar.id}
                      pillar={{ ...pillar, sortOrder: i }}
                      accentColor={ACCENT_COLORS[i % ACCENT_COLORS.length]}
                      onRefresh={refetchPillars}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-4">
              <RecentComments />
              <div className="fl-card p-5">
                <h3 className="font-bold text-sm mb-3" style={{ color: "#FFD600" }}>Sonic Guide</h3>
                <div className="space-y-2 text-xs" style={{ color: "#888888" }}>
                  <p>1. Create pillars (e.g. "Brand Anthem", "UI Sounds")</p>
                  <p>2. Upload exactly 2 tracks per pillar</p>
                  <p>3. Share the portal URL with your client</p>
                  <p>4. Clients listen, comment, and approve/reject</p>
                  <p>5. You get notified on every action</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
