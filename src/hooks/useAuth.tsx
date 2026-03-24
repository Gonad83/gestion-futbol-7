import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  playerProfile: any | null;
  setIsAdmin: (isAdmin: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  playerProfile: null,
  setIsAdmin: () => {}
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [playerProfile, setPlayerProfile] = useState<any | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      console.warn('Supabase auth session search timed out. Forcing loading to false.');
      setLoading(false);
    }, 5000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkRole(session.user);
      } else {
        setLoading(false);
      }
    }).catch(err => {
      console.error('Error fetching session:', err);
      clearTimeout(timeout);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkRole(session.user);
      } else {
        setIsAdmin(false);
        setPlayerProfile(null);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const checkRole = async (authUser: User) => {
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 4000)
      );

      const dataPromise = Promise.all([
        supabase.from('users').select('role').eq('id', authUser.id).single(),
        supabase.from('players').select('*').ilike('email', authUser.email ?? '').maybeSingle()
      ]);

      const [roleResult, playerResult] = await Promise.race([dataPromise, timeoutPromise]) as any;

      setIsAdmin(roleResult?.data?.role === 'admin');
      setPlayerProfile(playerResult?.data ?? null);
    } catch (e: any) {
      if (e.message === 'timeout') {
        console.warn('Role check timed out after 4s. Defaulting to non-admin.');
      } else {
        console.error('Role check error:', e);
      }
      setIsAdmin(false);
      setPlayerProfile(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, playerProfile, setIsAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
