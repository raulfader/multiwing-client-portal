import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  ArrowLeft, FolderOpen, FileText, Film, Archive, Music2,
  CheckCircle2, XCircle, Clock, Send, MessageSquare, RefreshCw,
  Play, Pause, Volume2, Download, Loader2, Maximize2, X,
  Share2, Copy, Trash2, Eye, Users, Pencil, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const MW_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663488436824/MCxqt4HyvEAyGGokboGjqW/MWlogo_0d44da07.webp";
const FL_LOGO_P = "https://d2xsxph8kpxj0f.cloudfront.net/310519663488436824/iLXUQ5XAKoVQ9DttVq4BTX/faderlabs-logo-white_d7a18ec8.png";
const PILLAR_ACCENT_COLORS = ["#64DD17", "#FFD600", "#d60000", "#A78BFA", "#FB923C"];

// ── Share Modal ────────────────────────────────────────────────────────────────────────────

function ShareModal({ project, onClose }: { project: any; onClose: () => void }) {
  const [tab, setTab] = useState<"create" | "manage">("create");
  // Multi-email tag state
  const [emailTags, setEmailTags] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [tagError, setTagError] = useState("");
  // Batch send state
  const [sentEmails, setSentEmails] = useState<string[]>([]);
  const [lastShareUrl, setLastShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);

  const utils = trpc.useUtils();

  const createShare = trpc.shares.create.useMutation({
    onError: (err) => toast.error(err.message),
  });

  const { data: shares = [], refetch: refetchShares } = trpc.shares.list.useQuery(
    { projectId: project.id },
    { enabled: true }
  );

  const revokeShare = trpc.shares.revoke.useMutation({
    onSuccess: () => { toast.success("Access revoked"); refetchShares(); },
    onError: (err) => toast.error(err.message),
  });

  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const addTag = (raw: string) => {
    const val = raw.trim().toLowerCase();
    if (!val) return;
    if (!isValidEmail(val)) { setTagError(`"${val}" is not a valid email`); return; }
    if (emailTags.includes(val)) { setTagError(`"${val}" is already in the list`); return; }
    setEmailTags((prev) => [...prev, val]);
    setEmailInput("");
    setTagError("");
  };

  const removeTag = (idx: number) => setEmailTags((prev) => prev.filter((_, i) => i !== idx));

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(emailInput);
    } else if (e.key === "Backspace" && !emailInput && emailTags.length > 0) {
      setEmailTags((prev) => prev.slice(0, -1));
    }
  };

  const handleInputBlur = () => { if (emailInput.trim()) addTag(emailInput); };

  const handleSendAll = async () => {
    // Flush any typed-but-not-yet-tagged email
    const pending = emailInput.trim().toLowerCase();
    let finalTags = emailTags;
    if (pending) {
      if (!isValidEmail(pending)) { setTagError(`"${pending}" is not a valid email`); return; }
      if (!emailTags.includes(pending)) finalTags = [...emailTags, pending];
      setEmailTags(finalTags);
      setEmailInput("");
      setTagError("");
    }
    if (finalTags.length === 0) { toast.error("Add at least one email address"); return; }
    setSending(true);
    let lastUrl: string | null = null;
    const succeeded: string[] = [];
    for (const em of finalTags) {
      try {
        const result = await createShare.mutateAsync({
          projectId: project.id,
          email: em,
          accessLevel: "download" as const,
          origin: window.location.origin,
        });
        lastUrl = result.shareUrl;
        succeeded.push(em);
      } catch {
        // individual error already toasted by onError
      }
    }
    setSending(false);
    if (succeeded.length > 0) {
      setSentEmails(succeeded);
      setLastShareUrl(lastUrl);
      refetchShares();
    }
  };

  const handleCopy = () => {
    if (!lastShareUrl) return;
    navigator.clipboard.writeText(lastShareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetForm = () => {
    setEmailTags([]);
    setEmailInput("");
    setTagError("");
    setSentEmails([]);
    setLastShareUrl(null);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: "#111", border: "1px solid #2A2A2A" }}>
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #1A1A1A" }}>
          <div className="flex items-center gap-2">
            <Share2 size={16} style={{ color: "#FFD600" }} />
            <span className="font-semibold text-white">Share Project</span>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors"><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="flex" style={{ borderBottom: "1px solid #1A1A1A" }}>
          {(["create", "manage"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-3 text-sm font-medium transition-colors"
              style={tab === t ? { color: "#FFD600", borderBottom: "2px solid #FFD600" } : { color: "#666" }}
            >
              {t === "create" ? "Invite People" : `Manage Access (${shares.length})`}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === "create" ? (
            <div className="space-y-4">
              {sentEmails.length === 0 ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#888" }}>Email Addresses</label>
                    {/* Tag container */}
                    <div
                      className="flex flex-wrap gap-1.5 px-3 py-2 rounded-lg min-h-[48px] cursor-text"
                      style={{ background: "#1A1A1A", border: `1px solid ${tagError ? "#EF4444" : "#2A2A2A"}` }}
                      onClick={(e) => (e.currentTarget.querySelector("input") as HTMLInputElement | null)?.focus()}
                    >
                      {emailTags.map((tag, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium" style={{ background: "rgba(255,214,0,0.12)", color: "#FFD600", border: "1px solid rgba(255,214,0,0.25)" }}>
                          {tag}
                          <button onClick={() => removeTag(i)} className="ml-0.5 hover:text-white transition-colors" tabIndex={-1}><X size={10} /></button>
                        </span>
                      ))}
                      <input
                        type="text"
                        value={emailInput}
                        onChange={(e) => { setEmailInput(e.target.value); setTagError(""); }}
                        onKeyDown={handleInputKeyDown}
                        onBlur={handleInputBlur}
                        placeholder={emailTags.length === 0 ? "vendor@company.com, press Enter to add more" : "Add another email…"}
                        className="flex-1 min-w-[160px] bg-transparent text-sm text-white placeholder-white/30 outline-none py-0.5"
                      />
                    </div>
                    {tagError && <p className="text-xs mt-1" style={{ color: "#EF4444" }}>{tagError}</p>}
                    <p className="text-xs mt-1.5" style={{ color: "#555" }}>Press <kbd className="px-1 py-0.5 rounded text-xs" style={{ background: "#2A2A2A", color: "#888" }}>Enter</kbd> or <kbd className="px-1 py-0.5 rounded text-xs" style={{ background: "#2A2A2A", color: "#888" }}>,</kbd> after each address</p>
                  </div>

                  <button
                    onClick={handleSendAll}
                    disabled={sending || (emailTags.length === 0 && !emailInput.trim())}
                    className="w-full py-3 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2"
                    style={{ background: "#FFD600", color: "#0A0A0A", opacity: (sending || (emailTags.length === 0 && !emailInput.trim())) ? 0.5 : 1 }}
                  >
                    {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    {sending
                      ? "Sending invites…"
                      : emailTags.length > 1
                        ? `Send ${emailTags.length} Invites`
                        : "Send Invite"}
                  </button>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 rounded-xl" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 size={16} style={{ color: "#22C55E" }} />
                      <p className="text-sm font-semibold text-white">
                        {sentEmails.length === 1 ? "Invite sent!" : `${sentEmails.length} invites sent!`}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {sentEmails.map((em) => (
                        <span key={em} className="text-xs px-2 py-0.5 rounded-md" style={{ background: "rgba(34,197,94,0.12)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.25)" }}>{em}</span>
                      ))}
                    </div>
                    <p className="text-xs mt-2" style={{ color: "#666" }}>Each person will receive a verification code by email</p>
                  </div>
                  {lastShareUrl && (
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#888" }}>Shareable Link (last invite)</label>
                      <div className="flex gap-2">
                        <input
                          readOnly
                          value={lastShareUrl}
                          className="flex-1 px-3 py-2.5 rounded-lg text-xs text-white/70 outline-none"
                          style={{ background: "#1A1A1A", border: "1px solid #2A2A2A" }}
                        />
                        <button
                          onClick={handleCopy}
                          className="px-3 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5"
                          style={{ background: copied ? "rgba(34,197,94,0.15)" : "#1A1A1A", border: "1px solid #2A2A2A", color: copied ? "#22C55E" : "#FAFAFA" }}
                        >
                          <Copy size={14} />{copied ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={resetForm}
                    className="w-full py-2.5 rounded-lg text-sm font-medium transition-colors"
                    style={{ background: "#1A1A1A", border: "1px solid #2A2A2A", color: "#888" }}
                  >
                    Invite More People
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {shares.length === 0 ? (
                <div className="text-center py-8">
                  <Users size={32} className="mx-auto mb-3 opacity-20 text-white" />
                  <p className="text-sm" style={{ color: "#666" }}>No active shares yet</p>
                </div>
              ) : (
                shares.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 p-3 rounded-xl" style={{ background: "#1A1A1A", border: "1px solid #2A2A2A" }}>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{s.email}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#666" }}>Added {new Date(s.createdAt).toLocaleDateString()}</p>
                    </div>
                    <button
                      onClick={() => revokeShare.mutate({ shareId: s.id })}
                      className="shrink-0 p-2 rounded-lg transition-colors hover:bg-red-500/10"
                      style={{ color: "#666" }}
                      title="Revoke access"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────────────
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

  // Direct public S3 URL — bucket tracks/ prefix is publicly readable.
  // No auth needed, no proxy, no timing issues. Works natively in <audio>.
  const audioSrc: string = track.audioUrl;

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

  const getTrackDownloadUrl = trpc.tracks.getDownloadUrl.useMutation();
  const [trackDownloading, setTrackDownloading] = useState(false);

  const handleTrackDownload = async () => {
    setTrackDownloading(true);
    try {
      const { url, fileName } = await getTrackDownloadUrl.mutateAsync({ id: track.id });
      // Direct public S3 URL — fetch as blob so browser uses the `download` attribute filename
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
      const blob = await resp.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = fileName || track.title;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    } finally {
      setTrackDownloading(false);
    }
  };

  // Audio events are handled via JSX props directly on the <audio> element above.

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
        <audio
          ref={audioRef}
          src={audioSrc}
          preload="metadata"
          onLoadedMetadata={(e) => { setDuration((e.target as HTMLAudioElement).duration); setIsLoading(false); }}
          onTimeUpdate={(e) => setCurrentTime((e.target as HTMLAudioElement).currentTime)}
          onEnded={() => setIsPlaying(false)}
          onWaiting={() => setIsLoading(true)}
          onCanPlay={() => setIsLoading(false)}
          onError={() => { setAudioError("Failed to load audio"); setIsLoading(false); setIsPlaying(false); }}
        />

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
                onClick={(e) => {
                  // Open comment box at the clicked timestamp
                  if (!duration) return;
                  const input = e.currentTarget as HTMLInputElement;
                  const rect = input.getBoundingClientRect();
                  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  const ts = Math.floor(ratio * duration);
                  setPendingTimestamp(ts);
                  setShowCommentBox(true);
                  if (audioRef.current) { audioRef.current.currentTime = ts; setCurrentTime(ts); }
                }}
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

      {/* Pending timestamp comment box — always visible when open */}
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

      {/* Comments list — always visible */}
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

      {/* Approval buttons + Download */}
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
        <button
          onClick={handleTrackDownload}
          disabled={trackDownloading}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ml-auto"
          style={{ background: "rgba(255,214,0,0.08)", color: "#FFD600", border: "1px solid rgba(255,214,0,0.2)" }}
        >
          {trackDownloading ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
          {trackDownloading ? "Preparing…" : "Download"}
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
  // ProRes / MOV files: use proxy if ready, show transcoding badge if pending/processing, fallback download card if none
  const fileExt = (deliverable.fileKey ?? "").split(".").pop()?.toLowerCase();
  const isProRes = ['mov', 'prores', 'mxf', 'dnxhd'].includes(fileExt ?? '');

  // Poll proxyStatus every 10s while transcoding is in progress; stop once ready or failed
  const initialStatus = deliverable.proxyStatus ?? 'none';
  const isTranscodingInitially = initialStatus === 'pending' || initialStatus === 'processing';
  const pollResult = trpc.deliverables.getProxyStatus.useQuery(
    { id: deliverable.id },
    {
      enabled: isProRes && isTranscodingInitially,
      refetchInterval: (query) => {
        const status = query.state.data?.proxyStatus;
        if (status === 'ready' || status === 'failed') return false;
        return 10_000; // poll every 10 seconds
      },
      refetchIntervalInBackground: false,
    }
  );

  // Use polled status if available, otherwise fall back to prop values
  const proxyStatus = pollResult.data?.proxyStatus ?? initialStatus;
  const proxyUrl = pollResult.data?.proxyUrl ?? deliverable.proxyUrl ?? null;

  // If ProRes but proxy not ready yet, show status card
  if (isProRes && proxyStatus !== 'ready') {
    const publicUrl = deliverable.fileKey
      ? `https://faderlabs-client-uploads.s3.us-east-2.amazonaws.com/${deliverable.fileKey}`
      : null;
    const isTranscoding = proxyStatus === 'pending' || proxyStatus === 'processing';
    const isFailed = proxyStatus === 'failed';
    return (
      <div className="rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="aspect-video flex flex-col items-center justify-center gap-4" style={{ background: "#111" }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(255,214,0,0.1)", border: "2px solid #FFD60033" }}>
            <Film size={28} style={{ color: accentColor }} />
          </div>
          <div className="text-center px-6">
            {isTranscoding ? (
              <>
                <p className="text-white font-semibold text-sm mb-1 flex items-center justify-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-full animate-pulse" style={{ background: accentColor }} />
                  Generating Preview…
                </p>
                <p className="text-white/40 text-xs leading-relaxed">Your ProRes file is being transcoded for browser playback.<br />This usually takes 1–5 minutes. Download the original below.</p>
              </>
            ) : isFailed ? (
              <>
                <p className="text-white font-semibold text-sm mb-1">Preview Unavailable</p>
                <p className="text-white/40 text-xs leading-relaxed">Transcoding failed. Download the original ProRes file below.</p>
              </>
            ) : (
              <>
                <p className="text-white font-semibold text-sm mb-1">ProRes / MOV File</p>
                <p className="text-white/40 text-xs leading-relaxed">This file uses Apple ProRes codec which browsers cannot play.<br />Download it to watch in QuickTime, DaVinci Resolve, or Premiere Pro.</p>
              </>
            )}
          </div>
          {publicUrl && (
            <a
              href={publicUrl}
              download
              className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg transition-all"
              style={{ background: accentColor, color: "#0A0A0A" }}
            >
              <Download size={13} />
              Download Original ProRes
            </a>
          )}
        </div>
      </div>
    );
  }

  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inlineVideoSlotRef = useRef<HTMLDivElement>(null); // inline placeholder
  const fsVideoSlotRef = useRef<HTMLDivElement>(null); // fullscreen placeholder
  const isDraggingRef = useRef(false);
  const togglePlayRef = useRef<() => void>(() => {});
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true); // start loading while fetching stream URL
  const [videoError, setVideoError] = useState<string | null>(null);
  const [pendingTimestamp, setPendingTimestamp] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commenterName, setCommenterName] = useState("");
  const [showCommentBox, setShowCommentBox] = useState(false);
  // Use proxy URL for playback if available (ProRes transcoded to H.264), else direct S3 URL
  const streamUrl = proxyUrl
    ? proxyUrl
    : (deliverable.fileKey
      ? `https://faderlabs-client-uploads.s3.us-east-2.amazonaws.com/${deliverable.fileKey}`
      : null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<string>(deliverable.reviewStatus ?? "pending");
  // Separate ref for the fullscreen scrub bar (different DOM element)
  const fsProgressBarRef = useRef<HTMLDivElement>(null);

  const setReviewStatusMutation = trpc.deliverables.setReviewStatus.useMutation({
    onSuccess: (_data, variables) => {
      setReviewStatus(variables.status);
      toast.success(variables.status === "approved" ? "Marked as Approved" : "Marked as Needs Changes");
    },
    onError: (e) => toast.error(e.message),
  });

  // Escape key closes fullscreen overlay
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setIsFullscreen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Move the single video DOM node between inline and fullscreen slots (no re-mount, no sync loss)
  useLayoutEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const targetSlot = isFullscreen ? fsVideoSlotRef.current : inlineVideoSlotRef.current;
    if (targetSlot && !targetSlot.contains(video)) {
      targetSlot.appendChild(video);
    }
  }, [isFullscreen]);

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

  // Re-run whenever streamUrl changes so videoRef.current is populated (video is conditionally rendered)
  useEffect(() => {
    if (!streamUrl) return; // video element not yet in DOM
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
    // If metadata already loaded (e.g. browser cached), grab duration now
    if (video.readyState >= 1 && video.duration) { setDuration(video.duration); setIsLoading(false); }
    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("loadedmetadata", onMeta);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("error", onError);
    };
  }, [streamUrl]); // depend on streamUrl so effect re-runs after video element mounts

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
  // Keep ref in sync so the imperative video.onclick always calls the latest version
  togglePlayRef.current = togglePlay;

  // Scrub bar: pure click/drag without a range input so clicks always reach the handler
  // barEl: pass the specific bar element (inline or fullscreen)
  const scrubTo = useCallback((clientX: number, barEl?: HTMLDivElement | null) => {
    const bar = barEl ?? progressBarRef.current;
    if (!bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const t = ratio * duration;
    if (videoRef.current) { videoRef.current.currentTime = t; setCurrentTime(t); }
    return t;
  }, [duration]);

  // Factory: creates mousedown + touchstart handlers for any scrub bar element
  const makeProgressHandlers = useCallback((getBarEl: () => HTMLDivElement | null) => ({
    onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      isDraggingRef.current = true;
      const startX = e.clientX;
      scrubTo(e.clientX, getBarEl());
      const onMove = (ev: MouseEvent) => { if (isDraggingRef.current) scrubTo(ev.clientX, getBarEl()); };
      const onUp = (ev: MouseEvent) => {
        if (!isDraggingRef.current) return;
        isDraggingRef.current = false;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        if (Math.abs(ev.clientX - startX) < 5 && duration) {
          const bar = getBarEl();
          if (!bar) return;
          const rect = bar.getBoundingClientRect();
          const ratio = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
          setPendingTimestamp(Math.floor(ratio * duration));
          setShowCommentBox(true);
        }
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    onTouchStart: (e: React.TouchEvent<HTMLDivElement>) => {
      e.preventDefault();
      const startX = e.touches[0].clientX;
      scrubTo(startX, getBarEl());
      const onMove = (ev: TouchEvent) => scrubTo(ev.touches[0].clientX, getBarEl());
      const onEnd = (ev: TouchEvent) => {
        document.removeEventListener("touchmove", onMove);
        document.removeEventListener("touchend", onEnd);
        const endX = ev.changedTouches[0].clientX;
        if (Math.abs(endX - startX) < 10 && duration) {
          const bar = getBarEl();
          if (!bar) return;
          const rect = bar.getBoundingClientRect();
          const ratio = Math.max(0, Math.min(1, (endX - rect.left) / rect.width));
          setPendingTimestamp(Math.floor(ratio * duration));
          setShowCommentBox(true);
        }
      };
      document.addEventListener("touchmove", onMove, { passive: false });
      document.addEventListener("touchend", onEnd);
    },
  }), [duration, scrubTo]);

  const inlineHandlers = makeProgressHandlers(() => progressBarRef.current);
  const fsHandlers = makeProgressHandlers(() => fsProgressBarRef.current);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const timestampedComments = [...comments].filter(c => c.timestampSeconds != null).sort((a, b) => (a.timestampSeconds ?? 0) - (b.timestampSeconds ?? 0));
  const sortedComments = [...comments].sort((a, b) => (a.timestampSeconds ?? Infinity) - (b.timestampSeconds ?? Infinity));

  // Create the video element once imperatively so it's never re-mounted by React
  const videoCreatedRef = useRef(false);
  useLayoutEffect(() => {
    if (videoCreatedRef.current) return;
    videoCreatedRef.current = true;
    const video = document.createElement("video");
    video.className = "w-full h-full object-contain";
    video.style.cursor = "pointer";
    video.style.display = "block";
    video.preload = "metadata";
    video.onclick = () => togglePlayRef.current();
    // @ts-ignore — assign to ref
    videoRef.current = video;
    if (inlineVideoSlotRef.current) inlineVideoSlotRef.current.appendChild(video);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update src when streamUrl becomes available
  useEffect(() => {
    if (videoRef.current && streamUrl) {
      videoRef.current.src = streamUrl;
    }
  }, [streamUrl]);

  return (
    <div ref={wrapperRef} className="rounded-xl overflow-hidden" style={{ background: "#111", border: `1px solid ${accentColor}22` }}>
      {/* Video element — lives in inlineVideoSlotRef or fsVideoSlotRef, moved by useLayoutEffect */}
      <div className="relative bg-black" style={{ aspectRatio: "16/9" }}>
        {/* Slot: the actual <video> DOM node is appended here imperatively */}
        <div ref={inlineVideoSlotRef} className="w-full h-full" />
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
        {/* Fullscreen button — opens custom in-page overlay so comment UI still works */}
        <button
          onClick={() => setIsFullscreen(true)}
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

          {/* Clickable scrub bar — pure div, no range input so clicks always register */}
          <div
            ref={progressBarRef}
            className="flex-1 relative h-8 flex items-center cursor-crosshair select-none"
            {...inlineHandlers}
            title="Click to add a comment at this timestamp"
          >
            {/* Track */}
            <div className="absolute left-0 right-0 h-1.5 rounded-full" style={{ background: "#2A2A2A" }}>
              <div className="h-full rounded-full" style={{ width: `${progress}%`, background: accentColor }} />
            </div>
            {/* Scrub thumb */}
            <div
              className="absolute w-3.5 h-3.5 rounded-full -translate-x-1/2 shadow-md"
              style={{ left: `${progress}%`, background: accentColor, top: "50%", transform: `translateX(-50%) translateY(-50%)` }}
            />
            {/* Timestamp comment markers */}
            {timestampedComments.map((c) =>
              duration > 0 ? (
                <div
                  key={c.id}
                  className="absolute w-2 h-2 rounded-full border border-black pointer-events-none"
                  style={{ left: `${((c.timestampSeconds ?? 0) / duration) * 100}%`, background: "#FF6B35", top: "50%", transform: "translateX(-50%) translateY(-50%)", zIndex: 10 }}
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
      {/* ── Review buttons ─────────────────────────────────────────── */}
      <div className="px-4 pb-4 flex gap-2 flex-wrap">
        <button
          onClick={() => setReviewStatusMutation.mutate({ id: deliverable.id, status: reviewStatus === "approved" ? "pending" : "approved" })}
          disabled={setReviewStatusMutation.isPending}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
          style={reviewStatus === "approved"
            ? { background: "#64DD17", color: "#0A0A0A" }
            : { background: "rgba(100,221,23,0.08)", color: "#64DD17", border: "1px solid rgba(100,221,23,0.2)" }}
        >
          <CheckCircle2 size={11} /> {reviewStatus === "approved" ? "Approved ✓" : "Approve"}
        </button>
        <button
          onClick={() => setReviewStatusMutation.mutate({ id: deliverable.id, status: reviewStatus === "needs_changes" ? "pending" : "needs_changes" })}
          disabled={setReviewStatusMutation.isPending}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
          style={reviewStatus === "needs_changes"
            ? { background: "#FB923C", color: "#0A0A0A" }
            : { background: "rgba(251,146,60,0.08)", color: "#FB923C", border: "1px solid rgba(251,146,60,0.2)" }}
        >
          <RefreshCw size={11} /> {reviewStatus === "needs_changes" ? "Needs Changes ✓" : "Needs Changes"}
        </button>
      </div>

      {/* ── Custom fullscreen overlay ─────────────────────────────────── */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col"
          style={{ background: "#000" }}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-2 shrink-0" style={{ background: "rgba(0,0,0,0.8)", borderBottom: "1px solid #1A1A1A" }}>
            <span className="text-sm font-semibold text-white/80 truncate">{deliverable.title}</span>
            <button
              onClick={() => setIsFullscreen(false)}
              className="ml-4 shrink-0 w-8 h-8 rounded flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all"
              title="Exit fullscreen (Esc)"
            >
              <X size={16} />
            </button>
          </div>

          {/* Video area — the single <video> DOM node is moved here by useLayoutEffect */}
          <div className="flex-1 relative bg-black overflow-hidden">
            <div ref={fsVideoSlotRef} className="w-full h-full" />
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            )}
            {!isPlaying && !isLoading && !videoError && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: `${accentColor}CC` }}>
                  <Play size={26} fill="#0A0A0A" style={{ color: "#0A0A0A", marginLeft: 4 }} />
                </div>
              </div>
            )}
            {videoError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                <p className="text-red-400 text-sm">{videoError}</p>
              </div>
            )}
          </div>

          {/* Fullscreen controls */}
          <div className="shrink-0 px-5 py-3" style={{ background: "#111", borderTop: "1px solid #1A1A1A" }}>
            <div className="flex items-center gap-3 mb-1">
              <button
                onClick={togglePlay}
                disabled={!!videoError}
                className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all"
                style={{ background: videoError ? "#2A2A2A" : accentColor, color: "#0A0A0A" }}
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : isPlaying ? (
                  <Pause size={16} fill="currentColor" />
                ) : (
                  <Play size={16} fill="currentColor" style={{ marginLeft: 2 }} />
                )}
              </button>

              {/* Fullscreen scrub bar */}
              <div
                ref={fsProgressBarRef}
                className="flex-1 relative h-9 flex items-center cursor-crosshair select-none"
                {...fsHandlers}
                title="Click to add a timestamped comment"
              >
                <div className="absolute left-0 right-0 h-2 rounded-full" style={{ background: "#2A2A2A" }}>
                  <div className="h-full rounded-full" style={{ width: `${progress}%`, background: accentColor }} />
                </div>
                <div
                  className="absolute w-4 h-4 rounded-full shadow-md"
                  style={{ left: `${progress}%`, background: accentColor, top: "50%", transform: "translateX(-50%) translateY(-50%)" }}
                />
                {timestampedComments.map((c) =>
                  duration > 0 ? (
                    <div
                      key={c.id}
                      className="absolute w-2.5 h-2.5 rounded-full border border-black pointer-events-none"
                      style={{ left: `${((c.timestampSeconds ?? 0) / duration) * 100}%`, background: "#FF6B35", top: "50%", transform: "translateX(-50%) translateY(-50%)", zIndex: 10 }}
                      title={`${c.commenterName ?? "Anon"} @ ${formatTime(c.timestampSeconds ?? 0)}: ${c.content}`}
                    />
                  ) : null
                )}
              </div>

              <span className="text-sm font-mono text-white/40 shrink-0">{formatTime(currentTime)} / {formatTime(duration)}</span>
            </div>
            <p className="text-xs text-white/30">Click the timeline to leave a timestamped comment · Press Esc to exit</p>
          </div>

          {/* Fullscreen comment box */}
          {showCommentBox && (
            <div className="shrink-0 px-5 pb-3" style={{ background: "#111" }}>
              <div className="rounded-lg p-3 space-y-2" style={{ background: "#0A0A0A", border: `1px solid ${accentColor}33` }}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold" style={{ color: accentColor }}>@ {formatTime(pendingTimestamp ?? 0)}</span>
                  <span className="text-xs text-white/40">— Add a comment at this timestamp</span>
                  <button onClick={() => { setShowCommentBox(false); setPendingTimestamp(null); }} className="ml-auto text-white/30 hover:text-white/60"><X size={13} /></button>
                </div>
                <input
                  value={commenterName}
                  onChange={(e) => setCommenterName(e.target.value)}
                  placeholder="Your name (required)"
                  className="w-full text-xs px-3 py-2 rounded-lg outline-none"
                  style={{ background: "#111", border: "1px solid #2A2A2A", color: "#FAFAFA" }}
                />
                <Textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Your comment…"
                  rows={2}
                  className="text-xs resize-none"
                  style={{ background: "#111", border: "1px solid #2A2A2A", color: "#FAFAFA" }}
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

          {/* Fullscreen review buttons */}
          <div className="shrink-0 px-5 py-3 flex gap-2 flex-wrap" style={{ background: "#0A0A0A", borderTop: "1px solid #1A1A1A" }}>
            <button
              onClick={() => setReviewStatusMutation.mutate({ id: deliverable.id, status: reviewStatus === "approved" ? "pending" : "approved" })}
              disabled={setReviewStatusMutation.isPending}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
              style={reviewStatus === "approved"
                ? { background: "#64DD17", color: "#0A0A0A" }
                : { background: "rgba(100,221,23,0.08)", color: "#64DD17", border: "1px solid rgba(100,221,23,0.2)" }}
            >
              <CheckCircle2 size={11} /> {reviewStatus === "approved" ? "Approved ✓" : "Approve"}
            </button>
            <button
              onClick={() => setReviewStatusMutation.mutate({ id: deliverable.id, status: reviewStatus === "needs_changes" ? "pending" : "needs_changes" })}
              disabled={setReviewStatusMutation.isPending}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
              style={reviewStatus === "needs_changes"
                ? { background: "#FB923C", color: "#0A0A0A" }
                : { background: "rgba(251,146,60,0.08)", color: "#FB923C", border: "1px solid rgba(251,146,60,0.2)" }}
            >
              <RefreshCw size={11} /> {reviewStatus === "needs_changes" ? "Needs Changes ✓" : "Needs Changes"}
            </button>
          </div>

          {/* Fullscreen comments list */}
          {sortedComments.length > 0 && (
            <div className="shrink-0 max-h-48 overflow-y-auto px-5 pb-4 space-y-2" style={{ background: "#0A0A0A", borderTop: "1px solid #1A1A1A" }}>
              <p className="text-xs font-semibold text-white/30 uppercase tracking-widest pt-3 mb-2">
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
      )}
    </div>
  );
}

// Separate component so hooks are always called at the top level
function DeliverableAudioCard({ deliverable, downloading, handleDownload }: { deliverable: any; downloading: boolean; handleDownload: () => void }) {
  // Direct public S3 URL — bucket is fully public, no presigned URL needed
  const audioStreamUrl = deliverable.fileKey
    ? `https://faderlabs-client-uploads.s3.us-east-2.amazonaws.com/${deliverable.fileKey}`
    : null;
  const [audioError] = useState<string | null>(null);

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
      const { url, fileName } = await getDownloadUrl.mutateAsync({ id: deliverable.id });
      // Fetch as blob so the browser honours the `download` attribute filename
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
      const blob = await resp.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = fileName || deliverable.fileName || deliverable.title;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
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

const SONIC_BRANDING_PROJECT_ID = 30001;

function BackToHubButton({ isGuest }: { isGuest: boolean }) {
  const [, navigate] = useLocation();
  const handleBack = () => {
    if (isGuest) {
      // Navigate to the dedicated /guest-logout route which:
      //  1. Clears guest_session_token from localStorage
      //  2. Nullifies the auth.me React Query cache
      //  3. Renders the login screen directly — bypassing Home.tsx's
      //     isGuest redirect that would otherwise send the guest back
      //     to their project before auth.me can re-fetch.
      navigate("/guest-logout", { replace: true });
    } else {
      navigate("/");
    }
  };
  return (
    <button
      onClick={handleBack}
      className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm"
    >
      <ArrowLeft className="w-4 h-4" />
      <span>{isGuest ? "Leave Project" : "Back to Hub"}</span>
    </button>
  );
}

function SonicBrandingProjectView({ loading }: { loading: boolean }) {
  const { isAuthenticated, isGuest } = useAuth();
  const [, navigate] = useLocation();
  const [showShareModal, setShowShareModal] = useState(false);
  const { data: pillars, isLoading: pillarsLoading } = trpc.pillars.list.useQuery(undefined, { enabled: isAuthenticated });

  // Hero text settings
  const { data: heroSettings, refetch: refetchHero } = trpc.sonicBrandingSettings.get.useQuery();
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingSubtitle, setEditingSubtitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [subtitleDraft, setSubtitleDraft] = useState("");
  const updateSettings = trpc.sonicBrandingSettings.update.useMutation({
    onSuccess: () => { refetchHero(); toast.success("Updated"); },
    onError: (err) => toast.error(err.message),
  });

  const heroTitle = heroSettings?.heroTitle ?? "Sonic Branding Proposal";
  const heroSubtitle = heroSettings?.heroSubtitle ?? "Listen to each track, click the progress bar to leave timestamped feedback, and mark your decision for each track.";
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
          <BackToHubButton isGuest={isGuest} />
          <div className="flex items-center gap-3">
            {!isGuest && (
              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{ background: "rgba(255,214,0,0.1)", border: "1px solid rgba(255,214,0,0.25)", color: "#FFD600" }}
              >
                <Share2 size={13} />
                Share
              </button>
            )}
            <img src={FL_LOGO_P} alt="Faderlabs" className="h-6 object-contain" />
          </div>
        </div>
      </header>
      {showShareModal && <ShareModal project={{ id: SONIC_BRANDING_PROJECT_ID, title: "Sonic Branding" }} onClose={() => setShowShareModal(false)} />}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,214,0,0.06) 0%, transparent 60%)" }} />
        <div className="relative max-w-6xl mx-auto px-6 py-16">
          <div className="inline-flex items-center gap-2 bg-[#FFD600]/10 border border-[#FFD600]/20 rounded-full px-3 py-1 mb-4">
            <Music2 size={12} className="text-[#FFD600]" />
            <span className="text-[#FFD600] text-xs font-medium uppercase tracking-widest">Sonic Branding</span>
          </div>
          {/* Editable Hero Title */}
          {!isGuest && editingTitle ? (
            <div className="flex items-center gap-2 mb-3">
              <input
                autoFocus
                className="text-4xl md:text-5xl font-bold text-white bg-transparent border-b-2 border-[#FFD600] outline-none w-full max-w-2xl"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { updateSettings.mutate({ heroTitle: titleDraft }); setEditingTitle(false); }
                  if (e.key === "Escape") setEditingTitle(false);
                }}
              />
              <button onClick={() => { updateSettings.mutate({ heroTitle: titleDraft }); setEditingTitle(false); }}
                className="text-[#FFD600] hover:text-white transition-colors" title="Save">
                <Check size={20} />
              </button>
              <button onClick={() => setEditingTitle(false)} className="text-white/40 hover:text-white transition-colors" title="Cancel">
                <X size={20} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-3 group">
              <h1 className="text-4xl md:text-5xl font-bold text-white">{heroTitle}</h1>
              {!isGuest && (
                <button
                  onClick={() => { setTitleDraft(heroTitle); setEditingTitle(true); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-white/40 hover:text-[#FFD600] ml-1"
                  title="Edit title"
                >
                  <Pencil size={16} />
                </button>
              )}
            </div>
          )}

          {/* Editable Hero Subtitle */}
          {!isGuest && editingSubtitle ? (
            <div className="flex items-start gap-2">
              <textarea
                autoFocus
                rows={3}
                className="text-white/60 text-lg max-w-2xl leading-relaxed bg-transparent border border-[#FFD600]/40 rounded-lg p-2 outline-none resize-none w-full"
                value={subtitleDraft}
                onChange={(e) => setSubtitleDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setEditingSubtitle(false);
                }}
              />
              <div className="flex flex-col gap-1 mt-1">
                <button onClick={() => { updateSettings.mutate({ heroSubtitle: subtitleDraft }); setEditingSubtitle(false); }}
                  className="text-[#FFD600] hover:text-white transition-colors" title="Save">
                  <Check size={18} />
                </button>
                <button onClick={() => setEditingSubtitle(false)} className="text-white/40 hover:text-white transition-colors" title="Cancel">
                  <X size={18} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2 group">
              <p className="text-white/60 text-lg max-w-2xl leading-relaxed">{heroSubtitle}</p>
              {!isGuest && (
                <button
                  onClick={() => { setSubtitleDraft(heroSubtitle); setEditingSubtitle(true); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-white/40 hover:text-[#FFD600] mt-1 shrink-0"
                  title="Edit subtitle"
                >
                  <Pencil size={14} />
                </button>
              )}
            </div>
          )}
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
  const { user, loading, isAuthenticated, isGuest } = useAuth();
  const [, navigate] = useLocation();
  const [showShareModal, setShowShareModal] = useState(false);
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
          <BackToHubButton isGuest={isGuest} />
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0A0A0A]/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <BackToHubButton isGuest={isGuest} />
          <div className="flex items-center gap-3">
            {!isGuest && (
              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
                style={{ background: "rgba(255,214,0,0.12)", border: "1px solid rgba(255,214,0,0.25)", color: "#FFD600" }}
              >
                <Share2 size={14} />
                Share
              </button>
            )}
            <img src={MW_LOGO} alt="Multi-Wing" className="h-7 object-contain" />
          </div>
        </div>
      </header>
      {showShareModal && project && <ShareModal project={project} onClose={() => setShowShareModal(false)} />}
      {/* Hero */}
      <div className="relative overflow-hidden">
        {project.coverImageUrl && (
          <div className="absolute inset-0">
            <img src={project.coverImageUrl} alt={project.title} className="w-full h-full object-cover opacity-20" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A]/50 via-[#0A0A0A]/70 to-[#0A0A0A]" />
          </div>
        )}
        <div className="relative max-w-6xl mx-auto px-6 py-16">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="inline-flex items-center gap-2 bg-[#FFD600]/10 border border-[#FFD600]/20 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FFD600]" />
              <span className="text-[#FFD600] text-xs font-medium uppercase tracking-widest">
                {project.category ?? "Project"}
              </span>
            </div>
            {/* Project status badge */}
            {(() => {
              const s = project.projectStatus ?? "started";
              const cfg: Record<string, { label: string; color: string; dot: string }> = {
                started:     { label: "In Queue",    color: "rgba(136,136,136,0.12)", dot: "#888888" },
                in_progress: { label: "In Progress", color: "rgba(255,214,0,0.12)",   dot: "#FFD600" },
                completed:   { label: "Completed",   color: "rgba(34,197,94,0.12)",   dot: "#22C55E" },
              };
              const { label, color, dot } = cfg[s] ?? cfg.started;
              return (
                <div className="inline-flex items-center gap-2 rounded-full px-3 py-1" style={{ background: color, border: `1px solid ${dot}33` }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} />
                  <span className="text-xs font-medium uppercase tracking-widest" style={{ color: dot }}>{label}</span>
                </div>
              );
            })()}
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
