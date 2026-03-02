"use client";

import { PreviewAnnotator } from "@/components/preview-annotator";
import { RepoSelector } from "@/components/repo-selector";
import { useAuth } from "@/hooks/use-auth";
import { auth, db } from "@/lib/firebase";
import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    query,
    updateDoc,
    where,
} from "firebase/firestore";
import {
    AlertCircle,
    BrainCircuit,
    Check,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Code2,
    Eye,
    Github,
    LayoutDashboard,
    Loader2,
    LogOut,
    MessageSquare,
    Plus,
    Settings,
    Users,
    X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 40, scale: 0.95 }}
      className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-bold ${
        type === "success"
          ? "bg-[#121212] border-[#00A388]/30 text-[#00A388]"
          : "bg-[#121212] border-red-500/30 text-red-400"
      }`}
    >
      {type === "success" ? (
        <Check className="w-4 h-4" />
      ) : (
        <X className="w-4 h-4" />
      )}
      {message}
      <button onClick={onClose} className="ml-2 opacity-50 hover:opacity-100">
        <X className="w-3 h-3" />
      </button>
    </motion.div>
  );
}

export default function Dashboard() {
  const { user, role, loading: authLoading, fetchRole } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "projects" | "clients" | "insights" | "settings"
  >("projects");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebarCollapsed");
      return saved === "true";
    }
    return false;
  });
  const [projects, setProjects] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [allClients, setAllClients] = useState<any[]>([]);
  const [showRepoSelector, setShowRepoSelector] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [showClientAssign, setShowClientAssign] = useState<string | null>(null);
  const [clientEmail, setClientEmail] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [showProjectSettings, setShowProjectSettings] = useState<string | null>(
    null
  );
  const [projectContext, setProjectContext] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [showPreview, setShowPreview] = useState<any | null>(null);
  const [toasts, setToasts] = useState<
    { id: string; message: string; type: "success" | "error" }[]
  >([]);
  const router = useRouter();

  const addToast = useCallback(
    (message: string, type: "success" | "error" = "success") => {
      const id = Date.now().toString();
      setToasts((prev) => [...prev, { id, message, type }]);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push("/auth");
      return;
    }

    // Role might be loaded async. If it's not present yet, try fetching.
    const verifyRole = async () => {
      let currentRole = role;
      if (!currentRole && user) {
        currentRole = await fetchRole(user.uid);
      }
      if (
        currentRole &&
        currentRole !== "engineer" &&
        currentRole !== "admin"
      ) {
        router.push("/client");
      }
    };

    verifyRole();
  }, [user, role, authLoading, router, fetchRole]);

  useEffect(() => {
    if (!user) return;

    const projectsQ = query(
      collection(db, "projects"),
      where("ownerId", "==", user.uid)
    );
    const unsubscribeProjects = onSnapshot(projectsQ, (snapshot) => {
      setProjects(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const clientsQ = query(
      collection(db, "users"),
      where("role", "==", "client")
    );
    const unsubscribeClients = onSnapshot(clientsQ, (snapshot) => {
      setAllClients(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubscribeProjects();
      unsubscribeClients();
    };
  }, [user]);

  useEffect(() => {
    if (!selectedProject) return;

    const q = query(
      collection(db, "feedback"),
      where("projectId", "==", selectedProject.id)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      // Sort newest first
      items.sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setFeedbacks(items);
    });

    return () => unsubscribe();
  }, [selectedProject]);

  const handleAddProject = async (repo: any) => {
    if (!user) return;
    // Check if project already added
    const existing = projects.find((p) => p.fullName === repo.full_name);
    if (existing) {
      addToast("This repository is already in your projects.", "error");
      setShowRepoSelector(false);
      return;
    }
    try {
      await addDoc(collection(db, "projects"), {
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description || "No description.",
        githubUrl: repo.html_url,
        ownerId: user.uid,
        language: repo.language || "",
        stars: repo.stargazers_count || 0,
        createdAt: new Date().toISOString(),
      });
      addToast(`"${repo.name}" added to your projects!`);
      setShowRepoSelector(false);
    } catch (error) {
      addToast("Failed to add project.", "error");
    }
  };

  const analyzeFeedback = async (feedback: any) => {
    setAnalyzing(feedback.id);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: JSON.stringify({
          feedback: feedback.content,
          project: selectedProject.fullName,
          technicalContext: selectedProject.technicalContext || "",
        }),
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      // Persist to Firestore so it survives refresh
      await updateDoc(doc(db, "feedback", feedback.id), {
        aiSuggestion: data.suggestion,
        analyzedAt: new Date().toISOString(),
      });
      addToast("AI analysis complete!");
    } catch (error: any) {
      addToast("Analysis failed: " + error.message, "error");
    } finally {
      setAnalyzing(null);
    }
  };

  const updateFeedbackStatus = async (
    feedbackId: string,
    newStatus: string
  ) => {
    setUpdatingStatus(feedbackId);
    try {
      await updateDoc(doc(db, "feedback", feedbackId), { status: newStatus });
      addToast(`Status updated to "${newStatus}"`);
    } catch {
      addToast("Failed to update status.", "error");
    } finally {
      setUpdatingStatus(null);
    }
  };

  const saveProjectContext = async (projectId: string) => {
    try {
      await updateDoc(doc(db, "projects", projectId), {
        technicalContext: projectContext,
        previewUrl: previewUrl,
      });
      addToast("Project settings saved!");
      setShowProjectSettings(null);
    } catch {
      addToast("Failed to save settings.", "error");
    }
  };

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem("sidebarCollapsed", newState.toString());
  };

  const handlePreviewFeedback = async (
    comment: string,
    position: { x: number; y: number },
    metadata?: {
      screenshot: string;
      pageUrl: string;
      annotationNumber: number;
    }
  ) => {
    if (!showPreview || !user) return;

    const feedbackData: any = {
      projectId: showPreview.id,
      projectName: showPreview.name,
      clientId: user.uid,
      clientName: user.email?.split("@")[0] || "Engineer",
      content: comment,
      type: "improvement",
      status: "pending",
      createdAt: new Date().toISOString(),
      position: position,
    };

    // Add screenshot and metadata if available
    if (metadata) {
      feedbackData.screenshot = metadata.screenshot;
      feedbackData.pageUrl = metadata.pageUrl;
      feedbackData.annotationNumber = metadata.annotationNumber;
    }

    await addDoc(collection(db, "feedback"), feedbackData);

    addToast(`Feedback #${metadata?.annotationNumber || ""} submitted!`);
  };

  const assignClient = async (projectId: string) => {
    setAssigning(true);
    try {
      const q = query(
        collection(db, "users"),
        where("email", "==", clientEmail.trim()),
        where("role", "==", "client")
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        addToast(
          "No client found with that email. Ensure they registered as a client.",
          "error"
        );
        return;
      }

      const clientId = querySnapshot.docs[0].id;
      const projectRef = doc(db, "projects", projectId);
      const projectDoc = await getDoc(projectRef);
      const currentClients = projectDoc.data()?.assignedClients || [];

      if (currentClients.includes(clientId)) {
        addToast("Client is already assigned to this project.", "error");
        return;
      }

      await updateDoc(projectRef, {
        assignedClients: [...currentClients, clientId],
      });
      addToast("Client assigned successfully!");
      setClientEmail("");
      setShowClientAssign(null);
    } catch {
      addToast("Assignment failed.", "error");
    } finally {
      setAssigning(false);
    }
  };

  const resolvedCount = feedbacks.filter((f) => f.status === "resolved").length;
  const pendingCount = feedbacks.filter((f) => f.status !== "resolved").length;

  if (authLoading || (user && !role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#00A388]" />
          <p className="text-neutral-600 text-sm font-medium">
            Loading your dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex text-white">
      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
        <AnimatePresence>
          {toasts.map((t) => (
            <Toast
              key={t.id}
              message={t.message}
              type={t.type}
              onClose={() => removeToast(t.id)}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Sidebar */}
      <aside
        className={`bg-[#0D0D0D] border-r border-[#1A1A1A] flex flex-col fixed left-0 top-0 h-screen z-40 transition-all duration-300 ${
          sidebarCollapsed ? "w-20" : "w-72"
        }`}
      >
        <div className="p-8 border-b border-[#1A1A1A] shrink-0 relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00A388] rounded-xl flex items-center justify-center shadow-lg shadow-[#00A388]/20">
              <Code2 className="w-6 h-6 text-white" />
            </div>
            {!sidebarCollapsed && (
              <span className="font-display font-bold text-2xl tracking-tight">
                DevSync
              </span>
            )}
          </div>

          {/* Toggle Button */}
          <button
            onClick={toggleSidebar}
            className="absolute -right-3 top-1/2 -translate-y-1/2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-full p-1.5 shadow-lg text-neutral-400 hover:text-white hover:border-[#00A388] z-50 transition-all hover:scale-110"
            title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <nav className="space-y-1.5">
            <NavItem
              icon={<LayoutDashboard className="w-5 h-5" />}
              label="Projects"
              active={activeTab === "projects"}
              onClick={() => setActiveTab("projects")}
              collapsed={sidebarCollapsed}
            />
            <NavItem
              icon={<Users className="w-5 h-5" />}
              label="Clients"
              active={activeTab === "clients"}
              onClick={() => setActiveTab("clients")}
              collapsed={sidebarCollapsed}
            />
            <NavItem
              icon={<BrainCircuit className="w-5 h-5" />}
              label="AI Insights"
              active={activeTab === "insights"}
              onClick={() => setActiveTab("insights")}
              collapsed={sidebarCollapsed}
            />
            <NavItem
              icon={<Settings className="w-5 h-5" />}
              label="Settings"
              active={activeTab === "settings"}
              onClick={() => setActiveTab("settings")}
              collapsed={sidebarCollapsed}
            />
          </nav>
        </div>

        <div className="p-4 border-t border-[#1A1A1A] shrink-0 bg-[#0A0A0A]">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-3 mb-4 p-3 bg-[#1A1A1A] rounded-2xl border border-[#242424]">
              <div className="w-10 h-10 bg-[#00A388] rounded-full flex items-center justify-center font-bold text-white shrink-0">
                {user?.email?.[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">
                  {user?.email?.split("@")[0]}
                </p>
                <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest">
                  Engineer · Admin
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center mb-4">
              <div className="w-10 h-10 bg-[#00A388] rounded-full flex items-center justify-center font-bold text-white">
                {user?.email?.[0].toUpperCase()}
              </div>
            </div>
          )}
          <button
            onClick={() => auth.signOut().then(() => router.push("/auth"))}
            className={`w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-500/10 rounded-xl font-bold transition-all ${
              sidebarCollapsed ? "justify-center" : ""
            }`}
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
            {!sidebarCollapsed && "Logout"}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`flex-1 overflow-y-auto p-10 transition-all duration-300 ${
          sidebarCollapsed ? "ml-20" : "ml-72"
        }`}
      >
        <div className="max-w-6xl mx-auto">
          {activeTab === "projects" && (
            <>
              <header className="flex items-center justify-between mb-10">
                <div>
                  <h1 className="text-4xl font-display font-bold text-white mb-1">
                    Projects
                  </h1>
                  <p className="text-neutral-500">
                    Manage repositories and process client feedback
                  </p>
                </div>
                <button
                  onClick={() => setShowRepoSelector(true)}
                  className="flex items-center gap-2 px-6 py-3.5 bg-[#00A388] text-white rounded-2xl font-bold hover:bg-[#008F76] transition-all shadow-xl shadow-[#00A388]/20"
                >
                  <Plus className="w-5 h-5" />
                  Add Project
                </button>
              </header>

              {/* Projects Grid */}
              {projects.length === 0 ? (
                <div className="py-24 text-center bg-[#0D0D0D] border border-dashed border-[#1F1F1F] rounded-[2rem] mb-10">
                  <Github className="w-16 h-16 text-neutral-800 mx-auto mb-4" />
                  <p className="text-neutral-500 font-bold text-xl mb-2">
                    No projects yet
                  </p>
                  <p className="text-neutral-600">
                    Click "Add Project" to connect a GitHub repository
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-10">
                  {projects.map((project) => (
                    <motion.div
                      key={project.id}
                      whileHover={{ y: -3 }}
                      onClick={() => setSelectedProject(project)}
                      className={`p-7 bg-[#0D0D0D] border rounded-[2rem] cursor-pointer transition-all ${
                        selectedProject?.id === project.id
                          ? "border-[#00A388] ring-2 ring-[#00A388]/10 shadow-xl shadow-[#00A388]/5"
                          : "border-[#1A1A1A] hover:border-[#00A388]/40"
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-[#1A1A1A] rounded-xl flex items-center justify-center border border-[#242424]">
                          <Code2 className="w-5 h-5 text-[#00A388]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-white truncate">
                            {project.name}
                          </h3>
                          {project.language && (
                            <span className="text-[10px] text-neutral-600 font-bold uppercase tracking-widest">
                              {project.language}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-neutral-500 mb-5 line-clamp-2 leading-relaxed">
                        {project.description}
                      </p>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[#00A388] bg-[#00A388]/10 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                            Active
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {project.previewUrl && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowPreview(project);
                              }}
                              className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#00A388] hover:text-white transition-colors whitespace-nowrap"
                            >
                              <Eye className="w-3 h-3" /> Preview
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setProjectContext(project.technicalContext || "");
                              setPreviewUrl(project.previewUrl || "");
                              setShowProjectSettings(project.id);
                            }}
                            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-neutral-600 hover:text-white transition-colors whitespace-nowrap"
                          >
                            <Settings className="w-3 h-3" /> Settings
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowClientAssign(project.id);
                            }}
                            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors whitespace-nowrap"
                          >
                            <Users className="w-3 h-3" /> Assign
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Feedback Section */}
              <AnimatePresence>
                {selectedProject && (
                  <motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between border-b border-[#1A1A1A] pb-6">
                      <h2 className="text-2xl font-display font-bold text-white">
                        Feedback ·{" "}
                        <span className="text-[#00A388]">
                          {selectedProject.name}
                        </span>
                      </h2>
                      <div className="flex items-center gap-3">
                        <StatusBadge
                          icon={<CheckCircle2 className="w-4 h-4" />}
                          label={`${resolvedCount} Resolved`}
                          color="emerald"
                        />
                        <StatusBadge
                          icon={<AlertCircle className="w-4 h-4" />}
                          label={`${pendingCount} Open`}
                          color="amber"
                        />
                      </div>
                    </div>

                    <div className="space-y-5">
                      {feedbacks.map((feedback) => (
                        <div
                          key={feedback.id}
                          className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-[2rem] overflow-hidden hover:border-[#00A388]/20 transition-all"
                        >
                          <div className="p-8">
                            <div className="flex items-start justify-between mb-5">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-[#1A1A1A] rounded-full flex items-center justify-center border border-[#242424] text-sm font-bold text-[#00A388]">
                                  {(feedback.clientName ||
                                    "C")[0].toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-bold text-white">
                                    {feedback.clientName || "Client"}
                                  </p>
                                  <p className="text-xs text-neutral-600">
                                    {new Date(
                                      feedback.createdAt
                                    ).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span
                                  className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                                    feedback.type === "bug"
                                      ? "bg-red-500/10 text-red-500"
                                      : "bg-[#00A388]/10 text-[#00A388]"
                                  }`}
                                >
                                  {feedback.type}
                                </span>
                                <select
                                  value={feedback.status || "pending"}
                                  onChange={(e) =>
                                    updateFeedbackStatus(
                                      feedback.id,
                                      e.target.value
                                    )
                                  }
                                  disabled={updatingStatus === feedback.id}
                                  className="bg-[#1A1A1A] border border-[#2A2A2A] text-[10px] font-bold uppercase tracking-widest text-neutral-400 px-3 py-1.5 rounded-full outline-none focus:border-[#00A388] transition-all cursor-pointer"
                                >
                                  <option value="pending">Pending</option>
                                  <option value="in-progress">
                                    In Progress
                                  </option>
                                  <option value="resolved">Resolved</option>
                                </select>
                              </div>
                            </div>
                            {/* Primary Feedback Content */}
                            {feedback.content && (
                              <p className="text-neutral-300 leading-relaxed mb-6 whitespace-pre-wrap">
                                {feedback.content}
                              </p>
                            )}
                            
                            {/* Standalone Widget Annotations List */}
                            {feedback.annotations && feedback.annotations.length > 0 && (
                              <div className="mb-6 space-y-3">
                                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2 border-b border-[#1A1A1A] pb-2">
                                  User Comments ({feedback.annotations.length})
                               </h3>
                                {feedback.annotations.map((ann: any, idx: number) => (
                                  <div key={idx} className="flex gap-3 bg-[#121212] p-4 rounded-xl border border-[#242424]">
                                    <div className="w-6 h-6 shrink-0 bg-[#00A388] rounded-full text-white font-bold text-xs flex items-center justify-center mt-0.5">
                                      {ann.number || idx + 1}
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-sm text-neutral-300 whitespace-pre-wrap">{ann.comment || <span className="italic text-neutral-600">No comment provided</span>}</p>
                                      <p className="text-[10px] text-neutral-600 mt-2 font-mono">Location: X: {ann.x?.toFixed(1) || '?'}%, Y: {ann.y?.toFixed(1) || '?'}%</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Screenshot with Annotation */}
                            {(feedback.screenshot ||
                              (feedback.pageUrl && feedback.position)) && (
                              <div className="mb-6 p-4 bg-[#080808] rounded-2xl border border-[#1A1A1A]">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-[#00A388] rounded-full flex items-center justify-center text-white font-bold text-sm">
                                      #{feedback.annotationNumber || "?"}
                                    </div>
                                    <span className="text-sm font-bold text-neutral-400">
                                      Visual Annotation
                                    </span>
                                  </div>
                                  {feedback.pageUrl && (
                                    <a
                                      href={feedback.pageUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-[#00A388] hover:text-white transition-colors truncate max-w-xs flex items-center gap-1"
                                      title={feedback.pageUrl}
                                    >
                                      <Eye className="w-3 h-3" />
                                      Open Page
                                    </a>
                                  )}
                                </div>
                                {feedback.screenshot ? (
                                  <img
                                    src={feedback.screenshot}
                                    alt={`Annotation #${feedback.annotationNumber}`}
                                    className="w-full h-auto rounded-xl border border-[#1A1A1A]"
                                  />
                                ) : (
                                  <div className="w-full h-[300px] bg-[#0D0D0D] rounded-xl border border-[#1A1A1A] flex items-center justify-center text-neutral-500">
                                    <div className="text-center">
                                      <Eye className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                      <p className="text-sm">
                                        Screenshot not available
                                      </p>
                                      <p className="text-xs mt-1">
                                        Position:{" "}
                                        {feedback.position?.x.toFixed(1)}% X,{" "}
                                        {feedback.position?.y.toFixed(1)}% Y
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="flex items-center gap-3 mb-6">
                              {!feedback.aiSuggestion ? (
                                <button
                                  onClick={() => analyzeFeedback(feedback)}
                                  disabled={analyzing === feedback.id}
                                  className="flex items-center gap-2 px-5 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] text-sm font-bold text-[#00A388] hover:bg-[#00A388] hover:text-white hover:border-[#00A388] rounded-xl transition-all disabled:opacity-50"
                                >
                                  {analyzing === feedback.id ? (
                                    <>
                                      <Loader2 className="w-4 h-4 animate-spin" />{" "}
                                      Analyzing...
                                    </>
                                  ) : (
                                    <>
                                      <BrainCircuit className="w-4 h-4" />{" "}
                                      Analyze with AI
                                    </>
                                  )}
                                </button>
                              ) : null}

                              {feedback.position &&
                                selectedProject.previewUrl && (
                                  <button
                                    onClick={() =>
                                      setShowPreview(selectedProject)
                                    }
                                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500/10 border border-indigo-500/30 text-sm font-bold text-indigo-400 hover:bg-indigo-500 hover:text-white hover:border-indigo-500 rounded-xl transition-all"
                                  >
                                    <Eye className="w-4 h-4" /> View Location in
                                    Preview
                                  </button>
                                )}
                            </div>

                            {feedback.aiSuggestion && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                className="p-6 bg-[#080808] rounded-2xl border border-[#1A1A1A]"
                              >
                                <div className="flex items-center gap-2 mb-4 text-[#00A388]">
                                  <BrainCircuit className="w-5 h-5" />
                                  <span className="font-bold text-xs uppercase tracking-[0.15em]">
                                    AI Suggestion & Fix
                                  </span>
                                  {feedback.analyzedAt && (
                                    <span className="ml-auto text-[10px] text-neutral-700 font-medium">
                                      {new Date(
                                        feedback.analyzedAt
                                      ).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                                <div className="prose prose-invert prose-sm max-w-none prose-pre:bg-[#0D0D0D] prose-pre:border prose-pre:border-[#1A1A1A] prose-headings:text-[#00A388] prose-code:text-[#00A388]">
                                  <ReactMarkdown>
                                    {feedback.aiSuggestion}
                                  </ReactMarkdown>
                                </div>
                              </motion.div>
                            )}
                          </div>
                        </div>
                      ))}

                      {feedbacks.length === 0 && (
                        <div className="py-24 text-center bg-[#0D0D0D] border border-dashed border-[#1A1A1A] rounded-[2rem]">
                          <MessageSquare className="w-14 h-14 text-neutral-800 mx-auto mb-4" />
                          <p className="text-neutral-500 font-bold text-lg">
                            No feedback yet
                          </p>
                          <p className="text-neutral-700 mt-1 text-sm">
                            Assign this project to a client to start receiving
                            feedback
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.section>
                )}
              </AnimatePresence>
            </>
          )}

          {activeTab === "clients" && (
            <>
              <header className="mb-10">
                <h1 className="text-4xl font-display font-bold text-white mb-1">
                  Clients
                </h1>
                <p className="text-neutral-500">
                  All registered clients on the platform
                </p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {allClients.map((client) => (
                  <motion.div
                    key={client.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-7 bg-[#0D0D0D] border border-[#1A1A1A] rounded-[2rem] hover:border-[#00A388]/30 transition-all"
                  >
                    <div className="flex items-center gap-4 mb-5">
                      <div className="w-12 h-12 bg-[#1A1A1A] rounded-full flex items-center justify-center border border-[#242424] text-lg font-bold text-[#00A388]">
                        {client.email?.[0].toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-white">
                          {client.email?.split("@")[0]}
                        </h3>
                        <p className="text-sm text-neutral-600">
                          {client.email}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2.5 text-xs font-bold uppercase tracking-widest">
                      <div className="flex justify-between text-neutral-600">
                        <span>Role</span>
                        <span className="text-[#00A388]">Client</span>
                      </div>
                      <div className="flex justify-between text-neutral-600">
                        <span>Joined</span>
                        <span>
                          {new Date(client.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {allClients.length === 0 && (
                  <div className="col-span-full py-24 text-center bg-[#0D0D0D] border border-dashed border-[#1A1A1A] rounded-[2rem]">
                    <Users className="w-14 h-14 text-neutral-800 mx-auto mb-4" />
                    <p className="text-neutral-500 font-bold text-lg">
                      No clients yet
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === "insights" && (
            <>
              <header className="mb-10">
                <h1 className="text-4xl font-display font-bold text-white mb-1">
                  AI Insights
                </h1>
                <p className="text-neutral-500">
                  Analytics and AI processing history
                </p>
              </header>
              <div className="py-24 text-center bg-[#0D0D0D] border border-dashed border-[#1A1A1A] rounded-[2rem]">
                <BrainCircuit className="w-14 h-14 text-neutral-800 mx-auto mb-4" />
                <p className="text-neutral-500 font-bold text-lg">
                  AI Insights Coming Soon
                </p>
                <p className="text-neutral-700 mt-1 text-sm">
                  Detailed AI analytics will be available here.
                </p>
              </div>
            </>
          )}

          {activeTab === "settings" && (
            <>
              <header className="mb-10">
                <h1 className="text-4xl font-display font-bold text-white mb-1">
                  Settings
                </h1>
                <p className="text-neutral-500">
                  Manage your profile and preferences
                </p>
              </header>
              <div className="py-24 text-center bg-[#0D0D0D] border border-dashed border-[#1A1A1A] rounded-[2rem]">
                <Settings className="w-14 h-14 text-neutral-800 mx-auto mb-4" />
                <p className="text-neutral-500 font-bold text-lg">
                  Settings Coming Soon
                </p>
                <p className="text-neutral-700 mt-1 text-sm">
                  Account configuration will be available here.
                </p>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Project Settings Modal */}
      <AnimatePresence>
        {showProjectSettings && (
          <Modal onClose={() => setShowProjectSettings(null)}>
            <h3 className="text-2xl font-display font-bold mb-2">
              Project Settings
            </h3>
            <p className="text-neutral-500 text-sm mb-6">
              Configure technical context and preview URL for this project.
            </p>

            <label className="block text-sm font-bold text-neutral-400 mb-2">
              Preview URL
            </label>
            <input
              type="url"
              value={previewUrl}
              onChange={(e) => setPreviewUrl(e.target.value)}
              placeholder="https://your-app-demo.vercel.app"
              className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl outline-none focus:ring-2 focus:ring-[#00A388] mb-4 text-sm"
            />

            <label className="block text-sm font-bold text-neutral-400 mb-2">
              Technical Context
            </label>
            <textarea
              value={projectContext}
              onChange={(e) => setProjectContext(e.target.value)}
              placeholder="e.g. Next.js 15 app using Firebase + Tailwind. Main logic in /lib/api.ts..."
              className="w-full h-32 p-4 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-2xl outline-none focus:ring-2 focus:ring-[#00A388] mb-6 resize-none text-sm"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowProjectSettings(null)}
                className="flex-1 py-3 bg-[#1A1A1A] text-neutral-400 rounded-xl font-bold hover:bg-[#242424] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => saveProjectContext(showProjectSettings)}
                className="flex-1 py-3 bg-[#00A388] text-white rounded-xl font-bold hover:bg-[#008F76] transition-all"
              >
                Save
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Assign Client Modal */}
      <AnimatePresence>
        {showClientAssign && (
          <Modal onClose={() => setShowClientAssign(null)}>
            <h3 className="text-2xl font-display font-bold mb-2">
              Assign Client
            </h3>
            <p className="text-neutral-500 text-sm mb-6">
              Enter the client's registered email to grant access to this
              project.
            </p>
            <input
              type="email"
              placeholder="client@example.com"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && assignClient(showClientAssign)
              }
              className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white outline-none focus:ring-2 focus:ring-[#00A388] mb-4 text-sm"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowClientAssign(null)}
                className="flex-1 py-3 bg-[#1A1A1A] text-neutral-400 rounded-xl font-bold hover:bg-[#242424] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => assignClient(showClientAssign)}
                disabled={assigning || !clientEmail.trim()}
                className="flex-1 py-3 bg-[#00A388] text-white rounded-xl font-bold hover:bg-[#008F76] disabled:opacity-50 transition-all flex items-center justify-center"
              >
                {assigning ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Assign"
                )}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Repo Selector Modal */}
      <AnimatePresence>
        {showRepoSelector && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRepoSelector(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl bg-[#0D0D0D] rounded-[2.5rem] shadow-2xl border border-[#1A1A1A] overflow-hidden"
            >
              <div className="p-10">
                <RepoSelector onSelect={handleAddProject} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Preview Annotator */}
      <AnimatePresence>
        {showPreview && showPreview.previewUrl && (
          <PreviewAnnotator
            previewUrl={showPreview.previewUrl}
            projectId={showPreview.id}
            projectName={showPreview.name}
            userName={user?.email?.split("@")[0] || "Engineer"}
            onClose={() => setShowPreview(null)}
            onSubmitFeedback={handlePreviewFeedback}
            existingAnnotations={feedbacks
              .filter((f) => f.projectId === showPreview.id && f.position)
              .map((f) => ({
                id: f.id,
                x: f.position.x,
                y: f.position.y,
                comment: f.content.replace(
                  /\[Visual Feedback at position.*?\]\n\n/,
                  ""
                ),
                createdAt: f.createdAt,
                userName: f.clientName || "Client",
              }))}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-lg bg-[#0D0D0D] rounded-[2rem] p-8 border border-[#1A1A1A] shadow-2xl"
      >
        {children}
      </motion.div>
    </div>
  );
}

function NavItem({
  icon,
  label,
  active = false,
  onClick,
  collapsed = false,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  collapsed?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center ${
        collapsed ? "justify-center" : "gap-4"
      } px-4 py-3 rounded-xl font-bold transition-all text-sm ${
        active
          ? "bg-[#00A388] text-white shadow-lg shadow-[#00A388]/20"
          : "text-neutral-600 hover:bg-[#1A1A1A] hover:text-neutral-300"
      }`}
    >
      {icon}
      {!collapsed && label}
    </button>
  );
}

function StatusBadge({
  icon,
  label,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  color: "emerald" | "amber";
}) {
  const styles = {
    emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    amber: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  };
  return (
    <span
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest ${styles[color]}`}
    >
      {icon} {label}
    </span>
  );
}
