import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  ArrowLeft, FolderOpen, FileText, Film, Archive, Music2,
  CheckCircle2, XCircle, Clock, Send, MessageSquare, RefreshCw,
  Play, Pause, Volume2, Download, Loader2, Maximize2
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
  const [commenterName, setCommenterName] = useState("");
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

            {/* Clickable progress bar */}
            <div
              ref={progressBarRef}
              className="flex-1 relative cursor-crosshair"
              onClick={handleProgressClick}
              title="Click to add comment at this timestamp"
            >
              <div className="absolute inset-y-0 left-0 right-0 flex items-center pointer-events-none">
                <div className="w-full h-1 rounded-full" style={{ background: "#2A2A2A" }}>
                  <div
                    className="h-full rounded-full transition-all duration-100"
                    style={{ width: `${progress}%`, background: accentColor }}
                  />
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                onClick={(e) => e.stopPropagation()}
                className="audio-progress relative z-10"
                style={{ background: "transparent" }}
                aria-label="Seek"
              />
              {/* Timestamp comment markers */}
              {timestampedComments.map((c) => (
                duration > 0 && (
                  <div
                    key={c.id}
                    className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-black z-20 pointer-events-none"
                    style={{ left: `${((c.timestampSeconds ?? 0) / duration) * 100}%`, background: accentColor, opacity: 0.8 }}
                  />
                )
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Pending timestamp comment box */}
      {showCommentBox && (
        <div className="px-4 pb-3">
          <div className="rounded-lg p-3 space-y-2" style={{ background: "#111", border: `1px solid ${accentColor}33` }}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold" style={{ color: accentColor }}>
                @ {formatTime(pendingTimestamp ?? 0)}
              </span>
              <span className="text-xs text-white/40">— Add a comment at this timestamp</span>
            </div>
            <input
              value={commenterName}
              onChange={(e) => setCommenterName(e.target.value)}
              placeholder="Your name (required)"
              className="w-full text-xs px-3 py-2 rounded-lg outline-none"
              style={{ background: "#0A0A0A", border: "1px solid #2A2A2A", color: "#FAFAFA" }}
            />
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Your comment…"
              rows={2}
              className="text-xs resize-none"
              style={{ background: "#0A0A0A", border: "1px solid #2A2A2A", color: "#FAFAFA" }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (!commentText.trim()) { toast.error("Comment cannot be empty"); return; }
                  if (!commenterName.trim()) { toast.error("Please enter your name"); return; }
                  addComment.mutate({ trackId: track.id, content: commentText.trim(), commenterName: commenterName.trim(), timestampSeconds: pendingTimestamp ?? undefined });
                }}
                disabled={addComment.isPending}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                style={{ background: accentColor, color: "#0A0A0A" }}
              >
                {addComment.isPending ? <div className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <Send size={11} />}
                Submit
              </button>
              <button
                onClick={() => { setShowCommentBox(false); setPendingTimestamp(null); setCommentText(""); }}
                className="text-xs px-3 py-1.5 rounded-lg"
                style={{ background: "#1A1A1A", color: "#888", border: "1px solid #2A2A2A" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comments list */}
      {sortedComments.length > 0 && (
        <div className="px-4 pb-4 space-y-2">
          <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-2">
            <MessageSquare size={10} className="inline mr-1" />
            {sortedComments.length} Comment{sortedComments.length !== 1 ? "s" : ""}
          </p>
          {sortedComments.map((c) => (
            <div key={c.id} className="rounded-lg px-3 py-2.5 space-y-1" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2">
                {c.timestampSeconds != null && (
                  <button
                    onClick={() => {
                      if (audioRef.current) { audioRef.current.currentTime = c.timestampSeconds!; setCurrentTime(c.timestampSeconds!); }
                    }}
                    className="text-xs font-mono font-bold px-1.5 py-0.5 rounded"
                    style={{ background: `${accentColor}22`, color: accentColor }}
                  >
                    {formatTime(c.timestampSeconds)}
                  </button>
                )}
                <span className="text-xs font-semibold text-white/70">{c.commenterName ?? "Anonymous"}</span>
                <span className="text-xs text-white/25 ml-auto">{new Date(c.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-xs text-white/60 leading-relaxed">{c.content}</p>
              {c.adminResponse && (
                <div className="mt-1.5 pl-2 border-l-2" style={{ borderColor: accentColor }}>
                  <p className="text-xs font-semibold mb-0.5" style={{ color: accentColor }}>Faderlabs Response</p>
                  <p className="text-xs text-white/50 leading-relaxed">{c.adminResponse}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Approval buttons */}
      <div className="px-4 pb-4 flex gap-2 flex-wrap">
        <button
          onClick={() => setApproval.mutate({ trackId: track.id, status: "approved" })}
          disabled={setApproval.isPending}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
          style={myApproval?.status === "approved"
            ? { background: "#64DD17", color: "#0A0A0A" }
            : { background: "rgba(100,221,23,0.08)", color: "#64DD17", border: "1px solid rgba(100,221,23,0.2)" }}
        >
          <CheckCircle2 size={11} /> Approve
        </button>
        <button
          onClick={() => setApproval.mutate({ trackId: track.id, status: "needs_changes" })}
          disabled={setApproval.isPending}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
          style={myApproval?.status === "needs_changes"
            ? { background: "#FB923C", color: "#0A0A0A" }
            : { background: "rgba(251,146,60,0.08)", color: "#FB923C", border: "1px solid rgba(251,146,60,0.2)" }}
        >
          <RefreshCw size={11} /> Needs Changes
        </button>
        <button
          onClick={() => setApproval.mutate({ trackId: track.id, status: "rejected" })}
          disabled={setApproval.isPending}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
          style={myApproval?.status === "rejected"
            ? { background: "#EF4444", color: "#FAFAFA" }
            : { background: "rgba(239,68,68,0.08)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" }}
        >
          <XCircle size={11} /> Reject
        </button>
      </div>
    </div>
  );
}

// ── Deliverable Fallback Icons ────────────────────────────────────────────────
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

// ── Deliverable Audio Player (inline, no comments) ───────────────────────────

function DeliverableAudioPlayer({ src, title, accentColor = "#FFD600" }: { src: string; title: string; accentColor?: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

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
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else {
      setIsLoading(true);
      try { await audio.play(); setIsPlaying(true); }
      catch { setAudioError("Playback failed"); }
      finally { setIsLoading(false); }
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="rounded-lg p-3" style={{ background: "#1A1A1A", border: "1px solid #2A2A2A" }}>
      <audio ref={audioRef} src={src} preload="metadata" crossOrigin="anonymous" />
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
          <p className="text-xs font-medium truncate text-white/70">{title}</p>
          {audioError && <p className="text-xs text-red-400">{audioError}</p>}
        </div>
        <span className="text-xs font-mono text-white/40 shrink-0">{formatTime(currentTime)} / {formatTime(duration)}</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          disabled={!!audioError}
          className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200"
          style={{ background: audioError ? "#2A2A2A" : accentColor, color: "#0A0A0A" }}
        >
          {isLoading ? (
            <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause size={14} fill="currentColor" />
          ) : (
            <Play size={14} fill="currentColor" style={{ marginLeft: "2px" }} />
          )}
        </button>
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 right-0 flex items-center pointer-events-none">
            <div className="w-full h-1 rounded-full" style={{ background: "#2A2A2A" }}>
              <div className="h-full rounded-full transition-all duration-100" style={{ width: `${progress}%`, background: accentColor }} />
            </div>
          </div>
          <input
            type="range" min={0} max={duration || 100} step={0.1} value={currentTime}
            onChange={(e) => { const t = parseFloat(e.target.value); if (audioRef.current) { audioRef.current.currentTime = t; setCurrentTime(t); } }}
            className="audio-progress relative z-10" style={{ background: "transparent" }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Deliverable Video Player with Timestamped Comments ───────────────────────

function DeliverableVideoPlayer({ deliverable, accentColor = "#FFD600" }: { deliverable: any; accentColor?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true); // start loading while fetching stream URL
  const [videoError, setVideoError] = useState<string | null>(null);
  const [pendingTimestamp, setPendingTimestamp] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commenterName, setCommenterName] = useState("");
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);

  const getStreamUrl = trpc.deliverables.getStreamUrl.useMutation();

  // Fetch a presigned stream URL on mount (S3 requires signed GET for private buckets)
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setVideoError(null);
    getStreamUrl.mutateAsync({ id: deliverable.id })
      .then(({ url }) => { if (!cancelled) { setStreamUrl(url); setIsLoading(false); } })
      .catch((e) => { if (!cancelled) { setVideoError("Could not load video: " + (e?.message ?? "Unknown error")); setIsLoading(false); } });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliverable.id]);

  const utils = trpc.useUtils();
  const { data: comments = [] } = trpc.deliverableComments.byDeliverable.useQuery({ deliverableId: deliverable.id });
  const addComment = trpc.deliverableComments.add.useMutation({
    onSuccess: () => {
      setCommentText("");
      setPendingTimestamp(null);
      setShowCommentBox(false);
      utils.deliverableComments.byDeliverable.invalidate({ deliverableId: deliverable.id });
      toast.success("Comment submitted");
    },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTime = () => setCurrentTime(video.currentTime);
    const onMeta = () => { setDuration(video.duration); setIsLoading(false); };
    const onEnded = () => setIsPlaying(false);
    const onWaiting = () => setIsLoading(true);
    const onCanPlay = () => setIsLoading(false);
    const onError = () => { setVideoError("Failed to load video"); setIsLoading(false); setIsPlaying(false); };
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("loadedmetadata", onMeta);
    video.addEventListener("ended", onEnded);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("error", onError);
    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("loadedmetadata", onMeta);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("error", onError);
    };
  }, []);

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) { video.pause(); setIsPlaying(false); }
    else {
      setIsLoading(true);
      try { await video.play(); setIsPlaying(true); }
      catch { setVideoError("Playback failed"); }
      finally { setIsLoading(false); }
    }
  };

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const ts = Math.floor(ratio * duration);
    setPendingTimestamp(ts);
    setShowCommentBox(true);
    if (videoRef.current) { videoRef.current.currentTime = ts; setCurrentTime(ts); }
  }, [duration]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const timestampedComments = [...comments].filter(c => c.timestampSeconds != null).sort((a, b) => (a.timestampSeconds ?? 0) - (b.timestampSeconds ?? 0));
  const sortedComments = [...comments].sort((a, b) => (a.timestampSeconds ?? Infinity) - (b.timestampSeconds ?? Infinity));

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#111", border: `1px solid ${accentColor}22` }}>
      {/* Video element */}
      <div className="relative bg-black" style={{ aspectRatio: "16/9" }}>
        {streamUrl && (
          <video
            ref={videoRef}
            src={streamUrl}
            className="w-full h-full object-contain"
            preload="metadata"
            onClick={togglePlay}
            style={{ cursor: "pointer", display: "block" }}
          />
        )}
        {/* Loading spinner overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
            <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}
        {/* Play button overlay when paused */}
        {!isPlaying && !isLoading && !videoError && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: `${accentColor}CC` }}>
              <Play size={22} fill="#0A0A0A" style={{ color: "#0A0A0A", marginLeft: 3 }} />
            </div>
          </div>
        )}
        {/* Error overlay */}
        {videoError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <p className="text-red-400 text-sm">{videoError}</p>
          </div>
        )}
        {/* Fullscreen button */}
        <button
          onClick={() => videoRef.current?.requestFullscreen()}
          className="absolute top-2 right-2 w-7 h-7 rounded flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity"
          style={{ background: "rgba(0,0,0,0.5)" }}
          title="Fullscreen"
        >
          <Maximize2 size={13} style={{ color: "#fff" }} />
        </button>
      </div>

      {/* Custom controls */}
      <div className="px-4 py-3" style={{ background: "#1A1A1A", borderTop: "1px solid #2A2A2A" }}>
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            disabled={!!videoError}
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all"
            style={{ background: videoError ? "#2A2A2A" : accentColor, color: "#0A0A0A" }}
          >
            {isLoading ? (
              <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause size={14} fill="currentColor" />
            ) : (
              <Play size={14} fill="currentColor" style={{ marginLeft: 2 }} />
            )}
          </button>

          {/* Clickable scrub bar */}
          <div
            ref={progressBarRef}
            className="flex-1 relative cursor-crosshair"
            onClick={handleProgressClick}
            title="Click to add a comment at this timestamp"
          >
            <div className="absolute inset-y-0 left-0 right-0 flex items-center pointer-events-none">
              <div className="w-full h-1.5 rounded-full" style={{ background: "#2A2A2A" }}>
                <div className="h-full rounded-full transition-all duration-100" style={{ width: `${progress}%`, background: accentColor }} />
              </div>
            </div>
            <input
              type="range" min={0} max={duration || 100} step={0.1} value={currentTime}
              onChange={(e) => { const t = parseFloat(e.target.value); if (videoRef.current) { videoRef.current.currentTime = t; setCurrentTime(t); } }}
              onClick={(e) => e.stopPropagation()}
              className="audio-progress relative z-10" style={{ background: "transparent" }}
            />
            {/* Timestamp comment markers */}
            {timestampedComments.map((c) =>
              duration > 0 ? (
                <div
                  key={c.id}
                  className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-black z-20 pointer-events-none"
                  style={{ left: `${((c.timestampSeconds ?? 0) / duration) * 100}%`, background: accentColor, opacity: 0.9 }}
                  title={`${c.commenterName ?? "Anon"} @ ${formatTime(c.timestampSeconds ?? 0)}: ${c.content}`}
                />
              ) : null
            )}
          </div>

          <span className="text-xs font-mono text-white/40 shrink-0">{formatTime(currentTime)} / {formatTime(duration)}</span>
        </div>
        <p className="text-xs text-white/30 mt-2">Click the timeline to leave a timestamped comment</p>
      </div>

      {/* Pending comment box */}
      {showCommentBox && (
        <div className="px-4 pb-3">
          <div className="rounded-lg p-3 space-y-2" style={{ background: "#111", border: `1px solid ${accentColor}33` }}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold" style={{ color: accentColor }}>@ {formatTime(pendingTimestamp ?? 0)}</span>
              <span className="text-xs text-white/40">— Add a comment at this timestamp</span>
            </div>
            <input
              value={commenterName}
              onChange={(e) => setCommenterName(e.target.value)}
              placeholder="Your name (required)"
              className="w-full text-xs px-3 py-2 rounded-lg outline-none"
              style={{ background: "#0A0A0A", border: "1px solid #2A2A2A", color: "#FAFAFA" }}
            />
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Your comment…"
              rows={2}
              className="text-xs resize-none"
              style={{ background: "#0A0A0A", border: "1px solid #2A2A2A", color: "#FAFAFA" }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (!commentText.trim()) { toast.error("Comment cannot be empty"); return; }
                  if (!commenterName.trim()) { toast.error("Please enter your name"); return; }
                  addComment.mutate({ deliverableId: deliverable.id, content: commentText.trim(), commenterName: commenterName.trim(), timestampSeconds: pendingTimestamp ?? undefined });
                }}
                disabled={addComment.isPending}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                style={{ background: accentColor, color: "#0A0A0A" }}
              >
                {addComment.isPending ? <div className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <Send size={11} />}
                Submit
              </button>
              <button
                onClick={() => { setShowCommentBox(false); setPendingTimestamp(null); setCommentText(""); }}
                className="text-xs px-3 py-1.5 rounded-lg"
                style={{ background: "#1A1A1A", color: "#888", border: "1px solid #2A2A2A" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comments list */}
      {sortedComments.length > 0 && (
        <div className="px-4 pb-4 space-y-2">
          <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-2">
            <MessageSquare size={10} className="inline mr-1" />
            {sortedComments.length} Comment{sortedComments.length !== 1 ? "s" : ""}
          </p>
          {sortedComments.map((c) => (
            <div key={c.id} className="rounded-lg px-3 py-2.5 space-y-1" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2">
                {c.timestampSeconds != null && (
                  <button
                    onClick={() => { if (videoRef.current) { videoRef.current.currentTime = c.timestampSeconds!; setCurrentTime(c.timestampSeconds!); } }}
                    className="text-xs font-mono font-bold px-1.5 py-0.5 rounded"
                    style={{ background: `${accentColor}22`, color: accentColor }}
                  >
                    {formatTime(c.timestampSeconds)}
                  </button>
                )}
                <span className="text-xs font-semibold text-white/70">{c.commenterName ?? "Anonymous"}</span>
                <span className="text-xs text-white/25 ml-auto">{new Date(c.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-xs text-white/60 leading-relaxed">{c.content}</p>
              {c.adminResponse && (
                <div className="mt-1.5 pl-2 border-l-2" style={{ borderColor: accentColor }}>
                  <p className="text-xs font-semibold mb-0.5" style={{ color: accentColor }}>Faderlabs Response</p>
                  <p className="text-xs text-white/50 leading-relaxed">{c.adminResponse}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Separate component so hooks are always called at the top level
function DeliverableAudioCard({ deliverable, downloading, handleDownload }: { deliverable: any; downloading: boolean; handleDownload: () => void }) {
  const [audioStreamUrl, setAudioStreamUrl] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const getStreamUrl = trpc.deliverables.getStreamUrl.useMutation();

  useEffect(() => {
    let cancelled = false;
    getStreamUrl.mutateAsync({ id: deliverable.id })
      .then(({ url }) => { if (!cancelled) setAudioStreamUrl(url); })
      .catch((e) => { if (!cancelled) setAudioError(e?.message ?? "Failed to load audio"); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliverable.id]);

  return (
      <div className="border border-white/10 rounded-xl overflow-hidden bg-white/3 hover:border-[#FFD600]/30 transition-all duration-300">
        <div className="p-4 pb-0">
          <div className="flex items-center gap-2 mb-3">
            <Music2 size={14} style={{ color: "#FFD600" }} />
            <span className="text-xs uppercase tracking-widest font-medium text-white/50">Audio</span>
          </div>
          {audioError ? (
            <p className="text-xs text-red-400 py-2">{audioError}</p>
          ) : audioStreamUrl ? (
            <DeliverableAudioPlayer src={audioStreamUrl} title={deliverable.title} accentColor="#FFD600" />
          ) : (
            <div className="flex items-center gap-2 py-3 text-xs text-white/40">
              <div className="w-3 h-3 border border-white/30 border-t-white/80 rounded-full animate-spin" />
              Loading audio…
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="text-white font-semibold text-sm mb-1">{deliverable.title}</h3>
          {deliverable.description && <p className="text-white/50 text-xs leading-relaxed">{deliverable.description}</p>}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg transition-all"
            style={{ background: "rgba(255,214,0,0.1)", color: "#FFD600", border: "1px solid rgba(255,214,0,0.25)" }}
          >
            {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            {downloading ? "Preparing…" : "Download File"}
          </button>
        </div>
      </div>
    );
}

function DeliverableCard({ deliverable }: { deliverable: any }) {
  // Determine type: only treat as video/audio if it has an actual S3 file attached
  const hasS3File = !!deliverable.fileKey;
  const isVideo = hasS3File && (deliverable.fileType === "video" || /\.(mp4|mov|webm|avi|mkv)$/i.test(deliverable.downloadUrl ?? ""));
  const isAudio = hasS3File && (deliverable.fileType === "audio" || /\.(mp3|wav|aac|ogg|flac|m4a)$/i.test(deliverable.downloadUrl ?? ""));
  const isLegacy = !hasS3File;

  const fileTypeIcon =
    isAudio ? <Music2 className="w-4 h-4" /> :
    isVideo ? <Film className="w-4 h-4" /> :
    deliverable.fileType === "document" ? <FileText className="w-4 h-4" /> :
    deliverable.fileType === "archive" ? <Archive className="w-4 h-4" /> :
    <Film className="w-4 h-4" />;
  const fallbackIcon = getFallbackIcon(deliverable.title ?? "");

  const getDownloadUrl = trpc.deliverables.getDownloadUrl.useMutation();
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!hasS3File) return;
    setDownloading(true);
    try {
      const { url } = await getDownloadUrl.mutateAsync({ id: deliverable.id });
      const a = document.createElement("a");
      a.href = url;
      a.download = deliverable.fileName || deliverable.title;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  if (isVideo) {
    return (
      <div className="border border-white/10 rounded-xl overflow-hidden bg-white/3 hover:border-[#FFD600]/30 transition-all duration-300">
        <div className="p-4 pb-2">
          <div className="flex items-center gap-2 mb-3">
            <Film size={14} style={{ color: "#FFD600" }} />
            <span className="text-xs uppercase tracking-widest font-medium text-white/50">Video</span>
          </div>
          <h3 className="text-white font-semibold text-sm mb-1">{deliverable.title}</h3>
          {deliverable.description && <p className="text-white/50 text-xs mb-3 leading-relaxed">{deliverable.description}</p>}
        </div>
        <DeliverableVideoPlayer deliverable={deliverable} accentColor="#FFD600" />
        <div className="p-4 pt-3">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg transition-all"
            style={{ background: "rgba(255,214,0,0.1)", color: "#FFD600", border: "1px solid rgba(255,214,0,0.25)" }}
          >
            {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            {downloading ? "Preparing…" : "Download File"}
          </button>
        </div>
      </div>
    );
  }

  if (isAudio) {
    return <DeliverableAudioCard deliverable={deliverable} downloading={downloading} handleDownload={handleDownload} />;
  }

  // ── S3 non-media file (document/archive): thumbnail + download ─────────────────
  if (hasS3File) {
    return (     <div className="border border-white/10 rounded-xl overflow-hidden bg-white/3 hover:border-[#FFD600]/30 transition-all duration-300">
        <div className="relative aspect-video overflow-hidden bg-black">
          {deliverable.thumbnailUrl ? (
            <img src={deliverable.thumbnailUrl} alt={deliverable.title} className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity bg-black" />
          ) : (
            <img src={fallbackIcon} alt={deliverable.title} className="w-full h-full object-cover opacity-70" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-3 left-3 flex items-center gap-2 text-white/80 text-xs">
            {fileTypeIcon}
            <span className="uppercase tracking-widest font-medium">{deliverable.fileType}</span>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <h3 className="text-white font-semibold text-sm">{deliverable.title}</h3>
            {deliverable.description && <p className="text-white/50 text-xs mt-1 leading-relaxed">{deliverable.description}</p>}
          </div>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg transition-all"
            style={{ background: "rgba(255,214,0,0.1)", color: "#FFD600", border: "1px solid rgba(255,214,0,0.25)" }}
          >
            {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            {downloading ? "Preparing…" : "Download File"}
          </button>
        </div>
      </div>
    );
  }

  // ── LEGACY: no S3 file — thumbnail + external link, completely unchanged ───
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden bg-white/3 hover:border-[#FFD600]/30 transition-all duration-300">
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-black">
        {deliverable.thumbnailUrl ? (
          <img
            src={deliverable.thumbnailUrl}
            alt={deliverable.title}
            className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity bg-black"
          />
        ) : (
          <img
            src={fallbackIcon}
            alt={deliverable.title}
            className="w-full h-full object-cover opacity-70"
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


// ── Sonic Pillar Card ─────────────────────────────────────────────────────────

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
  const [, navigate] = useLocation();
  const { data: pillars, isLoading: pillarsLoading } = trpc.pillars.list.useQuery(undefined, { enabled: isAuthenticated });
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/?returnTo=/projects/sonic-branding", { replace: true });
    }
  }, [loading, isAuthenticated, navigate]);
  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#FFD600] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (pillarsLoading) {
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

// ── Main Project Page ─────────────────────────────────────────────────────────

export default function ProjectPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
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
  // Redirect unauthenticated users to login with returnTo param
  useEffect(() => {
    if (!loading && !isAuthenticated && !isSonicBranding) {
      navigate(`/?returnTo=/projects/${slug}`, { replace: true });
    }
  }, [loading, isAuthenticated, isSonicBranding, navigate, slug]);
  // Sonic Branding has its own dedicated view — render after all hooks are declared
  if (isSonicBranding) {
    return <SonicBrandingProjectView loading={loading} />;
  }
  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#FFD600] border-t-transparent rounded-full animate-spin" />
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
