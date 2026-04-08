import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useParams, Link } from "wouter";
import { ArrowLeft, FolderOpen, FileText, Film, Archive, Music2, CheckCircle2, XCircle, Clock, Send, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const MW_LOGO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663488436824/MCxqt4HyvEAyGGokboGjqW/MWlogo_0d44da07.webp";

function DeliverableCard({ deliverable }: { deliverable: any }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const utils = trpc.useUtils();

  const { data: comments = [], isLoading: loadingComments } = trpc.deliverableComments.byDeliverable.useQuery(
    { deliverableId: deliverable.id },
    { enabled: showComments }
  );

  const addComment = trpc.deliverableComments.add.useMutation({
    onSuccess: () => {
      setCommentText("");
      utils.deliverableComments.byDeliverable.invalidate({ deliverableId: deliverable.id });
      toast.success("Comment submitted");
    },
    onError: (err) => toast.error(err.message),
  });

  const fileTypeIcon = deliverable.fileType === "document"
    ? <FileText className="w-4 h-4" />
    : deliverable.fileType === "archive"
    ? <Archive className="w-4 h-4" />
    : <Film className="w-4 h-4" />;

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden bg-white/3 hover:border-[#FFD600]/30 transition-all duration-300">
      {/* Thumbnail */}
      {deliverable.thumbnailUrl ? (
        <div className="relative aspect-video overflow-hidden bg-black">
          <img
            src={deliverable.thumbnailUrl}
            alt={deliverable.title}
            className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-3 left-3 flex items-center gap-2 text-white/80 text-xs">
            {fileTypeIcon}
            <span className="uppercase tracking-widest font-medium">{deliverable.fileType}</span>
          </div>
        </div>
      ) : (
        <div className="aspect-video bg-white/5 flex items-center justify-center">
          <div className="text-white/20">
            {deliverable.fileType === "document" ? (
              <FileText className="w-12 h-12" />
            ) : (
              <Film className="w-12 h-12" />
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="text-white font-semibold text-sm">{deliverable.title}</h3>
          {deliverable.description && (
            <p className="text-white/50 text-xs mt-1 leading-relaxed">{deliverable.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {deliverable.downloadUrl && (
            <a
              href={deliverable.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button
                size="sm"
                className="w-full bg-[#FFD600] hover:bg-[#FFD600]/90 text-black font-semibold text-xs gap-1.5"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                My Files
              </Button>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

const PILLAR_ACCENT_COLORS = ["#FFD600", "#64DD17", "#EF4444", "#A78BFA", "#38BDF8"];
const FL_LOGO_P = "https://d2xsxph8kpxj0f.cloudfront.net/310519663488436824/iLXUQ5XAKoVQ9DttVq4BTX/faderlabs-logo-white_d7a18ec8.png";

function ApprovalBadgeP({ status }: { status?: string }) {
  if (!status || status === "pending") return <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full" style={{ background: "rgba(255,214,0,0.1)", color: "#FFD600", border: "1px solid rgba(255,214,0,0.2)" }}><Clock size={12} /> Awaiting Decision</span>;
  if (status === "approved") return <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full" style={{ background: "rgba(100,221,23,0.1)", color: "#64DD17", border: "1px solid rgba(100,221,23,0.2)" }}><CheckCircle2 size={12} /> Approved</span>;
  return <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full" style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" }}><XCircle size={12} /> Needs Changes</span>;
}

function SonicBrandingProjectView({ loading }: { loading: boolean }) {
  const { isAuthenticated } = useAuth();
  const { data: pillars, isLoading: pillarsLoading } = trpc.pillars.list.useQuery(undefined, { enabled: isAuthenticated });

  if (loading || pillarsLoading) {
    return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#FFD600] border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <header className="border-b border-white/10 bg-[#0A0A0A]/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm">
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Hub</span>
              </button>
            </Link>
          </div>
          <img src={FL_LOGO_P} alt="Faderlabs" className="h-6 object-contain" />
        </div>
      </header>

      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,214,0,0.06) 0%, transparent 60%)" }} />
        <div className="relative max-w-6xl mx-auto px-6 py-16">
          <div className="inline-flex items-center gap-2 bg-[#FFD600]/10 border border-[#FFD600]/20 rounded-full px-3 py-1 mb-4">
            <Music2 size={12} className="text-[#FFD600]" />
            <span className="text-[#FFD600] text-xs font-medium uppercase tracking-widest">Sonic Branding</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">Sonic Branding Proposal</h1>
          <p className="text-white/60 text-lg max-w-2xl leading-relaxed">Listen to each track, leave feedback, and approve your preferred direction for each pillar.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pb-16 space-y-10">
        {!pillars || pillars.length === 0 ? (
          <div className="text-center py-20"><p className="text-white/40">No pillars available yet. Check back soon.</p></div>
        ) : (
          pillars.map((pillar: any, i: number) => (
            <SonicPillarCard key={pillar.id} pillar={pillar} accentColor={PILLAR_ACCENT_COLORS[i % PILLAR_ACCENT_COLORS.length]} index={i} />
          ))
        )}
      </div>
    </div>
  );
}

function SonicPillarCard({ pillar, accentColor, index }: { pillar: any; accentColor: string; index: number }) {
  const { data: tracks = [], isLoading } = trpc.tracks.byPillar.useQuery({ pillarId: pillar.id });
  const { data: approvalData } = trpc.approvals.myApproval.useQuery({ pillarId: pillar.id });
  const utils = trpc.useUtils();
  const [approvalNote, setApprovalNote] = useState("");
  const setApproval = trpc.approvals.set.useMutation({
    onSuccess: () => { utils.approvals.myApproval.invalidate({ pillarId: pillar.id }); toast.success("Decision saved"); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${accentColor}22`, background: "#111111" }}>
      <div className="p-6 border-b" style={{ borderColor: `${accentColor}22` }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-2" style={{ color: accentColor }}>Pillar {index + 1}</div>
            <h3 className="text-xl font-bold text-white mb-1">{pillar.title}</h3>
            {pillar.description && <p className="text-white/50 text-sm leading-relaxed">{pillar.description}</p>}
          </div>
          <ApprovalBadgeP status={approvalData?.status} />
        </div>
      </div>
      <div className="p-6">
        {isLoading ? <div className="text-white/40 text-sm">Loading tracks…</div> : tracks.length === 0 ? (
          <div className="text-white/30 text-sm italic">No tracks uploaded yet.</div>
        ) : (
          <div className="space-y-6">
            {tracks.map((track: any, ti: number) => (
              <SonicTrackRow key={track.id} track={track} trackIndex={ti} accentColor={accentColor} />
            ))}
          </div>
        )}
        <div className="mt-6 pt-6 border-t" style={{ borderColor: `${accentColor}22` }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: accentColor }}>Your Decision</p>
          <Textarea value={approvalNote} onChange={(e) => setApprovalNote(e.target.value)} placeholder="Optional note..." className="mb-3 bg-white/5 border-white/20 text-white placeholder:text-white/30 text-xs resize-none min-h-[60px]" />
          <div className="flex gap-3">
            <Button size="sm" onClick={() => setApproval.mutate({ pillarId: pillar.id, status: "approved", note: approvalNote })} disabled={setApproval.isPending} className="bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 gap-1.5"><CheckCircle2 size={14} /> Approve</Button>
            <Button size="sm" onClick={() => setApproval.mutate({ pillarId: pillar.id, status: "rejected", note: approvalNote })} disabled={setApproval.isPending} className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 gap-1.5"><XCircle size={14} /> Needs Changes</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SonicTrackRow({ track, trackIndex, accentColor }: { track: any; trackIndex: number; accentColor: string }) {
  const [comment, setComment] = useState("");
  const [showComments, setShowComments] = useState(false);
  const { data: comments = [], refetch } = trpc.comments.byTrack.useQuery({ trackId: track.id });
  const addComment = trpc.comments.add.useMutation({
    onSuccess: () => { setComment(""); refetch(); toast.success("Comment submitted"); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: accentColor }}>Track {trackIndex + 1}</span>
        <span className="text-white font-semibold text-sm">{track.title}</span>
      </div>
      {track.description && <p className="text-white/40 text-xs mb-3">{track.description}</p>}
      {track.audioUrl && <audio controls src={track.audioUrl} className="w-full mb-3" style={{ filter: "invert(1) hue-rotate(180deg)" }} />}
      <button onClick={() => setShowComments(!showComments)} className="text-xs text-white/40 hover:text-white/70 flex items-center gap-1 mb-2"><MessageSquare size={12} /> {comments.length > 0 ? `${comments.length} comment${comments.length !== 1 ? "s" : ""}` : "Add comment"}</button>
      {showComments && (
        <div className="space-y-2">
          {comments.map((c: any) => <div key={c.id} className="bg-white/5 rounded p-2 text-xs text-white/60">{c.content}</div>)}
          <div className="flex gap-2">
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Leave feedback..." className="flex-1 bg-white/5 border-white/20 text-white placeholder:text-white/30 text-xs resize-none min-h-[50px]" />
            <Button size="sm" onClick={() => { if (comment.trim()) addComment.mutate({ trackId: track.id, content: comment.trim() }); }} disabled={!comment.trim() || addComment.isPending} className="bg-[#FFD600] hover:bg-[#FFD600]/90 text-black self-end"><Send size={12} /></Button>
          </div>
        </div>
      )}
    </div>
  );
}

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
            <Button className="bg-[#FFD600] text-black font-semibold hover:bg-[#FFD600]/90">
              Sign In
            </Button>
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
            <Button variant="outline" className="border-white/20 text-white bg-transparent">
              Back to Hub
            </Button>
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
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm">
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Hub</span>
              </button>
            </Link>
          </div>
          <img src={MW_LOGO} alt="Multi-Wing" className="h-7 object-contain" />
        </div>
      </header>

      {/* Hero */}
      <div className="relative overflow-hidden">
        {project.coverImageUrl && (
          <div className="absolute inset-0">
            <img
              src={project.coverImageUrl}
              alt={project.title}
              className="w-full h-full object-cover opacity-20"
            />
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
            {slug === "archive-footage" && (
              <div className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1">
                <Archive className="w-3.5 h-3.5 text-white/50" />
                <span className="text-white/50 text-xs font-medium uppercase tracking-widest">Archive</span>
              </div>
            )}
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
