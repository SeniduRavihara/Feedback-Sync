'use client';

import { AudioRecorder } from '@/components/audio-recorder';
import { useAuth } from '@/hooks/use-auth';
import { auth, db } from '@/lib/firebase';
import { addDoc, collection, onSnapshot, query, where } from 'firebase/firestore';
import {
    AlertCircle,
    BrainCircuit, Check,
    CheckCircle2, Clock,
    Code2,
    Loader2,
    LogOut,
    MessageSquare,
    Mic,
    Send,
    X
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

function SuccessBanner({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="flex items-center gap-3 px-5 py-3.5 bg-[#00A388]/10 border border-[#00A388]/30 text-[#00A388] rounded-2xl text-sm font-bold mb-6"
    >
      <Check className="w-4 h-4 shrink-0" />
      {message}
      <button onClick={onClose} className="ml-auto opacity-50 hover:opacity-100"><X className="w-4 h-4" /></button>
    </motion.div>
  );
}

export default function ClientPortal() {
  const { user, role, loading: authLoading, fetchRole } = useAuth();
  const [activeTab, setActiveTab] = useState<'submit' | 'history'>('submit');
  const [projects, setProjects] = useState<any[]>([]);
  const [myFeedbacks, setMyFeedbacks] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [feedback, setFeedback] = useState('');
  const [type, setType] = useState<'bug' | 'improvement'>('improvement');
  const [submitting, setSubmitting] = useState(false);
  const [showAudio, setShowAudio] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push('/auth');
      return;
    }

    // Role might be loaded async. If it's not present yet, try fetching.
    const verifyRole = async () => {
      let currentRole = role;
      if (!currentRole && user) {
        currentRole = await fetchRole(user.uid);
      }
      if (currentRole && currentRole !== 'client') {
        router.push('/dashboard');
      }
    };
    
    verifyRole();
  }, [user, role, authLoading, router, fetchRole]);

  useEffect(() => {
    if (!user) return;

    const projectsQ = query(
      collection(db, 'projects'),
      where('assignedClients', 'array-contains', user.uid)
    );
    const unsubscribeProjects = onSnapshot(projectsQ, (snapshot) => {
      setProjects(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const feedbacksQ = query(collection(db, 'feedback'), where('clientId', '==', user.uid));
    const unsubscribeFeedbacks = onSnapshot(feedbacksQ, (snapshot) => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      items.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setMyFeedbacks(items);
    });

    return () => { unsubscribeProjects(); unsubscribeFeedbacks(); };
  }, [user]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!user || !selectedProject || !feedback.trim()) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'feedback'), {
        projectId: selectedProject.id,
        clientId: user.uid,
        clientName: user.displayName || user.email?.split('@')[0],
        content: feedback,
        type,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      setFeedback('');
      setShowAudio(false);
      setSuccessMessage('Your feedback has been sent! The engineer will review it soon.');
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || (user && !role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <Loader2 className="w-8 h-8 animate-spin text-[#00A388]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Nav */}
      <nav className="bg-[#0D0D0D] border-b border-[#1A1A1A] px-6 py-4 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#00A388] rounded-xl flex items-center justify-center shadow-lg shadow-[#00A388]/20">
                <Code2 className="w-5 h-5 text-white" />
              </div>
              <span className="font-display font-bold text-xl tracking-tight">DevSync</span>
            </div>
            {/* Tab Toggle */}
            <div className="flex items-center gap-1 bg-[#1A1A1A] p-1 rounded-xl border border-[#242424]">
              <button
                onClick={() => setActiveTab('submit')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeTab === 'submit' ? 'bg-[#00A388] text-white shadow-lg' : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                Submit
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeTab === 'history' ? 'bg-[#00A388] text-white shadow-lg' : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                History
                {myFeedbacks.length > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-[#00A388]/20 text-[#00A388] rounded-full font-bold">
                    {myFeedbacks.length}
                  </span>
                )}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-[#1A1A1A] rounded-xl border border-[#242424]">
              <div className="w-7 h-7 bg-[#00A388] rounded-full flex items-center justify-center text-xs font-bold">
                {user?.email?.[0].toUpperCase()}
              </div>
              <span className="text-sm font-bold text-neutral-300 hidden sm:block">{user?.email?.split('@')[0]}</span>
            </div>
            <button
              onClick={() => auth.signOut().then(() => router.push('/auth'))}
              className="flex items-center gap-2 text-neutral-600 hover:text-red-500 font-bold transition-colors text-sm"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:block">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-6 md:p-10">
        <AnimatePresence>
          {successMessage && (
            <SuccessBanner message={successMessage} onClose={() => setSuccessMessage('')} />
          )}
        </AnimatePresence>

        {activeTab === 'submit' ? (
          <>
            <header className="mb-10 text-center">
              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl md:text-5xl font-display font-bold text-white mb-3"
              >
                Share Your Feedback
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-neutral-500 text-lg"
              >
                Your thoughts help us build better software.
              </motion.p>
            </header>

            <div className="space-y-8">
              {/* Project Selection */}
              <section>
                <h2 className="text-xs font-bold text-neutral-600 uppercase tracking-[0.3em] mb-4">Select Project</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => setSelectedProject(project)}
                      className={`p-6 bg-[#0D0D0D] border rounded-2xl text-left transition-all ${
                        selectedProject?.id === project.id
                          ? 'border-[#00A388] ring-2 ring-[#00A388]/10'
                          : 'border-[#1A1A1A] hover:border-[#00A388]/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-white">{project.name}</h3>
                        {selectedProject?.id === project.id && <CheckCircle2 className="w-5 h-5 text-[#00A388]" />}
                      </div>
                      <p className="text-sm text-neutral-600 line-clamp-2">{project.description}</p>
                    </button>
                  ))}
                  {projects.length === 0 && (
                    <div className="col-span-full py-16 text-center bg-[#0D0D0D] border border-dashed border-[#1A1A1A] rounded-2xl">
                      <AlertCircle className="w-10 h-10 text-neutral-800 mx-auto mb-3" />
                      <p className="text-neutral-500 font-bold">No projects assigned to you yet</p>
                      <p className="text-neutral-700 text-sm mt-1">Contact your engineer to get access</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Feedback Form */}
              <AnimatePresence>
                {selectedProject && (
                  <motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-[2rem] overflow-hidden"
                  >
                    <div className="p-8">
                      <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl font-display font-bold text-white">Your Feedback</h2>
                        <div className="flex bg-[#1A1A1A] p-1 rounded-xl border border-[#242424]">
                          <button
                            onClick={() => setType('improvement')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                              type === 'improvement' ? 'bg-[#00A388] text-white' : 'text-neutral-500 hover:text-neutral-300'
                            }`}
                          >
                            Improvement
                          </button>
                          <button
                            onClick={() => setType('bug')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                              type === 'bug' ? 'bg-red-500 text-white' : 'text-neutral-500 hover:text-neutral-300'
                            }`}
                          >
                            Bug Report
                          </button>
                        </div>
                      </div>

                      <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="relative">
                          <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Describe the issue or improvement you'd like to see..."
                            className="w-full h-48 p-6 bg-[#1A1A1A] border border-[#242424] text-white rounded-2xl focus:ring-2 focus:ring-[#00A388] focus:border-transparent outline-none transition-all resize-none text-base placeholder:text-neutral-700"
                          />
                          <button
                            type="button"
                            onClick={() => setShowAudio(!showAudio)}
                            title="Record audio feedback"
                            className={`absolute bottom-4 right-4 p-3 rounded-full transition-all ${
                              showAudio
                                ? 'bg-[#00A388] text-white ring-4 ring-[#00A388]/20'
                                : 'bg-[#121212] text-neutral-500 border border-[#2A2A2A] hover:text-[#00A388] hover:border-[#00A388]'
                            }`}
                          >
                            <Mic className="w-5 h-5" />
                          </button>
                        </div>

                        <AnimatePresence>
                          {showAudio && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <AudioRecorder
                                onTranscription={(text) => setFeedback(prev => prev + (prev ? '\n' : '') + text)}
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <button
                          type="submit"
                          disabled={submitting || !feedback.trim()}
                          className="w-full py-4 bg-[#00A388] text-white rounded-2xl font-bold text-base hover:bg-[#008F76] transition-all shadow-xl shadow-[#00A388]/20 flex items-center justify-center gap-3 group disabled:opacity-50"
                        >
                          {submitting ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <>
                              Send Feedback
                              <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                            </>
                          )}
                        </button>
                      </form>
                    </div>
                  </motion.section>
                )}
              </AnimatePresence>
            </div>
          </>
        ) : (
          <>
            <header className="mb-8">
              <h1 className="text-4xl font-display font-bold text-white mb-1">My Feedback History</h1>
              <p className="text-neutral-500">Track the status of everything you've submitted</p>
            </header>

            <div className="space-y-5">
              {myFeedbacks.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-7 bg-[#0D0D0D] border border-[#1A1A1A] rounded-[2rem] hover:border-[#00A388]/20 transition-all"
                >
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#1A1A1A] rounded-2xl flex items-center justify-center border border-[#242424]">
                        <MessageSquare className="w-5 h-5 text-[#00A388]" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white">
                          {projects.find(p => p.id === item.projectId)?.name || 'Project'}
                        </h3>
                        <p className="text-xs text-neutral-600">{new Date(item.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                        item.type === 'bug' ? 'bg-red-500/10 text-red-500' : 'bg-[#00A388]/10 text-[#00A388]'
                      }`}>
                        {item.type}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                        item.status === 'resolved'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : item.status === 'in-progress'
                          ? 'bg-amber-500/10 text-amber-500'
                          : 'bg-neutral-800 text-neutral-400'
                      }`}>
                        {item.status || 'pending'}
                      </span>
                    </div>
                  </div>

                  <p className="text-neutral-300 leading-relaxed mb-4">{item.content}</p>

                  {item.status === 'resolved' && (
                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-500 text-sm font-bold">
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                      This issue has been resolved by the engineering team.
                    </div>
                  )}

                  {item.aiSuggestion && item.status !== 'resolved' && (
                    <div className="mt-4 p-4 bg-[#00A388]/5 border border-[#00A388]/20 rounded-xl">
                      <div className="flex items-center gap-2 text-[#00A388] mb-2">
                        <BrainCircuit className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-widest">Update from Engineering</span>
                      </div>
                      <p className="text-sm text-neutral-400 italic">
                        {item.aiSuggestion.split('---').pop()?.trim()}
                      </p>
                    </div>
                  )}
                </motion.div>
              ))}
              {myFeedbacks.length === 0 && (
                <div className="py-24 text-center bg-[#0D0D0D] border border-dashed border-[#1A1A1A] rounded-[2rem]">
                  <Clock className="w-14 h-14 text-neutral-800 mx-auto mb-4" />
                  <p className="text-neutral-500 font-bold text-lg">No feedback yet</p>
                  <p className="text-neutral-700 text-sm mt-1">Submit your first feedback above</p>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
