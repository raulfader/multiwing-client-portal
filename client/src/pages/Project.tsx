import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, Link } from "wouter";
import {
  ArrowLeft, FolderOpen, FileText, Film, Archive, Music2,
  CheckCircle2, XCircle, Clock, Send, MessageSquare, RefreshCw,
  Play, Pause, Volume2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const MW_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663488436824/MCxqt4HyvEAyGGokboGjqW/MWlogo_0d44da07.webp";
const FL_LOGO_P = "https://d2xsxph8kpxj0f.cloudfront.net/310519663488436824/iLXUQ5XAKoVQ9DttVq4BTX/faderlabs-logo-white_d7a18ec8.png";
const PILLAR_ACCENT_COLORS = ["#64DD17", "#FFD600", "#d60000", "#A78BFA", "#FB923C"];

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ── Track Approval Badge ──────────────────────────────────────────────────────

function TrackApprovalBadge({ status }: { status?: string | null }) {
  if (!status || status === "pending") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
        style={{ background: "rgba(255,214,0,0.1)", color: "#FFD600", border: "1px solid rgba(255,214,0,0.2)" }}>
        <Clock size={11} /> Awaiting Decision
      </span>
    );
  }
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
        style={{ background: "rgba(100,221,23,0.1)", color: "#64DD17", border: "1px solid rgba(100,221,23,0.2)" }}>
        <CheckCircle2 size={11} /> Approved
      </span>
    );
  }
  if (status === "needs_changes") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
        style={{ background: "rgba(251,146,60,0.1)", color: "#FB923C", border: "1px solid rgba(251,146,60,0.2)" }}>
        <RefreshCw size={11} /> Needs Changes
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" }}>
      <XCircle size={11} /> Rejected
    </span>
  );
}

// ── Frame.io-style Audio Player with Timestamped Comments ────────────────────

interface TimestampedComment {
  id: number;
  content: string;
  timestampSeconds: number | null;
  userName: string | null;
  createdAt: Date;
}

