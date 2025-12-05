import { createContext, useContext, useEffect, useState } from "react";
import { fetchMe, loginApi, registerApi } from "../api";
import { User } from "../types";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (payload: { username: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
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
  logout: () => {}
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => window.localStorage.getItem("intcode_token"));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = () => {
    setToken(null);
    setUser(null);
    window.localStorage.removeItem("intcode_token");
  };

  const loadProfile = async (nextToken: string | null) => {
    if (!nextToken) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await fetchMe();
      setUser(me);
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile(token);
    const onForceLogout = () => logout();
    window.addEventListener("intcode_logout", onForceLogout);
    return () => window.removeEventListener("intcode_logout", onForceLogout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const login = async (username: string, password: string) => {
    const res = await loginApi(username, password);
    window.localStorage.setItem("intcode_token", res.access_token);
    setToken(res.access_token);
  };

  const register = async (payload: { username: string; email: string; password: string }) => {
    await registerApi(payload);
    await login(payload.username, payload.password);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
