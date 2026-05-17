import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import AudioPlayer from "@/components/AudioPlayer";
import {
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  Send,
  LogOut,
  ChevronRight,
  Loader2,
  Film,
  Archive,
  FileText,
  Folder,
  Music2,
  ShieldCheck,
  PlusCircle,
  BarChart3,
  CircleDot,
  Zap,
  Trophy,
} from "lucide-react";
import { Link, useLocation } from "wouter";

const MW_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663488436824/MCxqt4HyvEAyGGokboGjqW/MWlogo_0d44da07.webp";
const FL_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663488436824/iLXUQ5XAKoVQ9DttVq4BTX/faderlabs-logo-white_d7a18ec8.png";

const PILLAR_ACCENT_COLORS = ["#FFD600", "#64DD17", "#EF4444", "#A78BFA", "#38BDF8"];

const CATEGORY_ICONS: Record<string, any> = {
  video: Film,
  archive: Archive,
  brand: Film,
  document: FileText,
  audio: Music2,
};

// ── Approval Badge ─────────────────────────────────────────────────────────────
function ApprovalBadge({ status }: { status?: string }) {
  if (!status || status === "pending") {
    return (
      <span className="status-pending inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full">
        <Clock size={12} /> Awaiting Decision
      </span>
    );
  }
  if (status === "approved") {
    return (
      <span className="status-approved inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full">
        <CheckCircle2 size={12} /> Approved
      </span>
    );
  }
  return (
    <span className="status-rejected inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full">
      <XCircle size={12} /> Rejected
    </span>
  );
}