function SonicTrackRow({
  track,
  trackIndex,
  accentColor,
}: {
  track: any;
  trackIndex: number;
  accentColor: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Pending timestamp for new comment (set by clicking progress bar)
  const [pendingTimestamp, setPendingTimestamp] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [showCommentBox, setShowCommentBox] = useState(false);

  const utils = trpc.useUtils();
  const { data: comments = [] } = trpc.comments.byTrack.useQuery({ trackId: track.id });
  const { data: myApproval } = trpc.trackApprovals.myApproval.useQuery({ trackId: track.id });

  const addComment = trpc.comments.add.useMutation({
    onSuccess: () => {
      setCommentText("");
      setPendingTimestamp(null);
      setShowCommentBox(false);
      utils.comments.byTrack.invalidate({ trackId: track.id });
      toast.success("Comment submitted");
    },
    onError: (e) => toast.error(e.message),
  });

  const setApproval = trpc.trackApprovals.set.useMutation({
    onSuccess: () => {
      utils.trackApprovals.myApproval.invalidate({ trackId: track.id });
      toast.success("Decision saved");
    },
    onError: (e) => toast.error(e.message),
  });

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => { setDuration(audio.duration); setIsLoading(false); };
    const onEnded = () => setIsPlaying(false);
    const onWaiting = () => setIsLoading(true);
    const onCanPlay = () => setIsLoading(false);
    const onError = () => { setAudioError("Failed to load audio"); setIsLoading(false); setIsPlaying(false); };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("error", onError);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("error", onError);
    };
  }, []);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      setIsLoading(true);
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        setAudioError("Playback failed");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const t = parseFloat(e.target.value);
    audio.currentTime = t;
    setCurrentTime(t);
  };

  // Click on progress bar to place a comment at that timestamp
  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const ts = Math.floor(ratio * duration);
    setPendingTimestamp(ts);
    setShowCommentBox(true);
    // Seek audio to that position
    if (audioRef.current) {
      audioRef.current.currentTime = ts;
      setCurrentTime(ts);
    }
  }, [duration]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Sort comments by timestamp
  const sortedComments = [...comments].sort((a, b) => {
    const ta = a.timestampSeconds ?? Infinity;
    const tb = b.timestampSeconds ?? Infinity;
    return ta - tb;
  });

  const timestampedComments = sortedComments.filter((c) => c.timestampSeconds != null);

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
      {/* Track header */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: accentColor }}>
              Track {trackIndex + 1}
            </span>
          </div>
          <p className="text-white font-semibold text-sm truncate">{track.title}</p>
          {track.description && <p className="text-white/40 text-xs mt-0.5 leading-relaxed">{track.description}</p>}
        </div>
        <TrackApprovalBadge status={myApproval?.status} />
      </div>

      {/* Audio player */}
      <div className="px-4 pb-3">
        <audio ref={audioRef} src={track.audioUrl} preload="metadata" crossOrigin="anonymous" />

        <div className="rounded-lg p-3" style={{ background: "#1A1A1A", border: "1px solid #2A2A2A" }}>
          {/* Top row: waveform icon + title + time */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-end gap-[3px] h-5 w-7 shrink-0">
              {isPlaying ? (
                [0, 0.15, 0.3, 0.45].map((delay, i) => (
                  <div key={i} className="wave-bar rounded-sm"
                    style={{ width: "3px", height: "100%", background: accentColor, animationDelay: `${delay}s`, transformOrigin: "bottom" }} />
                ))
              ) : (
                <Volume2 size={16} style={{ color: "#666" }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate text-white/70">{track.title}</p>
              {audioError && <p className="text-xs text-red-400">{audioError}</p>}
            </div>
            <span className="text-xs font-mono text-white/40 shrink-0">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Controls + progress */}
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              disabled={!!audioError}
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200"
              style={{ background: audioError ? "#2A2A2A" : accentColor, color: "#0A0A0A" }}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isLoading ? (
                <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause size={14} fill="currentColor" />
              ) : (
                <Play size={14} fill="currentColor" style={{ marginLeft: "2px" }} />
              )}
            </button>

            {/* Progress bar — click to place comment */}
            <div className="flex-1 relative group" ref={progressBarRef}>
              {/* Clickable overlay for placing comments */}
              <div
                className="absolute inset-0 z-20 cursor-crosshair"
                title="Click to add a comment at this timestamp"
                onClick={handleProgressClick}
              />
              {/* Background track */}
              <div className="absolute inset-y-0 left-0 right-0 flex items-center pointer-events-none">
                <div className="w-full h-1.5 rounded-full" style={{ background: "#2A2A2A" }}>
                  <div className="h-full rounded-full transition-all duration-100"
                    style={{ width: `${progress}%`, background: accentColor }} />
                </div>
              </div>
              {/* Comment markers on progress bar */}
              {duration > 0 && timestampedComments.map((c) => (
                <div
                  key={c.id}
                  className="absolute top-1/2 -translate-y-1/2 z-10 pointer-events-none"
                  style={{ left: `${((c.timestampSeconds ?? 0) / duration) * 100}%` }}
                >
                  <div className="w-2.5 h-2.5 rounded-full border-2 border-[#0A0A0A]"
                    style={{ background: "#FB923C", marginLeft: "-5px" }} />
                </div>
              ))}
              {/* Pending timestamp marker */}
              {duration > 0 && pendingTimestamp != null && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 z-10 pointer-events-none"
                  style={{ left: `${(pendingTimestamp / duration) * 100}%` }}
                >
                  <div className="w-3 h-3 rounded-full border-2 border-white animate-pulse"
                    style={{ background: "#FFD600", marginLeft: "-6px" }} />
                </div>
              )}
              {/* Seekable range input (behind click overlay for keyboard) */}
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                className="audio-progress relative z-10 pointer-events-none"
                style={{ background: "transparent" }}
                aria-label="Seek"
              />
            </div>
          </div>

          {/* Hint */}
          <p className="text-[10px] text-white/25 mt-2 text-right">Click the progress bar to place a comment at a timestamp</p>
        </div>
      </div>

      {/* Per-track approval buttons */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-white/40 font-medium mr-1">Your decision:</span>
          <Button
            size="sm"
            onClick={() => setApproval.mutate({ trackId: track.id, status: "approved" })}
            disabled={setApproval.isPending}
            className="h-7 px-3 text-xs gap-1.5 border"
            style={myApproval?.status === "approved"
              ? { background: "rgba(100,221,23,0.2)", color: "#64DD17", borderColor: "rgba(100,221,23,0.4)" }
              : { background: "rgba(100,221,23,0.07)", color: "#64DD17", borderColor: "rgba(100,221,23,0.2)" }}
          >
            <CheckCircle2 size={12} /> Approve
          </Button>
          <Button
            size="sm"
            onClick={() => setApproval.mutate({ trackId: track.id, status: "needs_changes" })}
            disabled={setApproval.isPending}
            className="h-7 px-3 text-xs gap-1.5 border"
            style={myApproval?.status === "needs_changes"
              ? { background: "rgba(251,146,60,0.2)", color: "#FB923C", borderColor: "rgba(251,146,60,0.4)" }
              : { background: "rgba(251,146,60,0.07)", color: "#FB923C", borderColor: "rgba(251,146,60,0.2)" }}
          >
            <RefreshCw size={12} /> Needs Changes
          </Button>
          <Button
            size="sm"
            onClick={() => setApproval.mutate({ trackId: track.id, status: "rejected" })}
            disabled={setApproval.isPending}
            className="h-7 px-3 text-xs gap-1.5 border"
            style={myApproval?.status === "rejected"
              ? { background: "rgba(239,68,68,0.2)", color: "#EF4444", borderColor: "rgba(239,68,68,0.4)" }
              : { background: "rgba(239,68,68,0.07)", color: "#EF4444", borderColor: "rgba(239,68,68,0.2)" }}
          >
            <XCircle size={12} /> Reject
          </Button>
        </div>
      </div>

      {/* Comment input box (shown when a timestamp is pending or user opens it) */}
      {showCommentBox && (
        <div className="px-4 pb-4">
          <div className="rounded-lg p-3 space-y-2" style={{ background: "rgba(255,214,0,0.04)", border: "1px solid rgba(255,214,0,0.15)" }}>
            {pendingTimestamp != null && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold" style={{ color: "#FFD600" }}>
                  @ {formatTime(pendingTimestamp)}
                </span>
                <span className="text-xs text-white/40">— Comment at this timestamp</span>
                <button
                  className="ml-auto text-xs text-white/30 hover:text-white/60"
                  onClick={() => setPendingTimestamp(null)}
                >
                  Clear
                </button>
              </div>
            )}
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={pendingTimestamp != null ? `Comment at ${formatTime(pendingTimestamp)}…` : "Leave feedback…"}
              className="bg-white/5 border-white/20 text-white placeholder:text-white/30 text-xs resize-none min-h-[60px]"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="ghost"
                className="text-white/40 hover:text-white/70 h-7 text-xs"
                onClick={() => { setShowCommentBox(false); setPendingTimestamp(null); setCommentText(""); }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (!commentText.trim()) return;
                  addComment.mutate({
                    trackId: track.id,
                    content: commentText.trim(),
                    timestampSeconds: pendingTimestamp ?? undefined,
                  });
                }}
                disabled={!commentText.trim() || addComment.isPending}
                className="h-7 text-xs gap-1.5 bg-[#FFD600] hover:bg-[#FFD600]/90 text-black font-semibold"
              >
                <Send size={11} /> Submit
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Comments list */}
      {sortedComments.length > 0 && (
        <div className="px-4 pb-4 space-y-2">
          <button
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
            onClick={() => setShowCommentBox(true)}
          >
            <MessageSquare size={12} />
            {sortedComments.length} comment{sortedComments.length !== 1 ? "s" : ""}
          </button>
          <div className="space-y-1.5">
            {sortedComments.map((c: any) => (
              <div key={c.id} className="flex items-start gap-2 rounded-lg px-3 py-2"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                {c.timestampSeconds != null && (
                  <button
                    className="shrink-0 text-xs font-mono font-bold px-1.5 py-0.5 rounded"
                    style={{ background: "rgba(251,146,60,0.15)", color: "#FB923C" }}
                    onClick={() => {
                      if (audioRef.current) {
                        audioRef.current.currentTime = c.timestampSeconds;
                        setCurrentTime(c.timestampSeconds);
                      }
                    }}
                    title="Jump to timestamp"
                  >
                    {formatTime(c.timestampSeconds)}
                  </button>
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-white/80 text-xs">{c.content}</span>
                  <div className="text-white/30 text-[10px] mt-0.5">
                    {c.userName ?? "Client"} · {new Date(c.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add comment button when no comments yet */}
      {sortedComments.length === 0 && !showCommentBox && (
        <div className="px-4 pb-4">
          <button
            className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors"
            onClick={() => setShowCommentBox(true)}
          >
            <MessageSquare size={12} /> Add a comment
          </button>
        </div>
      )}
    </div>
  );
}

// ── Pillar Card ───────────────────────────────────────────────────────────────

function SonicPillarCard({ pillar, accentColor, index }: { pillar: any; accentColor: string; index: number }) {
  const { data: tracks = [], isLoading } = trpc.tracks.byPillar.useQuery({ pillarId: pillar.id });

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${accentColor}22`, background: "#111111" }}>
      <div className="p-6 border-b" style={{ borderColor: `${accentColor}22` }}>
        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-2" style={{ color: accentColor }}>
          Pillar {index + 1}
        </div>
        <h3 className="text-xl font-bold text-white mb-1">{pillar.title}</h3>
        {pillar.description && <p className="text-white/50 text-sm leading-relaxed">{pillar.description}</p>}
      </div>
      <div className="p-6">
        {isLoading ? (
          <div className="text-white/40 text-sm">Loading tracks…</div>
        ) : tracks.length === 0 ? (
          <div className="text-white/30 text-sm italic">No tracks uploaded yet.</div>
        ) : (
          <div className="space-y-4">
            {tracks.map((track: any, ti: number) => (
              <SonicTrackRow key={track.id} track={track} trackIndex={ti} accentColor={accentColor} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sonic Branding Project View ───────────────────────────────────────────────

function SonicBrandingProjectView({ loading }: { loading: boolean }) {
  const { isAuthenticated } = useAuth();
  const { data: pillars, isLoading: pillarsLoading } = trpc.pillars.list.useQuery(undefined, { enabled: isAuthenticated });

  if (loading || pillarsLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#FFD600] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <header className="border-b border-white/10 bg-[#0A0A0A]/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <button className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Hub</span>
            </button>
          </Link>
          <img src={FL_LOGO_P} alt="Faderlabs" className="h-6 object-contain" />
        </div>
      </header>

      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,214,0,0.06) 0%, transparent 60%)" }} />
        <div className="relative max-w-6xl mx-auto px-6 py-16">
          <div className="inline-flex items-center gap-2 bg-[#FFD600]/10 border border-[#FFD600]/20 rounded-full px-3 py-1 mb-4">
            <Music2 size={12} className="text-[#FFD600]" />
            <span className="text-[#FFD600] text-xs font-medium uppercase tracking-widest">Sonic Branding</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">Sonic Branding Proposal</h1>
          <p className="text-white/60 text-lg max-w-2xl leading-relaxed">
            Listen to each track, click the progress bar to leave timestamped feedback, and mark your decision for each track.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pb-16 space-y-10">
        {!pillars || pillars.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-white/40">No pillars available yet. Check back soon.</p>
          </div>
        ) : (
          pillars.map((pillar: any, i: number) => (
            <SonicPillarCard
              key={pillar.id}
              pillar={pillar}
              accentColor={PILLAR_ACCENT_COLORS[i % PILLAR_ACCENT_COLORS.length]}
              index={i}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Deliverable fallback icons by title keyword ───────────────────────────────
const DELIVERABLE_FALLBACK_ICONS: { keywords: string[]; url: string }[] = [
  {
    keywords: ["shot list", "shotlist"],
    url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663488436824/MCxqt4HyvEAyGGokboGjqW/shot-list-icon-neon-APQ2af52KRZG5yEjnXD6Bn.webp",
  },
  {
    keywords: ["storyboard", "story board"],
    url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663488436824/MCxqt4HyvEAyGGokboGjqW/storyboard-icon-neon-8Lg6wo7yrveaSSqrNW6WxN.webp",
  },
];
const ARCHIVE_ICON_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663488436824/MCxqt4HyvEAyGGokboGjqW/archive-footage-icon-v2_4e48baa2.png";

function getFallbackIcon(title: string): string {
  const lower = (title ?? "").toLowerCase();
  for (const entry of DELIVERABLE_FALLBACK_ICONS) {
    if (entry.keywords.some((kw) => lower.includes(kw))) return entry.url;
  }
  return ARCHIVE_ICON_URL;
}

// ── Deliverable Card ──────────────────────────────────────────────────────────

function DeliverableCard({ deliverable }: { deliverable: any }) {
  const fileTypeIcon =
    deliverable.fileType === "document" ? <FileText className="w-4 h-4" /> :
    deliverable.fileType === "archive" ? <Archive className="w-4 h-4" /> :
    <Film className="w-4 h-4" />;
  const fallbackIcon = getFallbackIcon(deliverable.title ?? "");

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden bg-white/3 hover:border-[#FFD600]/30 transition-all duration-300">
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-black">
        {deliverable.thumbnailUrl ? (
          <img
            src={deliverable.thumbnailUrl}
            alt={deliverable.title}
            className="w-full h-full object-contain p-4 opacity-90 hover:opacity-100 transition-opacity bg-black"
          />
        ) : (
          <img
            src={fallbackIcon}
            alt={deliverable.title}
            className="w-full h-full object-contain p-6 opacity-70"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-3 left-3 flex items-center gap-2 text-white/80 text-xs">
          {fileTypeIcon}
          <span className="uppercase tracking-widest font-medium">{deliverable.fileType}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="text-white font-semibold text-sm">{deliverable.title}</h3>
          {deliverable.description && (
            <p className="text-white/50 text-xs mt-1 leading-relaxed">{deliverable.description}</p>
          )}
        </div>
        {deliverable.downloadUrl && (
          <a href={deliverable.downloadUrl} target="_blank" rel="noopener noreferrer">
            <Button size="sm" className="w-full bg-[#FFD600] hover:bg-[#FFD600]/90 text-black font-semibold text-xs gap-1.5">
              <FolderOpen className="w-3.5 h-3.5" />
              My Files
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}

// ── Main Project Page ─────────────────────────────────────────────────────────

export default function ProjectPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user, loading, isAuthenticated } = useAuth();
  const isSonicBranding = slug === "sonic-branding";

  // Always call all hooks unconditionally — no early returns before hooks
  const { data: project, isLoading: loadingProject } = trpc.projects.bySlug.useQuery(
    { slug: slug ?? "" },
    { enabled: !!slug && isAuthenticated && !isSonicBranding }
  );
  const { data: deliverables = [], isLoading: loadingDeliverables } = trpc.deliverables.byProject.useQuery(
    { projectId: project?.id ?? 0 },
    { enabled: !!project?.id && !isSonicBranding }
  );

  // Sonic Branding has its own dedicated view — render after all hooks are declared
  if (isSonicBranding) {
    return <SonicBrandingProjectView loading={loading} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#FFD600] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-white/60">Please sign in to access this content.</p>
          <a href={getLoginUrl()}>
            <Button className="bg-[#FFD600] text-black font-semibold hover:bg-[#FFD600]/90">Sign In</Button>
          </a>
        </div>
      </div>
    );
  }

  if (loadingProject) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#FFD600] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-white/60">Project not found.</p>
          <Link href="/">
            <Button variant="outline" className="border-white/20 text-white bg-transparent">Back to Hub</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0A0A0A]/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <button className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Hub</span>
            </button>
          </Link>
          <img src={MW_LOGO} alt="Multi-Wing" className="h-7 object-contain" />
        </div>
      </header>

      {/* Hero */}
      <div className="relative overflow-hidden">
        {project.coverImageUrl && (
          <div className="absolute inset-0">
            <img src={project.coverImageUrl} alt={project.title} className="w-full h-full object-cover opacity-20" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A]/50 via-[#0A0A0A]/70 to-[#0A0A0A]" />
          </div>
        )}
        <div className="relative max-w-6xl mx-auto px-6 py-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="inline-flex items-center gap-2 bg-[#FFD600]/10 border border-[#FFD600]/20 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FFD600]" />
              <span className="text-[#FFD600] text-xs font-medium uppercase tracking-widest">
                {project.category ?? "Project"}
              </span>
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">{project.title}</h1>
          {project.description && (
            <p className="text-white/60 text-lg max-w-2xl leading-relaxed">{project.description}</p>
          )}
          <div className="mt-4 text-white/40 text-sm">
            {deliverables.length} deliverable{deliverables.length !== 1 ? "s" : ""} available
          </div>
        </div>
      </div>

      {/* Deliverables Grid */}
      <div className="max-w-6xl mx-auto px-6 pb-16">
        {loadingDeliverables ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#FFD600] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : deliverables.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-white/40">No deliverables available yet. Check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {deliverables.map((d: any) => (
              <DeliverableCard key={d.id} deliverable={d} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
