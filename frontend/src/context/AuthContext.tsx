import { createContext, useContext, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { fetchMe, loginApi, logoutApi, onTokenChange, registerApi, setAccessToken, getAccessToken } from "../api";
import { UserProfile } from "../types";

interface AuthContextValue {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (payload: { username: string; email: string; password: string; verification_code: string }) => Promise<void>;
  refreshProfile: () => Promise<void>;
  logout: (options?: { redirect?: boolean; message?: string }) => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  loading: true,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  login: async () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  register: async () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  refreshProfile: async () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  logout: () => {}
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => getAccessToken());
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const clearSession = (options?: { redirect?: boolean; message?: string }) => {
    setToken(null);
    setUser(null);
    setAccessToken(null);
    if (options?.message) {
      toast.error(options.message);
    }
    if (options?.redirect) {
      window.location.href = "/login";
    }
  };

  const loadProfile = async (nextToken: string | null) => {
    setLoading(true);
    if (!nextToken) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await fetchMe();
      setUser(me);
    } catch {
      clearSession();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onTokenChange((next) => setToken(next));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    loadProfile(token);
    const onForceLogout = (e: Event) => {
      const reason = (e as CustomEvent<{ reason?: string }>).detail?.reason;
      const message = reason === "expired" ? "登录已过期，请重新登录" : undefined;
      logout({ redirect: true, message });
    };
    window.addEventListener("intcode_logout", onForceLogout as EventListener);
    return () => window.removeEventListener("intcode_logout", onForceLogout as EventListener);
  }, [token]);

  const login = async (username: string, password: string) => {
    const res = await loginApi(username, password);
    setAccessToken(res.access_token);
  };

  const register = async (payload: {
    username: string;
    email: string;
    password: string;
    verification_code: string;
  }) => {
    await registerApi(payload);
    await login(payload.username, payload.password);
  };

  const refreshProfile = async () => {
    await loadProfile(token);
  };

  const logout = (options?: { redirect?: boolean; message?: string }) => {
    logoutApi().catch(() => {});
    clearSession(options);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, refreshProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
