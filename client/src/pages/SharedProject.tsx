import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import {
  Loader2, Mail, ShieldCheck, RefreshCw, KeyRound, CheckCircle2, Shield
} from "lucide-react";

const MW_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663488436824/MCxqt4HyvEAyGGokboGjqW/MWlogo_0d44da07.webp";
const FL_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663488436824/iLXUQ5XAKoVQ9DttVq4BTX/faderlabs-logo-white_d7a18ec8.png";

// Guest sessions are stored under a SEPARATE key so they never interfere
// with the regular client login (portal_session_token).
const GUEST_TOKEN_KEY = "guest_session_token";

/**
 * SharedProject — landing page for share links.
 *
 * Flow:
 *  1. Validate the share token (checkToken)
 *  2. Auto-send OTP to the guest's email (requestOtp)
 *  3. Guest enters 6-digit code (verifyOtp)
 *  4. Store sessionToken as "guest_session_token" in localStorage
 *  5. Redirect to /projects/:slug — guest now has full authenticated access
 *     and sees the exact same view as the client (no restrictions)
 *
 * Isolation guarantee: visiting the root URL (/) never auto-logs in a guest
 * because the tRPC client only sends guest_session_token when
 * portal_session_token is absent AND the current path is a /projects/ page.
 */
export default function SharedProjectPage() {
  const { token } = useParams<{ token: string }>();
  const [, navigate] = useLocation();

  type Step = "loading" | "otp" | "redirecting" | "invalid";
  const [step, setStep] = useState<Step>("loading");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [projectInfo, setProjectInfo] = useState<{
    title: string;
    slug: string;
  } | null>(null);

  const checkToken = trpc.shares.checkToken.useQuery(
    { token: token ?? "" },
    { enabled: !!token, retry: false }
  );

  const requestOtp = trpc.shares.requestOtp.useMutation();
  const verifyOtp = trpc.shares.verifyOtp.useMutation();

  // ── On load: validate token, then auto-send OTP
  useEffect(() => {
    if (checkToken.isLoading) return;
    if (!checkToken.data?.valid) {
      setStep("invalid");
      return;
    }

    const info = {
      title: checkToken.data.projectTitle ?? "Project",
      slug: checkToken.data.projectSlug ?? "",
    };
    setProjectInfo(info);
    const guestEmail = checkToken.data.guestEmail ?? "";
    setEmail(guestEmail);

    // Auto-send OTP and show code entry
    setStep("otp");
    if (!otpSent) {
      setOtpSent(true);
      requestOtp.mutate(
        { token: token ?? "", email: guestEmail, origin: window.location.origin },
        { onError: (err) => setError(err.message || "Failed to send verification code.") }
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkToken.isLoading, checkToken.data]);

  const handleVerify = async () => {
    if (code.trim().length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }
    setError("");
    try {
      const result = await verifyOtp.mutateAsync({
        token: token ?? "",
        email,
        code: code.trim(),
      });
      // Store as guest_session_token — the tRPC client falls back to this key
      // when portal_session_token is absent, so API calls work for guests.
      localStorage.setItem(GUEST_TOKEN_KEY, result.sessionToken);
      setStep("redirecting");
      setTimeout(() => {
        navigate(`/projects/${projectInfo?.slug}`, { replace: true });
      }, 300);
    } catch (err: any) {
      setError(err.message || "Invalid or expired code. Please try again.");
    }
  };

  const handleResend = () => {
    setCode("");
    setError("");
    requestOtp.mutate(
      { token: token ?? "", email, origin: window.location.origin },
      {
        onSuccess: () => setError(""),
        onError: (err) => setError(err.message || "Failed to resend code."),
      }
    );
  };

  // ── Loading
  if (step === "loading" || checkToken.isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#FFD600] animate-spin" />
      </div>
    );
  }

  // ── Invalid / expired
  if (step === "invalid") {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
            <Shield className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-white text-xl font-bold">Link Expired or Invalid</h2>
          <p className="text-white/50 text-sm">
            This share link is no longer valid. Please ask the project owner to send a new invitation.
          </p>
        </div>
      </div>
    );
  }

  // ── Redirecting
  if (step === "redirecting") {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-[#FFD600] mx-auto" />
          <p className="text-white/70 text-sm">Verified! Opening project…</p>
        </div>
      </div>
    );
  }

  // ── OTP entry
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-4">
      {/* Logos */}
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
          <h1 className="text-xl font-bold text-white">{projectInfo?.title ?? "Project"}</h1>
          <p className="text-sm mt-1" style={{ color: "#666" }}>You've been invited to view this project</p>
        </div>

        <div className="p-6 space-y-4">
          {/* Status: sending OTP */}
          {requestOtp.isPending ? (
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 size={16} className="animate-spin" style={{ color: "#FFD600" }} />
              <span className="text-sm" style={{ color: "#888" }}>
                Sending verification code to <strong className="text-white">{email}</strong>…
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "rgba(255,214,0,0.06)", border: "1px solid rgba(255,214,0,0.15)" }}>
              <Mail size={14} style={{ color: "#FFD600" }} />
              <p className="text-sm" style={{ color: "#ccc" }}>
                Code sent to <strong className="text-white">{email}</strong>
              </p>
            </div>
          )}

          {/* Code input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#888" }}>
              Verification Code
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && code.length === 6 && handleVerify()}
              placeholder="000000"
              maxLength={6}
              autoFocus
              className="w-full px-4 py-3 rounded-lg text-2xl font-mono text-center text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-yellow-400/50 tracking-[0.3em]"
              style={{ background: "#1A1A1A", border: "1px solid #2A2A2A" }}
            />
            <p className="text-xs mt-2" style={{ color: "#555" }}>
              Enter the 6-digit code from your email. It expires in 15 minutes.
            </p>
          </div>

          {error && (
            <p className="text-red-400 text-xs text-center">{error}</p>
          )}

          {/* Verify button */}
          <button
            onClick={handleVerify}
            disabled={verifyOtp.isPending || code.length < 6}
            className="w-full py-3 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: "#FFD600", color: "#0A0A0A" }}
          >
            {verifyOtp.isPending
              ? <><Loader2 size={16} className="animate-spin" /> Verifying…</>
              : <><KeyRound size={16} /> Verify &amp; Access Project</>
            }
          </button>

          {/* Resend */}
          <button
            onClick={handleResend}
            disabled={requestOtp.isPending}
            className="w-full py-2 text-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            style={{ color: "#666" }}
          >
            <RefreshCw size={13} />
            Resend code
          </button>
        </div>
      </div>
    </div>
  );
}
