import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useParams, Link } from "wouter";
import { ArrowLeft, Download, FileText, MessageSquare, Send, Film, Archive } from "lucide-react";
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
                <Download className="w-3.5 h-3.5" />
                Download
              </Button>
            </a>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowComments(!showComments)}
            className="border-white/20 text-white/70 hover:text-white hover:border-white/40 text-xs gap-1.5 bg-transparent"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            {comments.length > 0 ? `${comments.length}` : "Comment"}
          </Button>
        </div>

        {/* Comments section */}
        {showComments && (
          <div className="space-y-3 pt-2 border-t border-white/10">
            {loadingComments ? (
              <p className="text-white/40 text-xs">Loading comments...</p>
            ) : comments.length === 0 ? (
              <p className="text-white/40 text-xs italic">No comments yet. Be the first to leave feedback.</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {comments.map((c: any) => (
                  <div key={c.id} className="bg-white/5 rounded-lg p-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[#FFD600] text-xs font-medium">{c.userName ?? "Client"}</span>
                      <span className="text-white/30 text-xs">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-white/70 text-xs leading-relaxed">{c.content}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Add comment */}
            <div className="flex gap-2">
              <Textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Leave your feedback..."
                className="flex-1 bg-white/5 border-white/20 text-white placeholder:text-white/30 text-xs resize-none min-h-[60px]"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    if (commentText.trim()) {
                      addComment.mutate({ deliverableId: deliverable.id, content: commentText.trim() });
                    }
                  }
                }}
              />
              <Button
                size="sm"
                onClick={() => {
                  if (commentText.trim()) {
                    addComment.mutate({ deliverableId: deliverable.id, content: commentText.trim() });
                  }
                }}
                disabled={!commentText.trim() || addComment.isPending}
                className="bg-[#FFD600] hover:bg-[#FFD600]/90 text-black self-end"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProjectPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user, loading, isAuthenticated } = useAuth();

  const { data: project, isLoading: loadingProject } = trpc.projects.bySlug.useQuery(
    { slug: slug ?? "" },
    { enabled: !!slug && isAuthenticated }
  );

  const { data: deliverables = [], isLoading: loadingDeliverables } = trpc.deliverables.byProject.useQuery(
    { projectId: project?.id ?? 0 },
    { enabled: !!project?.id }
  );

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
          <div className="inline-flex items-center gap-2 bg-[#FFD600]/10 border border-[#FFD600]/20 rounded-full px-3 py-1 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFD600]" />
            <span className="text-[#FFD600] text-xs font-medium uppercase tracking-widest">
              {project.category ?? "Project"}
            </span>
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
