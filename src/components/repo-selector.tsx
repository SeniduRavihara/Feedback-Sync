'use client';

import { useState } from 'react';
import { Github, Search, Plus, ExternalLink, Code2, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

interface Repo {
  id: number;
  name: string;
  full_name: string;
  description: string;
  html_url: string;
}

export function RepoSelector({ onSelect }: { onSelect: (repo: Repo) => void }) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchRepos = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/github/repos');
      if (response.ok) {
        const data = await response.json();
        setRepos(data);
      }
    } catch (error) {
      console.error('Error fetching repos:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRepos = repos.filter(repo => 
    repo.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-display font-bold text-white">Connect GitHub Projects</h2>
        <button
          onClick={fetchRepos}
          className="flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl hover:bg-[#2A2A2A] transition-all text-sm font-bold"
        >
          <Github className="w-5 h-5" />
          Fetch Repositories
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-600" />
        <input
          type="text"
          placeholder="Search repositories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl focus:ring-2 focus:ring-[#00A388] focus:border-transparent outline-none transition-all text-white placeholder:text-neutral-700"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
        {filteredRepos.map((repo) => (
          <motion.div
            key={repo.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl hover:border-[#00A388]/50 transition-all group cursor-pointer"
            onClick={() => onSelect(repo)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#080808] rounded-xl flex items-center justify-center border border-[#2A2A2A]">
                  <Code2 className="w-5 h-5 text-[#00A388]" />
                </div>
                <h3 className="font-bold text-white group-hover:text-[#00A388] transition-colors">
                  {repo.name}
                </h3>
              </div>
              <Plus className="w-5 h-5 text-neutral-700 group-hover:text-[#00A388]" />
            </div>
            <p className="text-sm text-neutral-500 line-clamp-2 mb-4 leading-relaxed">
              {repo.description || 'No description provided.'}
            </p>
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-neutral-600">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                Updated recently
              </span>
              <a 
                href={repo.html_url} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 hover:text-[#00A388] transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                GitHub
              </a>
            </div>
          </motion.div>
        ))}
        {repos.length === 0 && !loading && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-[#1F1F1F] rounded-[2rem]">
            <Github className="w-16 h-16 text-neutral-800 mx-auto mb-6" />
            <p className="text-neutral-500 font-bold">Click &quot;Fetch Repositories&quot; to get started</p>
          </div>
        )}
        {loading && (
          <div className="col-span-full py-20 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-[#00A388] mx-auto" />
          </div>
        )}
      </div>
    </div>
  );
}
