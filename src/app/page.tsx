'use client';

import { ArrowRight, BrainCircuit, Code2, Github, Mic, ShieldCheck, User } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-hidden">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto border-b border-[#1A1A1A]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#00A388] rounded-xl flex items-center justify-center shadow-lg shadow-[#00A388]/20">
            <Code2 className="w-6 h-6 text-white" />
          </div>
          <span className="font-display font-bold text-2xl tracking-tight">DevSync</span>
        </div>
        <Link
          href="/auth"
          className="flex items-center gap-2 px-5 py-2.5 bg-[#0D0D0D] border border-[#1A1A1A] rounded-xl text-sm font-bold hover:border-[#00A388]/50 hover:text-[#00A388] transition-all"
        >
          <User className="w-4 h-4" />
          Sign In
        </Link>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-8 py-24">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#00A388]/10 text-[#00A388] rounded-full text-sm font-bold mb-8 border border-[#00A388]/20"
          >
            <BrainCircuit className="w-4 h-4" />
            AI-Powered Feedback Loop
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-6xl md:text-7xl font-display font-bold leading-tight mb-6"
          >
            Bridge the gap between{' '}
            <span className="text-[#00A388]">clients & code</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-neutral-400 leading-relaxed mb-12 max-w-2xl mx-auto"
          >
            Collect client feedback, scan your GitHub codebase with AI, and get structured fix suggestions — all in one place. Supports Sinhala & English audio input.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/auth"
              className="w-full sm:w-auto px-8 py-4 bg-[#00A388] text-white rounded-xl font-bold text-lg hover:bg-[#008F76] transition-all shadow-xl shadow-[#00A388]/20 flex items-center justify-center gap-2 group"
            >
              Get Started
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>

        {/* Animated Dashboard Preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-20 relative"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent z-10 pointer-events-none" />
          <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-[2.5rem] p-8 shadow-2xl">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
              <div className="ml-4 flex-1 h-6 bg-[#1A1A1A] rounded-lg" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Bug: Login redirect broken', type: 'bug', status: 'resolved' },
                { label: 'UI: Dashboard takes too long to load', type: 'improvement', status: 'in-progress' },
                { label: 'Feature: Add dark mode toggle', type: 'improvement', status: 'pending' },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + i * 0.1 }}
                  className="p-5 bg-[#1A1A1A] border border-[#242424] rounded-2xl space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${
                      item.type === 'bug' ? 'bg-red-500/10 text-red-500' : 'bg-[#00A388]/10 text-[#00A388]'
                    }`}>{item.type}</span>
                    <span className={`ml-auto px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${
                      item.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-500' :
                      item.status === 'in-progress' ? 'bg-amber-500/10 text-amber-500' :
                      'bg-neutral-800 text-neutral-500'
                    }`}>{item.status}</span>
                  </div>
                  <p className="text-sm text-neutral-300 font-medium leading-snug">{item.label}</p>
                  <div className="flex items-center gap-2 pt-1">
                    <div className="w-5 h-5 rounded-full bg-[#00A388]/20 flex items-center justify-center">
                      <BrainCircuit className="w-3 h-3 text-[#00A388]" />
                    </div>
                    <div className="h-1.5 flex-1 bg-[#242424] rounded-full overflow-hidden">
                      <div className={`h-full bg-[#00A388] rounded-full ${
                        item.status === 'resolved' ? 'w-full' : item.status === 'in-progress' ? 'w-2/3' : 'w-1/4'
                      }`} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Features Grid */}
        <div className="mt-32 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureCard
            icon={<Github className="w-6 h-6" />}
            title="GitHub Integration"
            description="Select and connect only the repositories you need — no bulk imports."
          />
          <FeatureCard
            icon={<BrainCircuit className="w-6 h-6" />}
            title="AI Code Analysis"
            description="AI scans your codebase and provides specific code fixes for every piece of feedback."
          />
          <FeatureCard
            icon={<Mic className="w-6 h-6" />}
            title="Audio Feedback"
            description="Clients can record feedback in Sinhala or English — transcribed in real time."
          />
          <FeatureCard
            icon={<ShieldCheck className="w-6 h-6" />}
            title="Access Control"
            description="Assign projects to specific clients. Each client only sees what you allow."
          />
        </div>
      </main>

      {/* Footer Stats */}
      <section className="border-t border-[#1A1A1A] py-16 bg-[#080808] mt-16">
        <div className="max-w-4xl mx-auto px-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <Stat label="Feedback Processed" value="10k+" />
          <Stat label="Bugs Fixed" value="2.5k" />
          <Stat label="Languages" value="2" />
          <Stat label="Client Satisfaction" value="99%" />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <motion.div
      whileHover={{ y: -6 }}
      className="p-7 bg-[#0D0D0D] border border-[#1A1A1A] rounded-3xl hover:border-[#00A388]/40 transition-all group"
    >
      <div className="w-12 h-12 bg-[#00A388]/10 text-[#00A388] rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-lg font-display font-bold text-white mb-3">{title}</h3>
      <p className="text-neutral-500 text-sm leading-relaxed">{description}</p>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-4xl font-display font-bold text-[#00A388] mb-2">{value}</div>
      <div className="text-xs font-bold text-neutral-600 uppercase tracking-widest">{label}</div>
    </div>
  );
}
