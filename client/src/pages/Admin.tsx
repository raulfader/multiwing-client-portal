import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import React, { useState, useRef } from "react";
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
  ImagePlus,
  X,
  Mail,
  Send,
  UserPlus,
  History,
  GripVertical,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ── Email Notifications Tab ────────────────────────────────────────────────────
function EmailNotificationsTab({ projects }: { projects: any[] }) {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(projects[0]?.id ?? null);
  const [subject, setSubject] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [selectedContactIds, setSelectedContactIds] = useState<number[]>([]);
  const [addFirstName, setAddFirstName] = useState("");
  const [addLastName, setAddLastName] = useState("");
  const [addEmail, setAddEmail] = useState("");

  const { data: contacts, refetch: refetchContacts } = trpc.contacts.list.useQuery(
    { projectId: selectedProjectId! },
    { enabled: selectedProjectId != null }
  );
  const { data: emailLogs, refetch: refetchLogs } = trpc.email.log.useQuery(
    { projectId: selectedProjectId! },
    { enabled: selectedProjectId != null }
  );

  const addContact = trpc.contacts.add.useMutation({
    onSuccess: () => {
      setAddFirstName(""); setAddLastName(""); setAddEmail("");
      refetchContacts();
      toast.success("Contact added");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteContact = trpc.contacts.delete.useMutation({
    onSuccess: () => { refetchContacts(); toast.success("Contact removed"); },
    onError: (e) => toast.error(e.message),
  });

  const sendNotification = trpc.email.sendNotification.useMutation({
    onSuccess: (data) => {
      const sent = data.results.filter((r) => r.success).length;
      const failed = data.results.filter((r) => !r.success).length;
      toast.success(`Sent to ${sent} contact${sent !== 1 ? "s" : ""}${failed > 0 ? `, ${failed} failed` : ""}`);
      setSubject(""); setCustomMessage(""); setSelectedContactIds([]);
      refetchLogs();
    },
    onError: (e) => toast.error(e.message),
  });

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const toggleContact = (id: number) => {
    setSelectedContactIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        {/* Project selector */}
        <div>
          <label className="text-xs font-bold uppercase tracking-widest mb-2 block" style={{ color: "#FFD600" }}>Select Project</label>
          <select
            value={selectedProjectId ?? ""}
            onChange={(e) => { setSelectedProjectId(Number(e.target.value)); setSelectedContactIds([]); }}
            className="w-full text-sm px-3 py-2.5 rounded-lg outline-none"
            style={{ background: "#141414", border: "1px solid #2A2A2A", color: "#FAFAFA" }}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>

        {/* Contacts */}
        <div className="fl-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Users size={16} style={{ color: "#FFD600" }} />
            <h3 className="font-bold text-sm" style={{ color: "#FAFAFA" }}>Contacts for {selectedProject?.title}</h3>
            <span className="text-xs ml-auto" style={{ color: "#555" }}>{contacts?.length ?? 0} contact{contacts?.length !== 1 ? "s" : ""}</span>
          </div>

          {/* Add contact form */}
          <div className="grid grid-cols-3 gap-2">
            <input value={addFirstName} onChange={(e) => setAddFirstName(e.target.value)} placeholder="First name *" className="text-xs px-3 py-2 rounded-lg outline-none" style={{ background: "#111", border: "1px solid #2A2A2A", color: "#FAFAFA" }} />
            <input value={addLastName} onChange={(e) => setAddLastName(e.target.value)} placeholder="Last name" className="text-xs px-3 py-2 rounded-lg outline-none" style={{ background: "#111", border: "1px solid #2A2A2A", color: "#FAFAFA" }} />
            <input value={addEmail} onChange={(e) => setAddEmail(e.target.value)} placeholder="Email *" type="email" className="text-xs px-3 py-2 rounded-lg outline-none" style={{ background: "#111", border: "1px solid #2A2A2A", color: "#FAFAFA" }} />
          </div>
          <button
            onClick={() => selectedProjectId && addContact.mutate({ projectId: selectedProjectId, firstName: addFirstName, lastName: addLastName || undefined, email: addEmail })}
            disabled={!addFirstName.trim() || !addEmail.trim() || addContact.isPending}
            className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg"
            style={{ background: "rgba(255,214,0,0.1)", color: "#FFD600", border: "1px solid rgba(255,214,0,0.2)" }}
          >
            {addContact.isPending ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />}
            Add Contact
          </button>

          {/* Contact list */}
          {contacts && contacts.length > 0 ? (
            <div className="space-y-2">
              {contacts.map((c: any) => (
                <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: "#111", border: `1px solid ${selectedContactIds.includes(c.id) ? "rgba(255,214,0,0.4)" : "#2A2A2A"}` }}>
                  <input
                    type="checkbox"
                    checked={selectedContactIds.includes(c.id)}
                    onChange={() => toggleContact(c.id)}
                    className="accent-yellow-400"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: "#FAFAFA" }}>{c.firstName}{c.lastName ? " " + c.lastName : ""}</p>
                    <p className="text-xs" style={{ color: "#555" }}>{c.email}</p>
                  </div>
                  <button onClick={() => deleteContact.mutate({ id: c.id })} className="p-1 rounded" style={{ color: "#EF4444" }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-center py-4" style={{ color: "#444" }}>No contacts yet. Add one above.</p>
          )}
        </div>

        {/* Compose email */}
        <div className="fl-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Mail size={16} style={{ color: "#FFD600" }} />
            <h3 className="font-bold text-sm" style={{ color: "#FAFAFA" }}>Compose Notification</h3>
          </div>
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: "#888" }}>Subject line</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={`Your ${selectedProject?.title ?? "project"} is ready for review`}
              className="w-full text-sm px-3 py-2.5 rounded-lg outline-none"
              style={{ background: "#111", border: "1px solid #2A2A2A", color: "#FAFAFA" }}
            />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: "#888" }}>Custom message (optional)</label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Add a personal note to include in the email body…"
              rows={3}
              className="w-full text-sm px-3 py-2.5 rounded-lg outline-none resize-none"
              style={{ background: "#111", border: "1px solid #2A2A2A", color: "#FAFAFA" }}
            />
          </div>
          <div className="p-3 rounded-lg text-xs" style={{ background: "#111", border: "1px solid #2A2A2A", color: "#888" }}>
            <p className="font-semibold mb-1" style={{ color: "#FFD600" }}>Email preview</p>
            <p>Hi [First Name],</p>
            <p className="mt-1">{customMessage || `Your ${selectedProject?.title ?? "project"} deliverables are now ready for your review.`}</p>
            <p className="mt-1">🔗 Project link + 🔑 Login password included automatically.</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs" style={{ color: "#555" }}>
              {selectedContactIds.length > 0
                ? `Sending to ${selectedContactIds.length} selected contact${selectedContactIds.length !== 1 ? "s" : ""}`
                : `Sending to all ${contacts?.length ?? 0} contact${contacts?.length !== 1 ? "s" : ""}`}
            </p>
            <button
              onClick={() => selectedProjectId && sendNotification.mutate({
                projectId: selectedProjectId,
                subject: subject || `Your ${selectedProject?.title ?? "project"} is ready for review`,
                customMessage: customMessage || undefined,
                contactIds: selectedContactIds.length > 0 ? selectedContactIds : undefined,
              })}
              disabled={!selectedProjectId || !contacts?.length || sendNotification.isPending}
              className="fl-btn-primary flex items-center gap-2"
            >
              {sendNotification.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {sendNotification.isPending ? "Sending…" : "Send Email"}
            </button>
          </div>
        </div>
      </div>

      {/* Email Analytics Dashboard */}
      <div className="space-y-4">
        {/* Summary stats */}
        {(() => {
          const sent = (emailLogs ?? []).filter((l: any) => l.status === "sent");
          const totalOpens = sent.reduce((s: number, l: any) => s + (l.openCount ?? 0), 0);
          const totalClicks = sent.reduce((s: number, l: any) => s + (l.clickCount ?? 0), 0);
          const openedCount = sent.filter((l: any) => (l.openCount ?? 0) > 0).length;
          return (
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Sent", value: sent.length, color: "#64DD17" },
                { label: "Unique Opens", value: openedCount, color: "#38BDF8" },
                { label: "Total Opens", value: totalOpens, color: "#A78BFA" },
                { label: "Link Clicks", value: totalClicks, color: "#FFD600" },
              ].map(({ label, value, color }) => (
                <div key={label} className="fl-card p-3 text-center">
                  <p className="text-xl font-bold" style={{ color }}>{value}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#555" }}>{label}</p>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Per-email log */}
        <div className="fl-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <History size={16} style={{ color: "#FFD600" }} />
            <h3 className="font-bold text-sm" style={{ color: "#FAFAFA" }}>Send History</h3>
            <span className="text-xs ml-auto" style={{ color: "#555" }}>{emailLogs?.length ?? 0} sent</span>
          </div>
          {!emailLogs || emailLogs.length === 0 ? (
            <p className="text-xs text-center py-6" style={{ color: "#444" }}>No emails sent yet for this project</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {emailLogs.slice().reverse().map((log: any) => (
                <div key={log.id} className="px-3 py-3 rounded-lg" style={{ background: "#111", border: "1px solid #1A1A1A" }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: log.status === "sent" ? "#64DD17" : "#EF4444" }} />
                    <span className="text-xs font-semibold" style={{ color: log.status === "sent" ? "#64DD17" : "#EF4444" }}>{log.status}</span>
                    <span className="text-xs ml-auto" style={{ color: "#444" }}>{new Date(log.sentAt).toLocaleDateString()}</span>
                  </div>
                  {/* Recipient */}
                  <div className="flex items-baseline gap-1.5 mb-1.5">
                    <span className="text-xs font-semibold" style={{ color: "#FFD600" }}>
                      {log.recipientFirstName
                        ? `${log.recipientFirstName}${log.recipientLastName ? " " + log.recipientLastName : ""}`
                        : "Unknown"}
                    </span>
                    {log.recipientEmail && (
                      <span className="text-xs" style={{ color: "#555" }}>{log.recipientEmail}</span>
                    )}
                  </div>
                  <p className="text-xs truncate mb-2" style={{ color: "#888" }}>{log.subject}</p>
                  {log.status === "sent" && (
                    <div className="flex gap-3">
                      <span className="text-xs" style={{ color: (log.openCount ?? 0) > 0 ? "#38BDF8" : "#444" }}>
                        👁 {log.openCount ?? 0} open{log.openCount !== 1 ? "s" : ""}
                      </span>
                      <span className="text-xs" style={{ color: (log.clickCount ?? 0) > 0 ? "#FFD600" : "#444" }}>
                        🔗 {log.clickCount ?? 0} click{log.clickCount !== 1 ? "s" : ""}
                      </span>
                      {log.firstOpenedAt && (
                        <span className="text-xs ml-auto" style={{ color: "#555" }}>First opened {new Date(log.firstOpenedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  )}
                  {log.errorMessage && <p className="text-xs mt-1" style={{ color: "#EF4444" }}>{log.errorMessage}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="fl-card p-5">
          <h3 className="font-bold text-sm mb-3" style={{ color: "#FFD600" }}>Email Guide</h3>
          <div className="space-y-2 text-xs" style={{ color: "#888" }}>
            <p>1. Select the project to notify clients about</p>
            <p>2. Add client contacts (first name + email)</p>
            <p>3. Optionally select specific contacts to send to</p>
            <p>4. Customise the subject and message</p>
            <p>5. Every email includes the project link and login password automatically</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Reusable Image Upload Button ───────────────────────────────────────────────
function ImageUploadButton({
  value,
  onChange,
  label = "Upload Image",
  folder = "images",
  size = "sm",
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  folder?: string;
  size?: "xs" | "sm";
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadImage = trpc.uploadImage.upload.useMutation({
    onSuccess: (data) => { onChange(data.url); setUploading(false); toast.success("Image uploaded"); },
    onError: (e) => { setUploading(false); toast.error(e.message); },
  });

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Image must be under 10 MB"); return; }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = (e.target?.result as string).split(",")[1];
      uploadImage.mutate({ filename: file.name, contentType: file.type, fileBase64: base64, folder });
    };
    reader.readAsDataURL(file);
  };

  const textSm = size === "xs" ? "text-[11px]" : "text-xs";
  const py = size === "xs" ? "py-1.5" : "py-2";

  return (
    <div className="space-y-1.5">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      {value ? (
        <div className="relative inline-flex items-center gap-2">
          <img src={value} alt="preview" className="h-10 w-16 object-cover rounded" style={{ border: "1px solid #2A2A2A" }} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className={`flex items-center gap-1.5 ${textSm} font-semibold px-3 ${py} rounded-lg`}
            style={{ background: "#1A1A1A", color: "#FFD600", border: "1px solid rgba(255,214,0,0.2)" }}
          >
            {uploading ? <Loader2 size={12} className="animate-spin" /> : <ImagePlus size={12} />}
            {uploading ? "Uploading…" : "Replace"}
          </button>
          <button onClick={() => onChange("")} className={`${textSm} px-2 ${py} rounded-lg`} style={{ color: "#555", background: "#1A1A1A" }}>
            <X size={12} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className={`flex items-center gap-1.5 ${textSm} font-semibold px-3 ${py} rounded-lg`}
          style={{ background: "#1A1A1A", color: "#FFD600", border: "1px solid rgba(255,214,0,0.2)" }}
        >
          {uploading ? <Loader2 size={12} className="animate-spin" /> : <ImagePlus size={12} />}
          {uploading ? "Uploading…" : label}
        </button>
      )}
    </div>
  );
}

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


// ── Track Admin Row (with per-track approvals) ────────────────────────────────
function TrackAdminRow({ track, trackIndex, accentColor, onDelete }: { track: any; trackIndex: number; accentColor: string; onDelete: () => void }) {
  const { data: approvals } = trpc.trackApprovals.byTrack.useQuery({ trackId: track.id });

  const approvedCount = approvals?.filter((a) => a.status === "approved").length ?? 0;
  const needsChangesCount = approvals?.filter((a) => a.status === "needs_changes").length ?? 0;
  const rejectedCount = approvals?.filter((a) => a.status === "rejected").length ?? 0;

  return (
    <div className="rounded-lg overflow-hidden" style={{ background: "#111111", border: "1px solid #2A2A2A" }}>
      <div className="flex items-center justify-between px-3 py-2.5">
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
          <span className="text-xs px-2 py-0.5 rounded" style={{ background: "#1A1A1A", color: "#888888" }}>Track {trackIndex + 1}</span>
          <button
            onClick={onDelete}
            className="p-1.5 rounded transition-colors"
            style={{ color: "#555555" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#EF4444")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#555555")}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {/* Per-track approval summary */}
      {approvals && approvals.length > 0 && (
        <div className="px-3 pb-2.5 flex items-center gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-widest" style={{ color: "#555" }}>Decisions:</span>
          {approvedCount > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(100,221,23,0.1)", color: "#64DD17" }}>
              {approvedCount} Approved
            </span>
          )}
          {needsChangesCount > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(251,146,60,0.1)", color: "#FB923C" }}>
              {needsChangesCount} Needs Changes
            </span>
          )}
          {rejectedCount > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444" }}>
              {rejectedCount} Rejected
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Pillar Admin Row ──────────────────────────────────────────────────────────
function PillarAdminRow({ pillar, accentColor, onRefresh }: { pillar: any; accentColor: string; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(pillar.title);
  const [editDesc, setEditDesc] = useState(pillar.description ?? "");
  const { data: tracks, refetch: refetchTracks } = trpc.tracks.byPillar.useQuery({ pillarId: pillar.id });

  const deleteTrack = trpc.tracks.delete.useMutation({
    onSuccess: () => { refetchTracks(); toast.success("Track deleted"); },
    onError: (e) => toast.error(e.message),
  });
  const deletePillar = trpc.pillars.delete.useMutation({
    onSuccess: () => { onRefresh(); toast.success("Pillar deleted"); },
    onError: (e) => toast.error(e.message),
  });
  const updatePillar = trpc.pillars.update.useMutation({
    onSuccess: () => { setEditing(false); onRefresh(); toast.success("Pillar updated"); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="fl-card overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4"
        style={{ borderBottom: expanded ? "1px solid #2A2A2A" : "none" }}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-lg font-black shrink-0" style={{ color: accentColor, opacity: 0.5 }}>
            {String((pillar.sortOrder ?? 0) + 1).padStart(2, "0")}
          </span>
          {editing ? (
            <div className="flex-1 space-y-2">
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full text-sm px-3 py-1.5 rounded-lg outline-none font-bold"
                style={{ background: "#0A0A0A", border: "1px solid #FFD600", color: "#FAFAFA" }}
                autoFocus
              />
              <input
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Description (optional)"
                className="w-full text-xs px-3 py-1.5 rounded-lg outline-none"
                style={{ background: "#0A0A0A", border: "1px solid #2A2A2A", color: "#FAFAFA" }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => updatePillar.mutate({ id: pillar.id, title: editTitle, description: editDesc || undefined })}
                  disabled={!editTitle.trim() || updatePillar.isPending}
                  className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                  style={{ background: "#FFD600", color: "#0A0A0A" }}
                >
                  {updatePillar.isPending ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => { setEditing(false); setEditTitle(pillar.title); setEditDesc(pillar.description ?? ""); }}
                  className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                  style={{ background: "#1A1A1A", color: "#888888", border: "1px solid #2A2A2A" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-w-0">
              <h3 className="font-bold" style={{ color: "#FAFAFA" }}>{pillar.title}</h3>
              {pillar.description && (
                <p className="text-xs mt-0.5" style={{ color: "#888888" }}>{pillar.description}</p>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs" style={{ color: "#555555" }}>{tracks?.length ?? 0}/2 tracks</span>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 rounded transition-colors"
              style={{ color: "#555555" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#FFD600")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#555555")}
              title="Edit pillar"
            >
              <Edit2 size={14} />
            </button>
          )}
          <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded" style={{ color: "#555555" }}>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* Tracks with per-track approvals */}
          {tracks && tracks.length > 0 && (
            <div className="space-y-2">
              {tracks.map((track, ti) => (
                <TrackAdminRow
                  key={track.id}
                  track={track}
                  trackIndex={ti}
                  accentColor={accentColor}
                  onDelete={() => { if (confirm(`Delete "${track.title}"?`)) deleteTrack.mutate({ id: track.id }); }}
                />
              ))}
            </div>
          )}

          {/* Upload form */}
          <UploadTrackForm
            pillarId={pillar.id}
            trackCount={tracks?.length ?? 0}
            onUploaded={() => refetchTracks()}
          />

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


/// ── Recent Comments Panel ──────────────────────────────────────────────────────
function CommentCard({ c, onResolve, onUnresolve, onRespond }: {
  c: any;
  onResolve: (id: number, response?: string) => void;
  onUnresolve: (id: number) => void;
  onRespond: (id: number, response: string) => void;
}) {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState(c.adminResponse ?? "");
  const isResolved = !!c.resolvedAt;

  return (
    <div
      className="px-3 py-2.5 rounded-lg"
      style={{
        background: isResolved ? "#0D1A0D" : "#111111",
        border: `1px solid ${isResolved ? "#1A3A1A" : "#1A1A1A"}`,
        opacity: isResolved ? 0.75 : 1,
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold" style={{ color: "#FFD600" }}>
            {c.commenterName ?? c.userName ?? "Client"}
          </span>
          {isResolved && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "#1A3A1A", color: "#64DD17" }}>
              Resolved
            </span>
          )}
        </div>
        <span className="text-xs" style={{ color: "#444444" }}>
          {new Date(c.createdAt).toLocaleDateString()}
        </span>
      </div>

      {/* Comment content */}
      <p className="text-sm mb-2" style={{ color: "#CCCCCC" }}>{c.content}</p>
      {c.timestampSeconds != null && (
        <span className="text-xs mb-2 inline-block font-mono px-1.5 py-0.5 rounded" style={{ background: "#2A2A2A", color: "#888888" }}>
          @ {Math.floor(c.timestampSeconds / 60)}:{String(c.timestampSeconds % 60).padStart(2, "0")}
        </span>
      )}

      {/* Admin response (if any) */}
      {c.adminResponse && (
        <div className="mt-2 px-2.5 py-2 rounded" style={{ background: "rgba(255,214,0,0.06)", border: "1px solid rgba(255,214,0,0.15)" }}>
          <p className="text-xs font-semibold mb-0.5" style={{ color: "#FFD600" }}>Your response</p>
          <p className="text-xs" style={{ color: "#AAAAAA" }}>{c.adminResponse}</p>
        </div>
      )}

      {/* Reply input */}
      {showReply && (
        <div className="mt-2 space-y-1.5">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a response to the client…"
            rows={2}
            className="w-full text-xs px-2.5 py-1.5 rounded-md outline-none resize-none"
            style={{ background: "#1A1A1A", border: "1px solid #333333", color: "#FAFAFA" }}
          />
          <div className="flex gap-1.5 justify-end">
            <button
              className="text-xs px-2.5 py-1 rounded"
              style={{ background: "#1A1A1A", color: "#888888", border: "1px solid #2A2A2A" }}
              onClick={() => setShowReply(false)}
            >
              Cancel
            </button>
            <button
              className="text-xs px-2.5 py-1 rounded font-semibold"
              style={{ background: "#FFD600", color: "#0A0A0A" }}
              onClick={() => {
                if (!replyText.trim()) return;
                onRespond(c.id, replyText.trim());
                setShowReply(false);
              }}
            >
              Send Response
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!showReply && (
        <div className="flex gap-1.5 mt-2">
          <button
            className="text-[11px] px-2 py-1 rounded"
            style={{ background: "#1A1A1A", color: "#888888", border: "1px solid #2A2A2A" }}
            onClick={() => setShowReply(true)}
          >
            {c.adminResponse ? "Edit Response" : "Respond"}
          </button>
          {isResolved ? (
            <button
              className="text-[11px] px-2 py-1 rounded"
              style={{ background: "#1A1A1A", color: "#888888", border: "1px solid #2A2A2A" }}
              onClick={() => onUnresolve(c.id)}
            >
              Unresolve
            </button>
          ) : (
            <button
              className="text-[11px] px-2 py-1 rounded font-semibold"
              style={{ background: "rgba(100,221,23,0.12)", color: "#64DD17", border: "1px solid rgba(100,221,23,0.25)" }}
              onClick={() => onResolve(c.id)}
            >
              Mark Resolved
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function RecentComments() {
  const utils = trpc.useUtils();
  const { data: comments } = trpc.comments.all.useQuery();
  const resolveComment = trpc.comments.resolve.useMutation({
    onSuccess: () => { utils.comments.all.invalidate(); toast.success("Marked as resolved"); },
    onError: (e) => toast.error(e.message),
  });
  const unresolveComment = trpc.comments.unresolve.useMutation({
    onSuccess: () => { utils.comments.all.invalidate(); toast.success("Unresolved"); },
    onError: (e) => toast.error(e.message),
  });
  const respondComment = trpc.comments.respond.useMutation({
    onSuccess: () => { utils.comments.all.invalidate(); toast.success("Response saved"); },
    onError: (e) => toast.error(e.message),
  });

  const [showResolved, setShowResolved] = useState(false);
  const unresolved = comments?.filter((c) => !c.resolvedAt) ?? [];
  const resolved = comments?.filter((c) => c.resolvedAt) ?? [];
  const displayed = showResolved ? comments ?? [] : unresolved;

  return (
    <div className="fl-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare size={16} style={{ color: "#FFD600" }} />
        <h3 className="font-bold text-sm" style={{ color: "#FAFAFA" }}>Comments</h3>
        <span className="text-xs" style={{ color: "#555555" }}>{unresolved.length} open</span>
        {resolved.length > 0 && (
          <button
            className="ml-auto text-xs"
            style={{ color: showResolved ? "#FFD600" : "#555555" }}
            onClick={() => setShowResolved((v) => !v)}
          >
            {showResolved ? "Hide resolved" : `Show ${resolved.length} resolved`}
          </button>
        )}
      </div>
      {!comments || comments.length === 0 ? (
        <p className="text-sm text-center py-6" style={{ color: "#444444" }}>No comments yet</p>
      ) : displayed.length === 0 ? (
        <p className="text-sm text-center py-6" style={{ color: "#444444" }}>All comments resolved</p>
      ) : (
        <div className="space-y-2 max-h-[480px] overflow-y-auto">
          {displayed.slice(0, 30).map((c) => (
            <CommentCard
              key={c.id}
              c={c}
              onResolve={(id) => resolveComment.mutate({ id })}
              onUnresolve={(id) => unresolveComment.mutate({ id })}
              onRespond={(id, response) => respondComment.mutate({ id, adminResponse: response })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Stats Bar ──────────────────────────────────────────────────────────────────
function StatsBar({ allApprovals, allComments }: { allApprovals: any[]; allComments: any[] }) {
  const approved = allApprovals.filter((a) => a.status === "approved").length;
  const rejected = allApprovals.filter((a) => a.status === "rejected").length;
  const needsChanges = allApprovals.filter((a) => a.status === "needs_changes").length;

  const stats = [
    { label: "Comments", value: allComments.length, icon: MessageSquare, color: "#A78BFA" },
    { label: "Approved", value: approved, icon: CheckCircle2, color: "#64DD17" },
    { label: "Rejected", value: rejected, icon: XCircle, color: "#EF4444" },
    { label: "Needs Changes", value: needsChanges, icon: Clock, color: "#FFD600" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
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
        <ImageUploadButton value={coverImageUrl} onChange={setCoverImageUrl} label="Upload Cover Image" folder="project-covers" />
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
      <ImageUploadButton value={thumbnailUrl} onChange={setThumbnailUrl} label="Upload Thumbnail" folder="deliverable-thumbnails" size="xs" />
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

// ── Deliverable Edit Row ──────────────────────────────────────────────────────
function DeliverableEditRow({ d, onDelete, onSaved }: { d: any; onDelete: () => void; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(d.title);
  const [description, setDescription] = useState(d.description ?? "");
  const [downloadUrl, setDownloadUrl] = useState(d.downloadUrl ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState(d.thumbnailUrl ?? "");
  const [fileType, setFileType] = useState(d.fileType ?? "video");

  const update = trpc.deliverables.update.useMutation({
    onSuccess: () => { setEditing(false); onSaved(); toast.success("Deliverable updated"); },
    onError: (e) => toast.error(e.message),
  });

  if (!editing) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: "#111", border: "1px solid #2A2A2A" }}>
        {d.thumbnailUrl
          ? <img src={d.thumbnailUrl} alt={d.title} className="w-10 h-7 object-cover rounded flex-shrink-0" />
          : <div className="w-10 h-7 rounded flex-shrink-0" style={{ background: "#1A1A1A" }} />}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate" style={{ color: "#FAFAFA" }}>{d.title}</p>
          <p className="text-xs" style={{ color: "#555" }}>{d.fileType}</p>
        </div>
        {d.downloadUrl && (
          <a href={d.downloadUrl} target="_blank" rel="noopener noreferrer" className="p-1 rounded" style={{ color: "#FFD600" }}>
            <Link2 size={12} />
          </a>
        )}
        <button onClick={() => setEditing(true)} className="p-1 rounded" style={{ color: "#888" }} title="Edit">
          <Edit2 size={12} />
        </button>
        <button onClick={() => { if (confirm(`Delete "${d.title}"?`)) onDelete(); }} className="p-1 rounded" style={{ color: "#EF4444" }} title="Delete">
          <Trash2 size={12} />
        </button>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-lg space-y-2" style={{ background: "#111", border: "1px solid rgba(255,214,0,0.3)" }}>
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
      <ImageUploadButton value={thumbnailUrl} onChange={setThumbnailUrl} label="Replace Thumbnail" folder="deliverable-thumbnails" size="xs" />
      <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className="w-full text-xs px-3 py-2 rounded-lg outline-none" style={{ background: "#0A0A0A", border: "1px solid #2A2A2A", color: "#FAFAFA" }} />
      <div className="flex gap-2">
        <button
          onClick={() => update.mutate({ id: d.id, title: title || undefined, description: description || undefined, downloadUrl: downloadUrl || undefined, thumbnailUrl: thumbnailUrl || undefined, fileType })}
          disabled={!title.trim() || update.isPending}
          className="fl-btn-primary flex-1 justify-center py-2 text-xs flex items-center gap-1.5"
        >
          {update.isPending ? <Loader2 size={12} className="animate-spin" /> : "Save"}
        </button>
        <button onClick={() => { setTitle(d.title); setDescription(d.description ?? ""); setDownloadUrl(d.downloadUrl ?? ""); setThumbnailUrl(d.thumbnailUrl ?? ""); setFileType(d.fileType ?? "video"); setEditing(false); }} className="px-3 py-2 rounded-lg text-xs font-semibold" style={{ background: "#1A1A1A", color: "#888", border: "1px solid #2A2A2A" }}>Cancel</button>
      </div>
    </div>
  );
}

//// ── Sortable wrapper for ProjectAdminRow ────────────────────────
function SortableProjectRow({ project, onRefresh }: { project: any; onRefresh: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: project.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
    position: isDragging ? "relative" : undefined,
  };
  return (
    <div ref={setNodeRef} style={style}>
      <ProjectAdminRow project={project} onRefresh={onRefresh} dragHandleProps={{ ...attributes, ...listeners } as React.HTMLAttributes<HTMLButtonElement>} />
    </div>
  );
}

// ── Project Admin Row ────────────────────────────────────
function ProjectAdminRow({ project, onRefresh, dragHandleProps }: { project: any; onRefresh: () => void; dragHandleProps?: React.HTMLAttributes<HTMLButtonElement> }) {
  const [expanded, setExpanded] = useState(false);
  const [editingProject, setEditingProject] = useState(false);
  const [editTitle, setEditTitle] = useState(project.title);
  const [editDescription, setEditDescription] = useState(project.description ?? "");
  const [editCoverImageUrl, setEditCoverImageUrl] = useState(project.coverImageUrl ?? "");

  const { data: deliverables, refetch: refetchDeliverables } = trpc.deliverables.byProject.useQuery(
    { projectId: project.id },
    { enabled: expanded }
  );

  const updateProject = trpc.projects.update.useMutation({
    onSuccess: () => { setEditingProject(false); onRefresh(); toast.success("Project updated"); },
    onError: (e) => toast.error(e.message),
  });

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
      {/* Header row */}
        <div className="p-4 flex items-center gap-3">
        {/* Drag handle */}
        <button
          {...dragHandleProps}
          className="p-1 rounded cursor-grab active:cursor-grabbing flex-shrink-0"
          style={{ color: "#444", touchAction: "none" }}
          title="Drag to reorder"
          tabIndex={-1}
        >
          <GripVertical size={16} />
        </button>
        {editingProject ? (
          <ImageUploadButton value={editCoverImageUrl} onChange={setEditCoverImageUrl} label="" folder="project-covers" size="xs" />
        ) : project.coverImageUrl ? (
          <img src={project.coverImageUrl} alt={project.title} className="w-14 h-10 object-cover rounded flex-shrink-0" />
        ) : (
          <div className="w-14 h-10 rounded flex items-center justify-center flex-shrink-0" style={{ background: "#1A1A1A" }}>
            <Folder size={16} style={{ color: "#444" }} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          {editingProject ? (
            <div className="space-y-1.5">
              <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title" className="w-full text-sm px-2.5 py-1.5 rounded-lg outline-none" style={{ background: "#111", border: "1px solid rgba(255,214,0,0.4)", color: "#FAFAFA" }} />
              <input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Description (optional)" className="w-full text-xs px-2.5 py-1.5 rounded-lg outline-none" style={{ background: "#111", border: "1px solid #2A2A2A", color: "#FAFAFA" }} />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm" style={{ color: "#FAFAFA" }}>{project.title}</span>
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(255,214,0,0.1)", color: "#FFD600" }}>{project.category}</span>
              </div>
              <p className="text-xs" style={{ color: "#555" }}>/projects/{project.slug}</p>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {editingProject ? (
            <>
              <button
                onClick={() => updateProject.mutate({ id: project.id, title: editTitle || undefined, description: editDescription || undefined, coverImageUrl: editCoverImageUrl || undefined })}
                disabled={!editTitle.trim() || updateProject.isPending}
                className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                style={{ background: "#FFD600", color: "#0A0A0A" }}
              >
                {updateProject.isPending ? <Loader2 size={12} className="animate-spin" /> : "Save"}
              </button>
              <button onClick={() => { setEditTitle(project.title); setEditDescription(project.description ?? ""); setEditCoverImageUrl(project.coverImageUrl ?? ""); setEditingProject(false); }} className="p-1.5 rounded" style={{ color: "#888" }}>
                <X size={14} />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditingProject(true)} className="p-1.5 rounded" style={{ color: "#888" }} title="Edit project">
                <Edit2 size={14} />
              </button>
              <a href={`/projects/${project.slug}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded" style={{ color: "#888" }}>
                <Globe size={14} />
              </a>
              <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded" style={{ color: "#888" }}>
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              <button onClick={() => { if (confirm(`Delete project "${project.title}"?`)) deleteProject.mutate({ id: project.id }); }} className="p-1.5 rounded" style={{ color: "#EF4444" }}>
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4" style={{ borderTop: "1px solid #1A1A1A" }}>
          <div className="pt-3 space-y-2">
            {!deliverables || deliverables.length === 0 ? (
              <p className="text-xs py-2" style={{ color: "#555" }}>No deliverables yet.</p>
            ) : (
              deliverables.map((d: any) => (
                <DeliverableEditRow
                  key={d.id}
                  d={d}
                  onDelete={() => deleteDeliverable.mutate({ id: d.id })}
                  onSaved={refetchDeliverables}
                />
              ))
            )}
            <AddDeliverableForm projectId={project.id} onCreated={refetchDeliverables} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Admin Login Screen ───────────────────────────────────────────────────────
function AdminLoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const utils = trpc.useUtils();

  const adminLogin = trpc.auth.adminLogin.useMutation({
    onSuccess: (data) => {
      if (data.token) {
        localStorage.setItem("portal_session_token", data.token);
      }
      // Reload the page so the tRPC client picks up the new token on all queries
      window.location.reload();
    },
    onError: (err) => {
      setError(err.message || "Invalid credentials. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setError("");
    adminLogin.mutate({ email, password });
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden"
      style={{ background: "#0A0A0A" }}
    >
      <div className="relative z-10 text-center max-w-sm w-full">
        <div className="flex items-center justify-center mb-10">
          <img src={FL_LOGO} alt="Faderlabs" className="h-8 object-contain" />
        </div>
        <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4" style={{ background: "rgba(255,214,0,0.08)", color: "#FFD600", border: "1px solid rgba(255,214,0,0.2)" }}>Admin Portal</div>
        <h1 className="text-3xl font-black mb-3" style={{ color: "#FAFAFA" }}>Sign In</h1>
        <p className="text-sm mb-8 leading-relaxed" style={{ color: "#888888" }}>Enter your admin credentials to access the portal.</p>
        <form onSubmit={handleSubmit} className="space-y-3 text-left">
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
            placeholder="Email"
            autoFocus
            className="w-full text-sm px-4 py-3.5 rounded-xl outline-none"
            style={{ background: "#111111", border: error ? "1px solid #EF4444" : "1px solid #2A2A2A", color: "#FAFAFA" }}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            placeholder="Password"
            className="w-full text-sm px-4 py-3.5 rounded-xl outline-none"
            style={{ background: "#111111", border: error ? "1px solid #EF4444" : "1px solid #2A2A2A", color: "#FAFAFA" }}
          />
          {error && <p className="text-xs" style={{ color: "#EF4444" }}>{error}</p>}
          <button
            type="submit"
            disabled={!email || !password || adminLogin.isPending}
            className="w-full flex items-center justify-center gap-2 text-sm font-bold py-3.5 rounded-xl transition-all"
            style={{ background: "#FFD600", color: "#0A0A0A" }}
          >
            {adminLogin.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
            {adminLogin.isPending ? "Signing in…" : "Sign In"}
          </button>
        </form>
        <p className="text-xs mt-8" style={{ color: "#333333" }}>Powered by Faderlabs</p>
      </div>
    </div>
  );
}

// ── Admin Page ─────────────────────────────────────────────────────────────────
export default function Admin() {
  const { user, loading, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<"sonic" | "projects" | "email">("projects");
  const isAdmin = !loading && isAuthenticated && user?.role === "admin";
  const { data: pillars, refetch: refetchPillars, isLoading: pillarsLoading } = trpc.pillars.list.useQuery(undefined, { enabled: isAdmin });
  const { data: allApprovals } = trpc.approvals.all.useQuery(undefined, { enabled: isAdmin });
  const { data: allComments } = trpc.comments.all.useQuery(undefined, { enabled: isAdmin });
   const { data: projects, refetch: refetchProjects, isLoading: projectsLoading } = trpc.projects.listAdmin.useQuery(undefined, { enabled: isAdmin });
  const [orderedProjects, setOrderedProjects] = React.useState<any[]>([]);
  React.useEffect(() => { if (projects) setOrderedProjects(projects); }, [projects]);
  const utils = trpc.useUtils();
  const reorderProjects = trpc.projects.reorder.useMutation({
    onSuccess: () => { utils.projects.listAdmin.invalidate(); toast.success("Order saved"); },
    onError: (e) => toast.error(e.message),
  });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  function handleProjectDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedProjects.findIndex((p) => p.id === active.id);
    const newIndex = orderedProjects.findIndex((p) => p.id === over.id);
    const reordered = arrayMove(orderedProjects, oldIndex, newIndex);
    setOrderedProjects(reordered);
    reorderProjects.mutate({ items: reordered.map((p, i) => ({ id: p.id, sortOrder: i })) });
  }
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0A0A" }}>
        <Loader2 size={24} className="animate-spin" style={{ color: "#FFD600" }} />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") {
    return <AdminLoginScreen />;
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
        {allApprovals && allComments && (
          <StatsBar allApprovals={allApprovals} allComments={allComments} />
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
          <button
            onClick={() => setActiveTab("email")}
            className="px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
            style={activeTab === "email" ? { background: "#FFD600", color: "#0A0A0A" } : { color: "#888888" }}
          >
            <Mail size={14} /> Email Notifications
          </button>
        </div>

        {/* Email Notifications Tab */}
        {activeTab === "email" && <EmailNotificationsTab projects={projects ?? []} />}

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
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleProjectDragEnd}>
                  <SortableContext items={orderedProjects.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3">
                      {orderedProjects.map((project: any) => (
                        <SortableProjectRow key={project.id} project={project} onRefresh={refetchProjects} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
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
