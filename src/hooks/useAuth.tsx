import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, withTimeout } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isMatchmaker: boolean;
  playerProfile: any | null;
  teamId: number | null;
  setIsAdmin: (isAdmin: boolean) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  isMatchmaker: false,
  playerProfile: null,
  teamId: null,
  setIsAdmin: () => {},
  refreshProfile: async () => {}
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMatchmaker, setIsMatchmaker] = useState(false);
  const [playerProfile, setPlayerProfile] = useState<any | null>(null);
  const [teamId, setTeamId] = useState<number | null>(null);

  useEffect(() => {
    // Definimos una función para orquestar la carga de la sesión
    const initializeAuth = async () => {
      try {
        // Obtenemos la sesión con un timeout de 5 segundos
        const { data: { session } } = await withTimeout(supabase.auth.getSession(), 5000, 'timeout_session');
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await checkRole(session.user);
        } else {
          setLoading(false);
        }
      } catch (err: any) {
        if (err.message === 'timeout_session') {
          console.warn('Supabase auth session search timed out. Forcing loading to false.');
        } else {
          console.error('Error fetching session:', err);
        }
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const authUser = session?.user ?? null;
      setUser(authUser);
      
      if (authUser) {
        await checkRole(authUser);
      } else {
        setIsAdmin(false);
        setPlayerProfile(null);
        setTeamId(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkRole = async (authUser: User) => {
    try {
      const dataPromise = (async () => {
        // Buscamos por email con un timeout de 8 segundos
        const { data: player, error: playerError } = (await withTimeout(
          supabase
            .from('players')
            .select('*')
            .ilike('email', authUser.email ?? '')
            .maybeSingle() as any,
          8000
        )) as any;

        if (playerError) throw playerError;

        // Si encontramos jugador pero no tiene user_id vinculado, lo vinculamos ahora
        if (player && !player.user_id) {
          await supabase
            .from('players')
            .update({ user_id: authUser.id })
            .eq('id', player.id);
          player.user_id = authUser.id;
        }

        let role = 'player';
        
        try {
          const { data: roleData } = (await withTimeout(
            supabase
              .from('users')
              .select('role')
              .eq('id', authUser.id)
              .single() as any,
            3000
          )) as any;
          if (roleData) role = roleData.role;
        } catch (e) {
          console.error("Error fetching user role:", e);
        }

        return { role, player };
      })();

      const result = await dataPromise;

      setIsAdmin(result.role === 'admin');
      setIsMatchmaker(result.role === 'admin' || ['captain', 'subcaptain'].includes(result.player?.match_role ?? ''));
      if (result.player) {
        setPlayerProfile(result.player);
      }

      // Determine teamId con timeout para no bloquear el loading
      try {
        const { data: ownedTeam } = (await withTimeout(
          supabase.from('team_settings').select('id').eq('owner_id', authUser.id).maybeSingle() as any,
          3000
        )) as any;
        if (ownedTeam?.id) {
          setTeamId(ownedTeam.id);
        } else if (result.player?.team_id) {
          setTeamId(result.player.team_id);
        } else {
          setTeamId(1);
        }
      } catch {
        setTeamId(result.player?.team_id ?? 1);
      }
    } catch (e: any) {
      console.error('Role check error or timeout:', e);
      // No reseteamos a null el perfil aquí por seguridad
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) await checkRole(user);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, isMatchmaker, playerProfile, teamId, setIsAdmin, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