// ── Track Comment Section ──────────────────────────────────────────────────────
function TrackComments({ trackId, trackTitle }: { trackId: number; trackTitle: string }) {
  const [comment, setComment] = useState("");
  const [commenterName, setCommenterName] = useState("");
  const { data: comments, refetch } = trpc.comments.byTrack.useQuery({ trackId });
  const addComment = trpc.comments.add.useMutation({
    onSuccess: () => {
      setComment("");
      refetch();
      toast.success("Comment submitted");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !commenterName.trim()) return;
    addComment.mutate({ trackId, commenterName: commenterName.trim(), content: comment.trim() });
  };

  const formatTime = (s?: number | null) => {
    if (s == null) return null;
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  };

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare size={14} style={{ color: "#888888" }} />
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#888888" }}>
          Comments ({comments?.length ?? 0})
        </span>
      </div>

      {comments && comments.length > 0 && (
        <div className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-1">
          {comments.map((c) => (
            <div key={c.id} className="rounded-lg p-3" style={{ background: "#111111", border: "1px solid #2A2A2A" }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold" style={{ color: "#FFD600" }}>
                  {c.commenterName ?? c.userName ?? "Client"}
                </span>
                <div className="flex items-center gap-2">
                  {c.timestampSeconds != null && (
                    <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: "#2A2A2A", color: "#888888" }}>
                      @ {formatTime(c.timestampSeconds)}
                    </span>
                  )}
                  <span className="text-xs" style={{ color: "#555555" }}>
                    {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <p className="text-sm" style={{ color: "#CCCCCC" }}>{c.content}</p>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          type="text"
          value={commenterName}
          onChange={(e) => setCommenterName(e.target.value)}
          placeholder="Your name (required)"
          className="text-sm px-3 py-2 rounded-lg outline-none transition-colors"
          style={{ background: "#111111", border: "1px solid #2A2A2A", color: "#FAFAFA" }}
          onFocus={(e) => (e.target.style.borderColor = "rgba(255,214,0,0.4)")}
          onBlur={(e) => (e.target.style.borderColor = "#2A2A2A")}
        />
        <div className="flex gap-2">
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={`Add a comment on "${trackTitle}"...`}
            className="flex-1 text-sm px-3 py-2 rounded-lg outline-none transition-colors"
            style={{ background: "#111111", border: "1px solid #2A2A2A", color: "#FAFAFA" }}
            onFocus={(e) => (e.target.style.borderColor = "rgba(255,214,0,0.4)")}
            onBlur={(e) => (e.target.style.borderColor = "#2A2A2A")}
          />
          <button
            type="submit"
            disabled={!comment.trim() || !commenterName.trim() || addComment.isPending}
            className="px-3 py-2 rounded-lg flex items-center gap-1.5 text-sm font-semibold transition-all"
            style={{ background: "#FFD600", color: "#0A0A0A" }}
          >
            {addComment.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Pillar Card ────────────────────────────────────────────────────────────────
function PillarCard({ pillar, accentColor, index }: { pillar: any; accentColor: string; index: number }) {
  const { data: tracks, isLoading: tracksLoading } = trpc.tracks.byPillar.useQuery({ pillarId: pillar.id });
  const { data: myApproval, refetch: refetchApproval } = trpc.approvals.myApproval.useQuery({ pillarId: pillar.id });

  const [showNoteInput, setShowNoteInput] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<"approved" | "rejected" | null>(null);
  const [currentTimes, setCurrentTimes] = useState<Record<number, number>>({});

  const setApproval = trpc.approvals.set.useMutation({
    onSuccess: () => {
      refetchApproval();
      setShowNoteInput(false);
      setPendingStatus(null);
      toast.success("Decision submitted — Faderlabs has been notified.");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleApprovalClick = (status: "approved" | "rejected") => {
    setPendingStatus(status);
    setShowNoteInput(true);
  };

  const handleApprovalSubmit = () => {
    if (!pendingStatus) return;
    setApproval.mutate({ pillarId: pillar.id, status: pendingStatus });
  };

  const pillarNum = String(index + 1).padStart(2, "0");

  return (
    <div className="fl-card overflow-hidden">
      <div className="p-6 pb-4" style={{ borderBottom: "1px solid #2A2A2A" }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="text-3xl font-black" style={{ color: accentColor, opacity: 0.4, lineHeight: 1 }}>
              {pillarNum}
            </span>
            <div>
              <h3 className="text-lg font-bold mb-1" style={{ color: "#FAFAFA" }}>{pillar.title}</h3>
              {pillar.description && (
                <p className="text-sm leading-relaxed" style={{ color: "#888888" }}>{pillar.description}</p>
              )}
            </div>
          </div>
          <div className="shrink-0">
            <ApprovalBadge status={myApproval?.status} />
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {tracksLoading ? (
          <div className="flex items-center gap-2 py-4" style={{ color: "#555555" }}>
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Loading tracks…</span>
          </div>
        ) : !tracks || tracks.length === 0 ? (
          <div className="py-6 text-center" style={{ color: "#555555" }}>
            <Music2 size={24} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No tracks uploaded yet.</p>
          </div>
        ) : (
          tracks.map((track, ti) => (
            <div key={track.id}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: `${accentColor}20`, color: accentColor }}>
                  Track {ti + 1}
                </span>
                <span className="text-sm font-semibold" style={{ color: "#FAFAFA" }}>{track.title}</span>
              </div>
              {track.description && (
                <p className="text-xs mb-3" style={{ color: "#666666" }}>{track.description}</p>
              )}
              <AudioPlayer
                src={track.audioUrl}
                title={track.title}
                onTimeUpdate={(t) => setCurrentTimes((prev) => ({ ...prev, [track.id]: t }))}
              />
              <TrackComments trackId={track.id} trackTitle={track.title} />
            </div>
          ))
        )}
      </div>

      {tracks && tracks.length > 0 && (
        <div className="px-6 pb-6" style={{ borderTop: "1px solid #2A2A2A", paddingTop: "1.25rem" }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#888888" }}>
            Your Decision for This Pillar
          </p>

          {!showNoteInput ? (
            <div className="flex gap-3">
              <button
                onClick={() => handleApprovalClick("approved")}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all"
                style={
                  myApproval?.status === "approved"
                    ? { background: "rgba(100,221,23,0.2)", color: "#64DD17", border: "1px solid rgba(100,221,23,0.4)" }
                    : { background: "#1A1A1A", color: "#888888", border: "1px solid #2A2A2A" }
                }
              >
                <CheckCircle2 size={16} />
                Approve
              </button>
              <button
                onClick={() => handleApprovalClick("rejected")}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all"
                style={
                  myApproval?.status === "rejected"
                    ? { background: "rgba(239,68,68,0.2)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.4)" }
                    : { background: "#1A1A1A", color: "#888888", border: "1px solid #2A2A2A" }
                }
              >
                <XCircle size={16} />
                Request Changes
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold"
                style={
                  pendingStatus === "approved"
                    ? { background: "rgba(100,221,23,0.1)", color: "#64DD17" }
                    : { background: "rgba(239,68,68,0.1)", color: "#EF4444" }
                }
              >
                {pendingStatus === "approved" ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                {pendingStatus === "approved" ? "Approving this pillar" : "Requesting changes"}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleApprovalSubmit}
                  disabled={setApproval.isPending}
                  className="fl-btn-primary flex-1 justify-center py-2.5 text-sm"
                >
                  {setApproval.isPending ? <Loader2 size={14} className="animate-spin" /> : "Confirm Decision"}
                </button>
                <button
                  onClick={() => { setShowNoteInput(false); setPendingStatus(null); }}
                  className="px-4 py-2.5 rounded-lg text-sm font-semibold"
                  style={{ background: "#1A1A1A", color: "#888888", border: "1px solid #2A2A2A" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Project Status Badge ─────────────────────────────────────────────────────
function ProjectStatusBadge({ status }: { status?: string }) {
  if (!status || status === "started") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "#888" }}>
        <span className="w-1.5 h-1.5 rounded-full bg-gray-500 inline-block" />
        In Queue
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: "rgba(255,214,0,0.12)", color: "#FFD600" }}>
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block animate-pulse" />
        In Progress
      </span>
    );
  }
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: "rgba(100,221,23,0.12)", color: "#64DD17" }}>
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
        Completed
      </span>
    );
  }
  return null;
}

// ── Project Card ───────────────────────────────────────────────────────────────
function ProjectCard({ project }: { project: any }) {
  const Icon = CATEGORY_ICONS[project.category ?? "video"] ?? Folder;

  return (
    <Link href={`/projects/${project.slug}`}>
      <div
        className="group relative overflow-hidden rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.02]"
        style={{ background: "#141414", border: "1px solid #2A2A2A" }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "rgba(255,214,0,0.3)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#2A2A2A")}
      >
        {/* Thumbnail */}
        {project.coverImageUrl ? (
          <div className="relative aspect-video overflow-hidden" style={{ background: "#0A0A0A" }}>
            <img
              src={project.coverImageUrl}
              alt={project.title}
              className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-300"
              style={{ mixBlendMode: "lighten" }}
              onError={(e) => {
                const target = e.currentTarget;
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = `<div class="aspect-video w-full h-full flex flex-col items-center justify-center gap-3" style="background:#1A1A1A">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>
                    <span style="color:#444;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em">${project.title}</span>
                  </div>`;
                }
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          </div>
        ) : (
          <div className="aspect-video flex flex-col items-center justify-center gap-3" style={{ background: "#1A1A1A" }}>
            <Icon size={40} style={{ color: "#333333" }} />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#444444" }}>{project.title}</span>
          </div>
        )}

        {/* Content */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span
              className="text-xs font-semibold uppercase tracking-widest px-2 py-0.5 rounded"
              style={{ background: "rgba(255,214,0,0.1)", color: "#FFD600" }}
            >
              {project.category ?? "project"}
            </span>
            <ProjectStatusBadge status={project.projectStatus} />
          </div>
          <h3 className="font-bold text-base mb-1" style={{ color: "#FAFAFA" }}>{project.title}</h3>
          {project.description && (
            <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "#666666" }}>{project.description}</p>
          )}
          <div className="flex items-center gap-1 mt-3 text-xs font-semibold" style={{ color: "#FFD600" }}>
            View Deliverables <ChevronRight size={12} />
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─// ── Login Screen ──────────────────────────────────────────────────────────
function LoginScreen() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();
  // Read returnTo from query string (e.g. /?returnTo=/projects/sonic-branding)
  const returnTo = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("returnTo")
    : null;
  const clientLogin = trpc.auth.clientLogin.useMutation({
    onSuccess: (data) => {
      if (data.token) {
        localStorage.setItem("portal_session_token", data.token);
      }
      utils.auth.me.invalidate().then(() => {
        if (returnTo) {
          navigate(returnTo, { replace: true });
        }
      });
    },
    onError: (err) => {
      setError(err.message || "Incorrect password. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setError("");
    clientLogin.mutate({ password });
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden fl-grain"
      style={{ background: "#0A0A0A" }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(255,214,0,0.05) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 text-center max-w-sm w-full">
        <div className="flex items-center justify-center mb-10">
          <img src={FL_LOGO} alt="Faderlabs" className="h-8 object-contain" />
        </div>

        <div className="fl-label mb-4 mx-auto w-fit">Content Hub</div>
        <h1 className="text-3xl font-black mb-3" style={{ color: "#FAFAFA" }}>
          Welcome Back
        </h1>
        <p className="text-sm mb-8 leading-relaxed" style={{ color: "#888888" }}>
          Enter your access password to view your projects.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              placeholder="Password"
              autoFocus
              className="w-full text-base px-4 py-3.5 rounded-xl outline-none text-center tracking-widest"
              style={{
                background: "#111111",
                border: error ? "1px solid #EF4444" : "1px solid #2A2A2A",
                color: "#FAFAFA",
              }}
            />
          </div>
          {error && (
            <p className="text-xs" style={{ color: "#EF4444" }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={!password || clientLogin.isPending}
            className="fl-btn-primary w-full justify-center text-base py-4"
          >
            {clientLogin.isPending ? (
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <ShieldCheck size={18} />
            )}
            {clientLogin.isPending ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="text-xs mt-8" style={{ color: "#333333" }}>
          Powered by Faderlabs
        </p>

      </div>
    </div>
  );
}

// ── Main Portal ────────────────────────────────────────────────────────────────
export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  // Sonic Branding is now a project card in the grid

  const { data: projects, isLoading: projectsLoading } = trpc.projects.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: pillars, isLoading: pillarsLoading } = trpc.pillars.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0A0A" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
          <span className="text-sm" style={{ color: "#888888" }}>Loading portal…</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <LoginScreen />;

  return (
    <div className="min-h-screen" style={{ background: "#0A0A0A" }}>
      {/* ── Header ── */}
      <header
        className="sticky top-0 z-50"
        style={{ background: "rgba(10,10,10,0.95)", borderBottom: "1px solid #1A1A1A", backdropFilter: "blur(12px)" }}
      >
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <img src={FL_LOGO} alt="Faderlabs" className="h-6 object-contain" />
          </div>
          <div className="flex items-center gap-4">

            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-sm transition-colors"
              style={{ color: "#555555" }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#FAFAFA")}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "#555555")}
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section
        className="relative py-14 md:py-20 overflow-hidden fl-grain"
        style={{ background: "linear-gradient(180deg, #0F0F0F 0%, #0A0A0A 100%)" }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,214,0,0.06) 0%, transparent 60%)",
          }}
        />
        <div className="container relative z-10">
          <div className="flex items-start justify-between gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-6">
                <div className="fl-label">Client Hub</div>
              </div>
              <h1 className="text-4xl md:text-5xl font-black mb-3 leading-tight" style={{ color: "#FAFAFA" }}>
                Welcome to Your<br />
                <span style={{ color: "#FFD600" }}>Content Hub</span>
              </h1>
              <p className="text-base md:text-lg max-w-xl leading-relaxed" style={{ color: "#888888" }}>
                Your personalised space to manage your projects — review, comment, download files, and approve deliverables seamlessly.
              </p>
            </div>
            <div className="hidden md:flex items-center justify-center flex-shrink-0 pt-2">
              <img src={MW_LOGO} alt="Multi-Wing" className="h-16 object-contain opacity-90" />
            </div>
          </div>
        </div>
      </section>



      {/* ── Content ── */}
      <main className="container py-8 pb-16">

        {/* ── Status Dashboard ── */}
        {projects && projects.length > 0 && (() => {
          const inQueue    = projects.filter((p: any) => (p.projectStatus ?? "started") === "started").length;
          const inProgress = projects.filter((p: any) => p.projectStatus === "in_progress").length;
          const completed  = projects.filter((p: any) => p.projectStatus === "completed").length;
          const total      = projects.length;
          return (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={16} style={{ color: "#FFD600" }} />
                <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: "#555555" }}>Project Overview</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Total */}
                <div className="rounded-xl p-4" style={{ background: "#111", border: "1px solid #1A1A1A" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Folder size={14} style={{ color: "#888" }} />
                    <span className="text-xs font-medium uppercase tracking-widest" style={{ color: "#555" }}>Total</span>
                  </div>
                  <div className="text-3xl font-black" style={{ color: "#FAFAFA" }}>{total}</div>
                  <div className="text-xs mt-1" style={{ color: "#444" }}>projects</div>
                </div>
                {/* In Queue */}
                <div className="rounded-xl p-4" style={{ background: "rgba(136,136,136,0.06)", border: "1px solid rgba(136,136,136,0.15)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <CircleDot size={14} style={{ color: "#888888" }} />
                    <span className="text-xs font-medium uppercase tracking-widest" style={{ color: "#888888" }}>In Queue</span>
                  </div>
                  <div className="text-3xl font-black" style={{ color: "#888888" }}>{inQueue}</div>
                  <div className="text-xs mt-1" style={{ color: "rgba(136,136,136,0.5)" }}>project{inQueue !== 1 ? "s" : ""}</div>
                </div>
                {/* In Progress */}
                <div className="rounded-xl p-4" style={{ background: "rgba(255,214,0,0.06)", border: "1px solid rgba(255,214,0,0.15)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Zap size={14} style={{ color: "#FFD600" }} />
                    <span className="text-xs font-medium uppercase tracking-widest" style={{ color: "#FFD600" }}>In Progress</span>
                  </div>
                  <div className="text-3xl font-black" style={{ color: "#FFD600" }}>{inProgress}</div>
                  <div className="text-xs mt-1" style={{ color: "rgba(255,214,0,0.5)" }}>project{inProgress !== 1 ? "s" : ""}</div>
                </div>
                {/* Completed */}
                <div className="rounded-xl p-4" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy size={14} style={{ color: "#22C55E" }} />
                    <span className="text-xs font-medium uppercase tracking-widest" style={{ color: "#22C55E" }}>Completed</span>
                  </div>
                  <div className="text-3xl font-black" style={{ color: "#22C55E" }}>{completed}</div>
                  <div className="text-xs mt-1" style={{ color: "rgba(34,197,94,0.5)" }}>project{completed !== 1 ? "s" : ""}</div>
                </div>
              </div>
              {/* Progress bar */}
              {total > 0 && (
                <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: "#1A1A1A" }}>
                  <div className="h-full flex">
                    {inQueue > 0    && <div style={{ width: `${(inQueue    / total) * 100}%`, background: "#888888" }} />}
                    {inProgress > 0 && <div style={{ width: `${(inProgress / total) * 100}%`, background: "#FFD600" }} />}
                    {completed > 0  && <div style={{ width: `${(completed  / total) * 100}%`, background: "#22C55E" }} />}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold mb-1" style={{ color: "#FAFAFA" }}>Your Projects</h2>
            <p className="text-sm" style={{ color: "#555555" }}>
              Click a project to view deliverables, leave feedback, and download files.
            </p>
          </div>
          <Link href="/new-project">
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all shrink-0"
              style={{ background: "#FFD600", color: "#0A0A0A" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#FFE033")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "#FFD600")}
            >
              <PlusCircle size={16} />
              New Project
            </button>
          </Link>
        </div>

        {projectsLoading ? (
          <div className="flex items-center justify-center py-24 gap-3" style={{ color: "#555555" }}>
            <Loader2 size={20} className="animate-spin" />
            <span>Loading projects…</span>
          </div>
        ) : !projects || projects.length === 0 ? (
          <div className="text-center py-24">
            <Folder size={40} className="mx-auto mb-4 opacity-20" style={{ color: "#FFD600" }} />
            <h3 className="text-lg font-bold mb-2" style={{ color: "#FAFAFA" }}>No projects yet</h3>
            <p className="text-sm" style={{ color: "#555555" }}>
              Faderlabs is preparing your deliverables. Check back soon.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((project: any) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="py-8" style={{ borderTop: "1px solid #1A1A1A" }}>
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
          <img src={FL_LOGO} alt="Faderlabs" className="h-5 object-contain opacity-40" />
          <p className="text-xs" style={{ color: "#444444" }}>
            © {new Date().getFullYear()} Faderlabs · Confidential Client Portal
          </p>
        </div>
      </footer>
    </div>
  );
}
