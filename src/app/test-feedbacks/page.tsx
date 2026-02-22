"use client";

import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { AlignLeft, Image as ImageIcon, MessageSquare, MonitorOff, User } from "lucide-react";
import { useEffect, useState } from "react";

export default function TestFeedbacksPage() {
  const { user, loading } = useAuth();
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    // We only enforce auth check, no specific role since this is a test page
    if (!user && !loading) return;

    setFetching(true);
    const q = query(collection(db, "feedback"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        // Convert timestamp to date safely
        createdAt: doc.data().createdAt?.toDate
          ? doc.data().createdAt.toDate()
          : new Date(doc.data().createdAt),
      }));
      setFeedbacks(items);
      setFetching(false);
    }, (error) => {
      console.error("Error fetching feedbacks:", error);
      setFetching(false);
    });

    return () => unsubscribe();
  }, [user, loading]);

  if (loading || fetching) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-[#00A388] border-t-transparent rounded-full animate-spin" />
          <p className="text-neutral-500 font-medium">Loading Database Records...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white p-8">
        <div className="bg-[#121212] p-8 rounded-2xl border border-red-500/20 max-w-md text-center">
          <h2 className="text-xl font-bold text-red-500 mb-2">Authentication Required</h2>
          <p className="text-neutral-400">Please log in to view the database dump.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 flex items-center justify-between border-b border-[#1A1A1A] pb-6">
          <div>
            <h1 className="text-4xl font-display font-bold text-white mb-2">Firestore Dump · Feedback</h1>
            <p className="text-neutral-500">Live view of the `feedback` collection for testing and verification.</p>
          </div>
          <div className="bg-[#1A1A1A] px-4 py-2 border border-[#242424] rounded-lg">
            <span className="text-[#00A388] font-bold">{feedbacks.length}</span> Records Found
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {feedbacks.map((item) => (
            <div key={item.id} className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-2xl overflow-hidden shadow-2xl flex flex-col">
              
              {/* Header Info */}
              <div className="p-6 border-b border-[#1A1A1A] bg-[#121212]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-2 items-center">
                    <span className="bg-[#00A388]/10 text-[#00A388] text-xs font-bold uppercase py-1 px-3 rounded-md tracking-wider">
                      {item.type || 'Unknown'}
                    </span>
                    <span className="bg-neutral-800 text-neutral-400 text-[10px] font-mono py-1 px-2 rounded-md">
                      ID: {item.id}
                    </span>
                  </div>
                  <span className="text-xs text-neutral-500 font-medium">
                    {item.createdAt?.toLocaleString() || 'Unknown Date'}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <User className="w-4 h-4 text-neutral-500 mt-1 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-white">{item.clientName || 'Unknown User'}</p>
                      <p className="text-xs text-neutral-500">{item.clientId || 'No ID'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <AlignLeft className="w-4 h-4 text-neutral-500 mt-1 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-white max-w-full truncate" title={item.projectName || item.projectId}>
                        {item.projectName || item.projectId || 'Unknown Project'}
                      </p>
                      <a 
                        href={item.pageUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-xs text-[#00A388] hover:underline flex items-center gap-1 mt-0.5 truncate max-w-md block"
                      >
                         {item.pageUrl || 'No page URL logged'}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content & Screenshot */}
              <div className="p-6 flex-1 flex flex-col lg:flex-row gap-6">
                
                {/* Annotations & Text */}
                <div className="flex-1 space-y-4">
                  <div>
                    <h3 className="text-xs font-bold text-neutral-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <MessageSquare className="w-3 h-3" /> Core Content
                    </h3>
                    <div className="bg-[#1A1A1A] text-neutral-300 p-4 rounded-xl text-sm border border-[#242424] whitespace-pre-wrap">
                       {item.content || <span className="text-neutral-600 italic">No general content provided.</span>}
                    </div>
                  </div>

                  {item.annotations && item.annotations.length > 0 && (
                     <div>
                       <h3 className="text-xs font-bold text-neutral-600 uppercase tracking-widest mb-2">
                         Interactive Annotations ({item.annotations.length})
                       </h3>
                       <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                         {item.annotations.map((ann: any, idx: number) => (
                           <div key={idx} className="bg-[#121212] border border-[#2A2A2A] rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="bg-[#00A388] text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold">
                                  {ann.number || idx + 1}
                                </span>
                                <span className="text-xs text-neutral-500 font-mono bg-black px-1.5 py-0.5 rounded">
                                  X: {ann.x?.toFixed(1) || '?'}% | Y: {ann.y?.toFixed(1) || '?'}%
                                </span>
                              </div>
                              <p className="text-sm text-neutral-300">{ann.comment || <span className="italic text-neutral-600">No comment</span>}</p>
                           </div>
                         ))}
                       </div>
                     </div>
                  )}
                  
                  {item.position && (
                    <div>
                       <h3 className="text-xs font-bold text-neutral-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                         Legacy Click Coordinates
                       </h3>
                       <div className="bg-[#121212] border border-[#2A2A2A] rounded-lg p-3 text-sm text-neutral-400 font-mono">
                          X: {item.position.x?.toFixed(1) || '?'}%<br/>
                          Y: {item.position.y?.toFixed(1) || '?'}%
                       </div>
                    </div>
                  )}

                  {/* Metadata block */}
                  <div className="pt-4 border-t border-[#1A1A1A]">
                     <div className="grid grid-cols-2 gap-4 text-xs font-mono text-neutral-500">
                        <div>
                          <span className="text-neutral-700">Status: </span>
                          <span className="text-amber-500">{item.status || 'unknown'}</span>
                        </div>
                        <div>
                           <span className="text-neutral-700">Screenshot: </span>
                           {item.screenshot ? <span className="text-emerald-500">Present (Base64)</span> : <span className="text-red-500">Missing/Fallback</span>}
                        </div>
                     </div>
                  </div>
                </div>

                {/* Vertical Divider (Desktop) */}
                <div className="hidden lg:block w-px bg-[#1A1A1A]" />

                {/* Screenshot Viewer */}
                <div className="w-full lg:w-72 shrink-0 flex flex-col">
                   <h3 className="text-xs font-bold text-neutral-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                     <ImageIcon className="w-3 h-3" /> Captured View
                   </h3>
                   <div className="flex-1 bg-black border border-[#242424] rounded-xl overflow-hidden relative flex items-center justify-center min-h-[200px]">
                      {item.screenshot ? (
                        <div className="relative group w-full h-full flex flex-col">
                           <img 
                             src={item.screenshot} 
                             alt="Feedback Screenshot" 
                             className="w-full h-full object-contain"
                           />
                           <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                             <a 
                               href={item.screenshot} 
                               download={`feedback-${item.id}.jpg`}
                               className="px-4 py-2 bg-[#00A388] text-white text-xs font-bold rounded-lg hover:bg-[#008f76] transition-colors"
                             >
                               Download Image
                             </a>
                           </div>
                        </div>
                      ) : (
                        <div className="text-center p-6 text-neutral-600">
                           <MonitorOff className="w-10 h-10 mx-auto mb-3 opacity-30" />
                           <p className="text-xs font-medium">No Image Captured</p>
                           <p className="text-[10px] mt-1 opacity-70">Saved via graceful fallback.</p>
                        </div>
                      )}
                   </div>
                </div>

              </div>
            </div>
          ))}
        </div>

        {feedbacks.length === 0 && !fetching && (
          <div className="text-center py-32 bg-[#0D0D0D] border border-dashed border-[#1A1A1A] rounded-3xl">
            <h3 className="text-2xl font-bold text-neutral-500 mb-2">No feedbacks found</h3>
            <p className="text-neutral-600">Waiting for data to populate in the "feedback" collection.</p>
          </div>
        )}
      </div>
    </div>
  );
}
