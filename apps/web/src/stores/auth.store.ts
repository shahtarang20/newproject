import { create } from 'zustand';
import type { Permission, StaffRole } from '@vastra/shared';
import { ROLE_PERMISSIONS } from '@vastra/shared';
import { authApi } from '@/api/endpoints/auth';
import { refreshAccessToken, setAccessToken, setSessionExpiredHandler } from '@/api/client';
import type { AuthSession, AuthShop, AuthUser, LoginPayload, MeResponse, RegisterPayload } from '@/types/api';

export type AuthStatus = 'idle' | 'loading' | 'authed' | 'guest';

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  shop: AuthShop | null;
  staffRole: StaffRole | null;
  permissions: Permission[];
  bootstrap: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<AuthUser>;
  register: (payload: RegisterPayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
  setShop: (shop: AuthShop) => void;
  refreshMe: () => Promise<void>;
  reset: () => void;
}

function derive(s: Pick<AuthSession | MeResponse, 'user' | 'shop' | 'staffRole' | 'permissions'>) {
  const staffRole = s.staffRole ?? (s.user.role === 'SHOP_USER' && s.shop ? 'OWNER' : null);
  const permissions = s.permissions ?? (staffRole ? [...ROLE_PERMISSIONS[staffRole]] : []);
  return { user: s.user, shop: s.shop ?? null, staffRole, permissions, status: 'authed' as const };
}

/**
 * Non-sensitive hint about whether this browser has a session (the real credential is the HTTP-only refresh cookie).
 *   '1' = had a session → ask the server on load
 *   '0' = known guest   → skip the pointless refresh call that would 401
 *   null = unknown (first visit, or a session that predates the hint) → ask the server, except on public storefront
 *          pages where shoppers arriving from a WhatsApp link are almost never signed in.
 */
const SESSION_HINT_KEY = 'vastra:session';
type SessionHint = '1' | '0' | null;
const sessionHint = {
  get(): SessionHint {
    try {
      const v = localStorage.getItem(SESSION_HINT_KEY);
      return v === '1' || v === '0' ? v : null;
    } catch {
      return null; // storage unavailable: fall back to asking the server
    }
  },
  write(value: '1' | '0'): void {
    try {
      localStorage.setItem(SESSION_HINT_KEY, value);
    } catch {
      /* ignore */
    }
  },
  set(): void {
    this.write('1');
  },
  markGuest(): void {
    this.write('0');
  },
};

const isPublicStorefront = (): boolean => typeof window !== 'undefined' && window.location.pathname.startsWith('/shop/');

const guest = { status: 'guest' as const, user: null, shop: null, staffRole: null, permissions: [] as Permission[] };

let bootstrapPromise: Promise<void> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'idle',
  user: null,
  shop: null,
  staffRole: null,
  permissions: [],

  bootstrap: () => {
    if (get().status === 'authed' || get().status === 'guest') return Promise.resolve();
    const hint = sessionHint.get();
    if (hint === '0' || (hint === null && isPublicStorefront())) {
      set(guest);
      return Promise.resolve();
    }
    if (!bootstrapPromise) {
      set({ status: 'loading' });
      bootstrapPromise = (async () => {
        try {
          const token = await refreshAccessToken();
          if (!token) throw new Error('no session');
          const me = await authApi.me();
          set(derive(me));
          sessionHint.set();
        } catch {
          setAccessToken(null);
          sessionHint.markGuest();
          set(guest);
        } finally {
          bootstrapPromise = null;
        }
      })();
    }
    return bootstrapPromise;
  },

  login: async (payload) => {
    const session = await authApi.login(payload);
    setAccessToken(session.accessToken);
    sessionHint.set();
    set(derive(session));
    return session.user;
  },

  register: async (payload) => {
    const session = await authApi.register(payload);
    setAccessToken(session.accessToken);
    sessionHint.set();
    set(derive(session));
    return session.user;
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      /* ignore — we clear locally regardless */
    }
    setAccessToken(null);
    sessionHint.markGuest();
    set(guest);
  },

  setShop: (shop) => set({ shop }),

  refreshMe: async () => {
    const me = await authApi.me();
    set(derive(me));
  },

  reset: () => {
    setAccessToken(null);
    sessionHint.markGuest();
    set(guest);
  },
}));

// When refresh fails mid-session, drop to guest so guards redirect to /login.
setSessionExpiredHandler(() => useAuthStore.getState().reset());

export const homePathForRole = (role: AuthUser['role'] | undefined): string =>
  role === 'SUPER_ADMIN' ? '/super-admin' : '/dashboard';
