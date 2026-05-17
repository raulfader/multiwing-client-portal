import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { toast } from "sonner";
import {
  Film, Music2, FileText, Archive, FolderOpen,
  Download, Loader2, Mail, ShieldCheck, RefreshCw, Eye
} from "lucide-react";

const MW_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663488436824/MCxqt4HyvEAyGGokboGjqW/MWlogo_0d44da07.webp";
const FL_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663488436824/iLXUQ5XAKoVQ9DttVq4BTX/faderlabs-logo-white_d7a18ec8.png";

const SESSION_KEY = (token: string) => `share_session_${token}`;

// ── Category icon ─────────────────────────────────────────────────────────────
function CategoryIcon({ category, size = 16 }: { category: string; size?: number }) {
  const c = category?.toLowerCase() ?? "";
  if (c === "video") return <Film size={size} />;
  if (c === "audio") return <Music2 size={size} />;
  if (c === "document") return <FileText size={size} />;
  if (c === "archive") return <Archive size={size} />;
  return <FolderOpen size={size} />;
}

// ── Email Gate ────────────────────────────────────────────────────────────────
function EmailGate({
  shareToken,
  guestEmail,
  projectTitle,
  onVerified,
}: {
  shareToken: string;
  guestEmail: string;
  projectTitle: string;
  onVerified: (sessionToken: string) => void;
}) {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState(guestEmail);
  const [code, setCode] = useState("");

  const requestOtp = trpc.shares.requestOtp.useMutation({
    onSuccess: () => {
      setStep("otp");
      toast.success("Verification code sent — check your inbox");
    },
    onError: (err) => toast.error(err.message),
  });

  const verifyOtp = trpc.shares.verifyOtp.useMutation({
    onSuccess: (data) => {
      sessionStorage.setItem(SESSION_KEY(shareToken), data.sessionToken);
      onVerified(data.sessionToken);
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-10 flex flex-col items-center gap-4">
        <img src={MW_LOGO} alt="Multi-Wing" className="h-8 object-contain" />
        <div className="w-px h-6 bg-white/10" />
        <img src={FL_LOGO} alt="Faderlabs" className="h-5 object-contain opacity-60" />
      </div>

      <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: "#111", border: "1px solid #2A2A2A" }}>
        {/* Header */}
        <div className="px-6 py-5" style={{ borderBottom: "1px solid #1A1A1A" }}>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={16} style={{ color: "#FFD600" }} />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#FFD600" }}>Secure Access</span>
          </div>
          <h1 className="text-xl font-bold text-white">{projectTitle}</h1>
          <p className="text-sm mt-1" style={{ color: "#666" }}>You've been invited to view this project</p>
        </div>

        <div className="p-6">
          {step === "email" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#888" }}>
                  Your Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && requestOtp.mutate({ token: shareToken, email: email.trim(), origin: window.location.origin })}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 rounded-lg text-sm text-white placeholder-white/30 outline-none focus:ring-1 focus:ring-yellow-400/50"
                  style={{ background: "#1A1A1A", border: "1px solid #2A2A2A" }}
                />
                <p className="text-xs mt-2" style={{ color: "#555" }}>Enter the email address where the invite was sent</p>
              </div>
              <button
                onClick={() => requestOtp.mutate({ token: shareToken, email: email.trim(), origin: window.location.origin })}
                disabled={requestOtp.isPending || !email.trim()}
                className="w-full py-3 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: "#FFD600", color: "#0A0A0A" }}
              >
                {requestOtp.isPending ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                {requestOtp.isPending ? "Sending code…" : "Send Verification Code"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "rgba(255,214,0,0.06)", border: "1px solid rgba(255,214,0,0.15)" }}>
                <Mail size={14} style={{ color: "#FFD600" }} />
                <p className="text-sm" style={{ color: "#ccc" }}>Code sent to <strong className="text-white">{email}</strong></p>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#888" }}>
                  Verification Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onKeyDown={(e) => e.key === "Enter" && code.length === 6 && verifyOtp.mutate({ token: shareToken, email: email.trim(), code })}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-4 py-3 rounded-lg text-2xl font-mono text-center text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-yellow-400/50 tracking-[0.3em]"
                  style={{ background: "#1A1A1A", border: "1px solid #2A2A2A" }}
                />
                <p className="text-xs mt-2" style={{ color: "#555" }}>Enter the 6-digit code from your email. It expires in 15 minutes.</p>
              </div>
              <button
                onClick={() => verifyOtp.mutate({ token: shareToken, email: email.trim(), code })}
                disabled={verifyOtp.isPending || code.length < 6}
                className="w-full py-3 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: "#FFD600", color: "#0A0A0A" }}
              >
                {verifyOtp.isPending ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                {verifyOtp.isPending ? "Verifying…" : "Verify & Access Project"}
              </button>
              <button
                onClick={() => requestOtp.mutate({ token: shareToken, email: email.trim(), origin: window.location.origin })}
                disabled={requestOtp.isPending}
                className="w-full py-2 text-sm transition-colors flex items-center justify-center gap-1.5"
                style={{ color: "#666" }}
              >
                <RefreshCw size={13} />
                Resend code
              </button>
              <button onClick={() => setStep("email")} className="w-full text-xs text-center" style={{ color: "#444" }}>
                Use a different email
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Deliverable Card (read-only guest view) ───────────────────────────────────
function GuestDeliverableCard({
  deliverable,
  accessLevel,
  shareToken,
  sessionToken,
}: {
  deliverable: any;
  accessLevel: "read" | "download";
  shareToken: string;
  sessionToken: string;
}) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!deliverable.fileUrl) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/tracks/download-share/${shareToken}/${deliverable.id}`, {
        headers: { "x-share-session": sessionToken },
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const ct = res.headers.get("content-type") ?? "";
      const ext = ct.includes("wav") ? "wav" : ct.includes("mp4") ? "mp4" : ct.includes("audio") ? "mp3" : "bin";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${deliverable.title ?? "file"}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err.message ?? "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  const cat = deliverable.type ?? deliverable.category ?? "video";

  return (
    <div className="rounded-2xl overflow-hidden transition-all hover:scale-[1.01]" style={{ background: "#111", border: "1px solid #1A1A1A" }}>
      {/* Thumbnail */}
      <div className="relative aspect-video bg-[#0A0A0A] flex items-center justify-center overflow-hidden">
        {deliverable.thumbnailUrl ? (
          <img src={deliverable.thumbnailUrl} alt={deliverable.title} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-white/20">
            <CategoryIcon category={cat} size={32} />
          </div>
        )}
        <div className="absolute top-3 left-3">
          <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-widest"
            style={{ background: "rgba(255,214,0,0.15)", color: "#FFD600", border: "1px solid rgba(255,214,0,0.2)" }}>
            <CategoryIcon category={cat} size={10} />
            {cat}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-white text-sm mb-1 truncate">{deliverable.title}</h3>
        {deliverable.description && (
          <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "#666" }}>{deliverable.description}</p>
        )}
        <div className="mt-3 flex items-center gap-2">
          {accessLevel === "download" && deliverable.fileUrl ? (
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{ background: "rgba(255,214,0,0.12)", border: "1px solid rgba(255,214,0,0.25)", color: "#FFD600" }}
            >
              {downloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
              Download
            </button>
          ) : (
            <span className="flex items-center gap-1.5 text-xs" style={{ color: "#555" }}>
              <Eye size={12} />
              View only
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Shared Project Page ──────────────────────────────────────────────────
export default function SharedProjectPage() {
  const { token } = useParams<{ token: string }>();
  const [sessionToken, setSessionToken] = useState<string | null>(() =>
    token ? sessionStorage.getItem(SESSION_KEY(token)) : null
  );

  // Check if the share token is valid
  const { data: tokenCheck, isLoading: checkingToken } = trpc.shares.checkToken.useQuery(
    { token: token ?? "" },
    { enabled: !!token }
  );

  // Fetch project data once session is established
  const { data: projectData, isLoading: loadingProject } = trpc.shares.getProject.useQuery(
    { shareToken: token ?? "", sessionToken: sessionToken ?? "" },
    { enabled: !!token && !!sessionToken }
  );

  // If session token is invalid/expired, clear it so user re-verifies
  useEffect(() => {
    if (sessionToken && projectData === undefined && !loadingProject) {
      // query errored — clear session
    }
  }, [sessionToken, projectData, loadingProject]);

  if (!token || checkingToken) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#FFD600] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!tokenCheck?.valid) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-4 text-center">
        <img src={MW_LOGO} alt="Multi-Wing" className="h-8 mb-8 object-contain" />
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <ShieldCheck size={28} style={{ color: "#EF4444" }} />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Link Expired or Invalid</h1>
        <p className="text-sm max-w-sm" style={{ color: "#666" }}>
          This share link is no longer valid. Please ask the project owner to send you a new invite.
        </p>
      </div>
    );
  }

  if (!sessionToken) {
    return (
      <EmailGate
        shareToken={token}
        guestEmail={tokenCheck.guestEmail ?? ""}
        projectTitle={tokenCheck.projectTitle ?? "Project"}
        onVerified={setSessionToken}
      />
    );
  }

  if (loadingProject || !projectData) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#FFD600] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { project, deliverables, accessLevel, guestEmail } = projectData;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50" style={{ background: "rgba(10,10,10,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid #1A1A1A" }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <img src={MW_LOGO} alt="Multi-Wing" className="h-7 object-contain" />
          <div className="flex items-center gap-2 text-xs" style={{ color: "#666" }}>
            <ShieldCheck size={13} style={{ color: "#22C55E" }} />
            <span>Viewing as <strong className="text-white">{guestEmail}</strong></span>
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-widest"
              style={{ background: accessLevel === "download" ? "rgba(255,214,0,0.1)" : "rgba(136,136,136,0.1)", color: accessLevel === "download" ? "#FFD600" : "#888", border: `1px solid ${accessLevel === "download" ? "rgba(255,214,0,0.2)" : "rgba(136,136,136,0.2)"}` }}>
              {accessLevel === "download" ? "View + Download" : "View Only"}
            </span>
          </div>
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
        <div className="relative max-w-6xl mx-auto px-6 py-14">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-4"
            style={{ background: "rgba(255,214,0,0.1)", border: "1px solid rgba(255,214,0,0.2)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFD600]" />
            <span className="text-[#FFD600] text-xs font-medium uppercase tracking-widest">{project.category ?? "Project"}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">{project.title}</h1>
          {project.description && (
            <p className="text-white/60 text-lg max-w-2xl leading-relaxed">{project.description}</p>
          )}
          <p className="mt-3 text-white/30 text-sm">{deliverables.length} deliverable{deliverables.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Deliverables */}
      <div className="max-w-6xl mx-auto px-6 pb-16">
        {deliverables.length === 0 ? (
          <div className="text-center py-20">
            <p style={{ color: "#555" }}>No deliverables available yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {deliverables.map((d: any) => (
              <GuestDeliverableCard
                key={d.id}
                deliverable={d}
                accessLevel={accessLevel}
                shareToken={token}
                sessionToken={sessionToken}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="py-8 text-center" style={{ borderTop: "1px solid #1A1A1A" }}>
        <img src={FL_LOGO} alt="Faderlabs" className="h-5 object-contain mx-auto opacity-40" />
        <p className="text-xs mt-2" style={{ color: "#444" }}>Powered by Faderlabs</p>
      </div>
    </div>
  );
}
