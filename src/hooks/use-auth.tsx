'use client';

import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: 'engineer' | 'client' | 'admin' | null;
  fetchRole: (uid?: string) => Promise<'engineer' | 'client' | 'admin' | null>; // Allow components to fetch on demand
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  role: null,
  fetchRole: async () => null,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'engineer' | 'client' | 'admin' | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async (uid?: string) => {
    const targetUid = uid || user?.uid;
    if (!targetUid) return null;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', targetUid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const foundRole = data.role as 'engineer' | 'client' | 'admin';
        setRole(foundRole);
        return foundRole;
      }
    } catch (err: any) {
      console.error('Failed to fetch user role:', err?.message || err);
    }
    return null;
  };

  useEffect(() => {
    // Safety timeout — unblock UI after 8s even if Firebase is being slow
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 8000);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      clearTimeout(timeout);
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Fetch role asynchronously but do not block the UI or redirect logic in context
        fetchRole(firebaseUser.uid);
      } else {
        setRole(null);
      }
      
      setLoading(false);
    });

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, role, fetchRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
