/**
 * GuestLogout — a dedicated route (/guest-logout) that:
 *  1. Immediately removes the guest_session_token from localStorage
 *  2. Renders the login screen directly without going through Home.tsx
 *
 * This avoids the race condition where the SPA's cached isGuest=true state
 * causes Home.tsx to redirect the guest back to their project before auth.me
 * can re-fetch and return null.
 */
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ShieldCheck } from "lucide-react";

const FL_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663488436824/iLXUQ5XAKoVQ9DttVq4BTX/faderlabs-logo-white_d7a18ec8.png";

export default function GuestLogout() {
  const [, navigate] = useLocation();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const utils = trpc.useUtils();

  // Clear guest token immediately on mount
  useEffect(() => {
    localStorage.removeItem("guest_session_token");
    // Also invalidate the auth.me cache so any re-use of the SPA sees null
    utils.auth.me.setData(undefined, null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const clientLogin = trpc.auth.clientLogin.useMutation({
    onSuccess: (data) => {
      if (data.token) {
        localStorage.setItem("portal_session_token", data.token);
      }
      utils.auth.me.invalidate().then(() => {
        navigate("/", { replace: true });
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
