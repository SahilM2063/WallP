import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useColorScheme, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { Catalog, User } from '@wallp/shared';
import { demoCatalog } from './demo';
import { api, API_URL, ApiError, request } from './api';
import { googleIdToken, googleSignOut } from './google';
import { themes, type ThemePreference, type Theme } from './theme';

const tokenStore = {
  get: () =>
    Platform.OS === 'web'
      ? Promise.resolve<string | null>(null)
      : SecureStore.getItemAsync('wallp-session'),
  set: (value: string) =>
    Platform.OS === 'web' ? Promise.resolve() : SecureStore.setItemAsync('wallp-session', value),
  clear: () =>
    Platform.OS === 'web' ? Promise.resolve() : SecureStore.deleteItemAsync('wallp-session'),
};
interface State {
  catalog: Catalog;
  loading: boolean;
  error: string | null;
  demo: boolean;
  user: User | null;
  token: string | null;
  likedIds: string[];
  theme: Theme;
  dark: boolean;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  refresh: () => Promise<void>;
  toggleLike: (id: string) => Promise<void>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}
const Context = createContext<State | null>(null);
const empty: Catalog = { wallpapers: [], collections: [], features: {}, nextCursor: null };
export function AppProvider({ children }: { children: React.ReactNode }) {
  const demo = !API_URL;
  const system = useColorScheme();
  const [preference, setPref] = useState<ThemePreference>('system');
  const dark = preference === 'system' ? system === 'dark' : preference === 'dark';
  const [catalog, setCatalog] = useState<Catalog>(demo ? demoCatalog : empty);
  const [loading, setLoading] = useState(!demo);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const inFlight = useRef(new Set<string>());
  const refreshRun = useRef(0);
  const sessionVersion = useRef(0);
  const refresh = async () => {
    if (demo) return;
    const run = ++refreshRun.current;
    setLoading(true);
    setError(null);
    try {
      let page = await api.catalog();
      let all = [...page.wallpapers];
      while (page.nextCursor) {
        page = await api.catalog(page.nextCursor);
        all.push(...page.wallpapers);
      }
      if (run === refreshRun.current) setCatalog({ ...page, wallpapers: all });
    } catch (e) {
      if (run === refreshRun.current) setError((e as Error).message);
    } finally {
      if (run === refreshRun.current) setLoading(false);
    }
  };
  useEffect(() => {
    void AsyncStorage.getItem('wallp-theme').then((v) => {
      if (v === 'system' || v === 'light' || v === 'dark') setPref(v);
    });
    if (demo) {
      void AsyncStorage.getItem('wallp-demo-likes').then((v) => {
        if (v)
          try {
            const parsed: unknown = JSON.parse(v);
            if (Array.isArray(parsed)) setLikedIds(parsed.filter((x) => typeof x === 'string'));
          } catch {}
      });
    } else {
      void (async () => {
        try {
          const saved = await tokenStore.get();
          if (saved) {
            const me = await api.me(saved);
            setToken(saved);
            setUser(me.user);
            setLikedIds(me.likedIds);
          }
        } catch (e) {
          if (e instanceof ApiError && e.status === 401) await tokenStore.clear();
          else setError('Could not restore your session. Sign in again when connected.');
        }
      })();
    }
    void refresh();
  }, []);
  const setPreference = (p: ThemePreference) => {
    setPref(p);
    void AsyncStorage.setItem('wallp-theme', p);
  };
  const toggleLike = async (id: string) => {
    if (inFlight.current.has(id)) return;
    if (!demo && !token) throw new Error('Sign in with Google from You to save your favorites.');
    const liked = likedIds.includes(id);
    const version = sessionVersion.current;
    inFlight.current.add(id);
    try {
      if (!demo) await api.like(id, !liked, token!);
      if (version !== sessionVersion.current) return;
      setLikedIds((current) => {
        const next = liked ? current.filter((x) => x !== id) : [...current, id];
        if (demo) void AsyncStorage.setItem('wallp-demo-likes', JSON.stringify(next));
        return next;
      });
      if (!demo)
        setCatalog((current) => ({
          ...current,
          wallpapers: current.wallpapers.map((w) =>
            w.id === id ? { ...w, likes: Math.max(0, w.likes + (liked ? -1 : 1)) } : w,
          ),
        }));
    } finally {
      inFlight.current.delete(id);
    }
  };
  const login = async () => {
    if (demo)
      throw new Error(
        'Set up Google and your API first using docs/GOOGLE_SETUP.md. Your preview favorites stay on this device.',
      );
    const idToken = await googleIdToken();
    const session = await api.login(idToken);
    await tokenStore.set(session.token);
    const me = await api.me(session.token);
    sessionVersion.current++;
    setToken(session.token);
    setUser(me.user);
    setLikedIds(me.likedIds);
  };
  const clearSession = async () => {
    sessionVersion.current++;
    await tokenStore.clear();
    setUser(null);
    setToken(null);
    setLikedIds([]);
    try {
      await googleSignOut();
    } catch {}
  };
  const logout = async () => {
    if (token) await request('/auth/logout', token, null, 'POST');
    await clearSession();
  };
  const deleteAccount = async () => {
    if (token) await request('/me', token, null, 'DELETE');
    await clearSession();
  };
  return (
    <Context.Provider
      value={{
        catalog,
        loading,
        error,
        demo,
        user,
        token,
        likedIds,
        theme: themes[dark ? 'dark' : 'light'],
        dark,
        preference,
        setPreference,
        refresh,
        toggleLike,
        login,
        logout,
        deleteAccount,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useApp = () => {
  const value = useContext(Context);
  if (!value) throw new Error('AppProvider missing');
  return value;
};
