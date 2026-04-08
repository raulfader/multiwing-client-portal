import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useState, useRef } from "react";
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
  Music2,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Link } from "wouter";

const MW_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663488436824/MCxqt4HyvEAyGGokboGjqW/MWlogo_8bb403fd.webp";
const FL_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663488436824/iLXUQ5XAKoVQ9DttVq4BTX/faderlabs-logo-white_d7a18ec8.png";

const PILLAR_ACCENT_COLORS = ["#FFD600", "#64DD17", "#EF4444", "#A78BFA", "#38BDF8"];

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
  const [currentTime, setCurrentTime] = useState<number | undefined>(undefined);
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
    if (!comment.trim()) return;
    addComment.mutate({ trackId, content: comment.trim(), timestampSeconds: currentTime ? Math.floor(currentTime) : undefined });
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

      {/* Comment list */}
      {comments && comments.length > 0 && (
        <div className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-1">
          {comments.map((c) => (
            <div key={c.id} className="rounded-lg p-3" style={{ background: "#111111", border: "1px solid #2A2A2A" }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold" style={{ color: "#FFD600" }}>
                  {c.userName ?? "Client"}
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

      {/* Comment form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={`Add a comment on "${trackTitle}"...`}
          className="flex-1 text-sm px-3 py-2 rounded-lg outline-none transition-colors"
          style={{
            background: "#111111",
            border: "1px solid #2A2A2A",
            color: "#FAFAFA",
          }}
          onFocus={(e) => (e.target.style.borderColor = "rgba(255,214,0,0.4)")}
          onBlur={(e) => (e.target.style.borderColor = "#2A2A2A")}
        />
        <button
          type="submit"
          disabled={!comment.trim() || addComment.isPending}
          className="px-3 py-2 rounded-lg flex items-center gap-1.5 text-sm font-semibold transition-all"
          style={{ background: "#FFD600", color: "#0A0A0A" }}
        >
          {addComment.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </form>
    </div>
  );
}

// ── Pillar Card ────────────────────────────────────────────────────────────────
function PillarCard({ pillar, accentColor, index }: { pillar: any; accentColor: string; index: number }) {
  const { data: tracks, isLoading: tracksLoading } = trpc.tracks.byPillar.useQuery({ pillarId: pillar.id });
  const { data: myApproval, refetch: refetchApproval } = trpc.approvals.myApproval.useQuery({ pillarId: pillar.id });
  const [approvalNote, setApprovalNote] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<"approved" | "rejected" | null>(null);
  const [currentTimes, setCurrentTimes] = useState<Record<number, number>>({});

  const setApproval = trpc.approvals.set.useMutation({
    onSuccess: () => {
      refetchApproval();
      setApprovalNote("");
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
    setApproval.mutate({ pillarId: pillar.id, status: pendingStatus, note: approvalNote || undefined });
  };

  const pillarNum = String(index + 1).padStart(2, "0");

  return (
    <div className="fl-card overflow-hidden">
      {/* Pillar header */}
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

      {/* Tracks */}
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
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded"
                  style={{ background: `${accentColor}20`, color: accentColor }}
                >
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

      {/* Approval section */}
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
              <textarea
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                placeholder="Optional: add a note for Faderlabs…"
                rows={2}
                className="w-full text-sm px-3 py-2 rounded-lg outline-none resize-none"
                style={{ background: "#111111", border: "1px solid #2A2A2A", color: "#FAFAFA" }}
              />
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

// ── Login Screen ───────────────────────────────────────────────────────────────
function LoginScreen() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden fl-grain"
      style={{ background: "#0A0A0A" }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(255,214,0,0.05) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 text-center max-w-md w-full">
        {/* Logos */}
        <div className="flex items-center justify-center gap-6 mb-10">
          <img src={FL_LOGO} alt="Faderlabs" className="h-8 object-contain" style={{ filter: "brightness(1)" }} />
          <div className="w-px h-8" style={{ background: "#2A2A2A" }} />
          <img src={MW_LOGO} alt="MultiWing" className="h-10 object-contain" />
        </div>

        <div className="fl-label mb-4 mx-auto w-fit">Sonic Branding Portal</div>
        <h1 className="text-3xl font-black mb-3" style={{ color: "#FAFAFA" }}>
          MultiWing × Faderlabs
        </h1>
        <p className="text-base mb-8 leading-relaxed" style={{ color: "#888888" }}>
          Review your sonic branding proposals, listen to the tracks, leave feedback, and approve your preferred direction.
        </p>

        <a
          href={getLoginUrl()}
          className="fl-btn-primary w-full justify-center text-base py-4"
        >
          <ShieldCheck size={18} />
          Sign In to Access Portal
        </a>

        <p className="text-xs mt-6" style={{ color: "#555555" }}>
          Secure access via Manus OAuth · Powered by Faderlabs
        </p>
      </div>
    </div>
  );
}

// ── Main Portal ────────────────────────────────────────────────────────────────
export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
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
            <div className="fl-label hidden sm:inline-flex">Sonic Branding</div>
            <span className="text-sm hidden sm:block" style={{ color: "#888888" }}>
              {user?.name}
            </span>
            {user?.role === "admin" && (
              <Link
                href="/admin"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                style={{ background: "#1A1A1A", color: "#FFD600", border: "1px solid rgba(255,214,0,0.2)" }}
              >
                Admin
              </Link>
            )}
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
        className="relative py-16 md:py-24 overflow-hidden fl-grain"
        style={{ background: "linear-gradient(180deg, #0F0F0F 0%, #0A0A0A 100%)" }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,214,0,0.06) 0%, transparent 60%)",
          }}
        />
        <div className="container relative z-10">
          {/* Client logo in hero */}
          <div className="flex items-center gap-4 mb-8">
            <img src={MW_LOGO} alt="Multi-Wing" className="h-10 object-contain" />
            <div className="w-px h-8" style={{ background: "#2A2A2A" }} />
            <div className="fl-label">Sonic Branding Proposal</div>
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4 leading-tight" style={{ color: "#FAFAFA" }}>
            Multi-Wing<br />
            <span style={{ color: "#FFD600" }}>Sound Identity</span>
          </h1>
          <p className="text-base md:text-lg max-w-xl leading-relaxed" style={{ color: "#888888" }}>
            Below are the sonic branding pillars crafted for Multi-Wing. Listen to each track, leave your feedback, and approve your preferred direction for each pillar.
          </p>

          {/* Progress overview */}
          {pillars && pillars.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-3">
              {pillars.map((p, i) => (
                <a
                  key={p.id}
                  href={`#pillar-${p.id}`}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={{ background: "#141414", border: "1px solid #2A2A2A", color: "#888888" }}
                >
                  <span style={{ color: PILLAR_ACCENT_COLORS[i % PILLAR_ACCENT_COLORS.length] }}>●</span>
                  {p.title}
                  <ChevronRight size={12} />
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Pillars ── */}
      <main className="container py-12">
        {pillarsLoading ? (
          <div className="flex items-center justify-center py-24 gap-3" style={{ color: "#555555" }}>
            <Loader2 size={20} className="animate-spin" />
            <span>Loading pillars…</span>
          </div>
        ) : !pillars || pillars.length === 0 ? (
          <div className="text-center py-24">
            <Music2 size={40} className="mx-auto mb-4 opacity-20" style={{ color: "#FFD600" }} />
            <h3 className="text-lg font-bold mb-2" style={{ color: "#FAFAFA" }}>No pillars yet</h3>
            <p className="text-sm" style={{ color: "#555555" }}>
              Faderlabs is preparing your sonic branding proposal. Check back soon.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {pillars.map((pillar, i) => (
              <div key={pillar.id} id={`pillar-${pillar.id}`}>
                <PillarCard
                  pillar={pillar}
                  accentColor={PILLAR_ACCENT_COLORS[i % PILLAR_ACCENT_COLORS.length]}
                  index={i}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="mt-16 py-8" style={{ borderTop: "1px solid #1A1A1A" }}>
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
