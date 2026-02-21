'use client';

import { useAuth } from '@/hooks/use-auth';
import { auth, db, googleProvider } from '@/lib/firebase';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ArrowRight, Code2, Loader2, Lock, User } from 'lucide-react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export default function AuthPage() {
  const { user, role, loading: authLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<'engineer' | 'client'>('engineer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // If already logged in, redirect immediately
  useEffect(() => {
    if (!authLoading && user && role) {
      router.push(role === 'engineer' ? '/dashboard' : '/client');
    }
  }, [user, role, authLoading, router]);

  const redirectByRole = (r: string | null) => {
    if (r === 'client') {
      router.push('/client');
    } else if (r === 'engineer' || r === 'admin') {
      router.push('/dashboard');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        // Fetch role from Firestore to redirect correctly
        const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
        const fetchedRole = userDoc.exists() ? (userDoc.data().role as string | null) : null;
        redirectByRole(fetchedRole);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email,
          role: selectedRole,
          createdAt: new Date().toISOString(),
        });
        redirectByRole(selectedRole);
      }
    } catch (err: any) {
      // Show friendly error messages
      const code = err.code || '';
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Invalid email or password. Please try again.');
      } else if (code === 'auth/email-already-in-use') {
        setError('This email is already registered. Try signing in instead.');
      } else if (code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);

      const userDocRef = doc(db, 'users', result.user.uid);
      const userDocSnap = await getDoc(userDocRef);

      let userRole: string = selectedRole;
      if (!userDocSnap.exists()) {
        // First time Google login — save to Firestore with the selected role
        await setDoc(userDocRef, {
          email: result.user.email,
          role: selectedRole,
          createdAt: new Date().toISOString(),
        });
      } else {
        userRole = userDocSnap.data()?.role as string;
      }

      redirectByRole(userRole);
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <Loader2 className="w-8 h-8 animate-spin text-[#00A388]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-[#121212] rounded-[2rem] shadow-2xl border border-[#1F1F1F] overflow-hidden"
      >
        <div className="p-10">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-[#00A388] rounded-2xl flex items-center justify-center shadow-lg shadow-[#00A388]/20">
              <Code2 className="w-10 h-10 text-white" />
            </div>
          </div>

          <h1 className="text-3xl font-display font-bold text-center text-white mb-2">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-center text-neutral-500 mb-8">
            {isLogin ? 'Sign in to manage your projects' : 'Join DevSync to start collaborating'}
          </p>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-neutral-400 mb-2">Email Address</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-600" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl focus:ring-2 focus:ring-[#00A388] focus:border-transparent outline-none transition-all placeholder:text-neutral-700"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-neutral-400 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-600" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-[#1A1A1A] border border-[#2A2A2A] text-white rounded-xl focus:ring-2 focus:ring-[#00A388] focus:border-transparent outline-none transition-all placeholder:text-neutral-700"
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>
            </div>

            {/* Role selector - shown for BOTH login and signup for Google redirect, but required for signup */}
            <div>
              <label className="block text-sm font-semibold text-neutral-400 mb-3">
                {isLogin ? 'I am a... (for Google sign-in)' : 'I am a...'}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedRole('engineer')}
                  className={`py-3.5 px-4 rounded-xl border-2 transition-all font-bold ${
                    selectedRole === 'engineer'
                      ? 'border-[#00A388] bg-[#00A388]/10 text-[#00A388]'
                      : 'border-[#2A2A2A] text-neutral-500 hover:border-neutral-700'
                  }`}
                >
                  Engineer
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole('client')}
                  className={`py-3.5 px-4 rounded-xl border-2 transition-all font-bold ${
                    selectedRole === 'client'
                      ? 'border-[#00A388] bg-[#00A388]/10 text-[#00A388]'
                      : 'border-[#2A2A2A] text-neutral-500 hover:border-neutral-700'
                  }`}
                >
                  Client
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#00A388] text-white rounded-xl font-bold hover:bg-[#008F76] transition-all shadow-xl shadow-[#00A388]/20 flex items-center justify-center gap-2 group disabled:opacity-50 mt-4"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#2A2A2A]"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-[#121212] text-neutral-600 font-medium">Or continue with</span>
            </div>
          </div>

          {/* Google Sign In */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="mt-4 w-full py-3.5 bg-[#1A1A1A] text-white border border-[#2A2A2A] rounded-xl font-bold hover:bg-[#222222] hover:border-[#3A3A3A] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="mt-8 text-center">
            <button
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-sm font-bold text-[#00A388] hover:text-[#008F76] transition-colors"
            >
              {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
