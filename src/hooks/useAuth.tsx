import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  playerProfile: any | null;
  setIsAdmin: (isAdmin: boolean) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  playerProfile: null,
  setIsAdmin: () => {},
  refreshProfile: async () => {}
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
        setTimeout(() => reject(new Error('timeout')), 8000) // Aumentamos a 8s
      );

      const dataPromise = (async () => {
        // Buscamos por email
        const { data: player, error: playerError } = await supabase
          .from('players')
          .select('*')
          .ilike('email', authUser.email ?? '')
          .maybeSingle();

        if (playerError) throw playerError;

        // Si encontramos jugador pero no tiene user_id vinculado, lo vinculamos ahora
        if (player && !player.user_id) {
          await supabase
            .from('players')
            .update({ user_id: authUser.id })
            .eq('id', player.id);
          player.user_id = authUser.id; // Actualizamos objeto local
        }

        const { data: roleData } = await supabase
          .from('users')
          .select('role')
          .eq('id', authUser.id)
          .single();

        return { role: roleData?.role, player };
      })();

      const result = await Promise.race([dataPromise, timeoutPromise]) as any;

      setIsAdmin(result.role === 'admin');
      if (result.player) {
        setPlayerProfile(result.player);
      }
    } catch (e: any) {
      if (e.message === 'timeout') {
        console.warn('Role check timed out. Manteniendo perfil actual si existe.');
      } else {
        console.error('Role check error:', e);
      }
      // NO reseteamos a null el perfil aquí para evitar el flash de "Sin perfil" por red lenta
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) await checkRole(user);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, playerProfile, setIsAdmin, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
