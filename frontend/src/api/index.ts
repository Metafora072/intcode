import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import { Problem, SubmissionResult, SubmissionSummary, UserProfile, User, UserSummary } from "../types";

type RetriableRequestConfig = AxiosRequestConfig & { _retry?: boolean };

let accessToken: string | null = window.localStorage.getItem("intcode_token");
const tokenListeners: Array<(token: string | null) => void> = [];

export const getAccessToken = () => accessToken;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
  if (token) {
    window.localStorage.setItem("intcode_token", token);
  } else {
    window.localStorage.removeItem("intcode_token");
  }
  tokenListeners.forEach((listener) => listener(token));
};

export const onTokenChange = (listener: (token: string | null) => void) => {
  tokenListeners.push(listener);
  return () => {
    const idx = tokenListeners.indexOf(listener);
    if (idx >= 0) {
      tokenListeners.splice(idx, 1);
    }
  };
};

const api = axios.create({
  baseURL: "/api",
  withCredentials: true
});

const shouldSkipRefresh = (url?: string) =>
  url?.includes("/auth/token") ||
  url?.includes("/auth/refresh") ||
  url?.includes("/auth/send-code") ||
  url?.includes("/auth/logout");

const forceLogout = () => {
  setAccessToken(null);
  window.dispatchEvent(new CustomEvent("intcode_logout", { detail: { reason: "expired" } }));
};

let refreshPromise: Promise<string> | null = null;

const refreshAccessToken = async () => {
  try {
    const res = await api.post<{ access_token: string; token_type: string }>("/auth/refresh");
    setAccessToken(res.data.access_token);
    return res.data.access_token;
  } catch (err) {
    forceLogout();
    throw err;
  }
};

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (resp: AxiosResponse) => resp,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const originalRequest = error.config as RetriableRequestConfig;
    if (status === 401 && originalRequest && !originalRequest._retry && !shouldSkipRefresh(originalRequest.url)) {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken();
      }
      try {
        const newToken = await refreshPromise;
        originalRequest._retry = true;
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        return Promise.reject(refreshErr);
      } finally {
        refreshPromise = null;
      }
    }
    return Promise.reject(error);
  }
);

export const fetchProblems = async (params?: {
  keyword?: string;
  difficulty?: string;
  tag?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: Problem[]; total: number }> => {
  const res = await api.get<{ items: Problem[]; total: number }>("/problems", { params });
  return res.data;
};

export const fetchProblem = async (id: number) => {
  const res = await api.get<Problem>(`/problems/${id}`);
  return res.data;
};

export const fetchTrendingTags = async () => {
  const res = await api.get<{ tag: string; count: number }[]>("/problems/tags/trending");
  return res.data;
};

export const createProblem = async (payload: any) => {
  const res = await api.post("/admin/problems", payload);
  return res.data;
};

export const updateProblem = async (id: number, payload: any) => {
  const res = await api.put(`/admin/problems/${id}`, payload);
  return res.data;
};

export const addTestcase = async (id: number, payload: any) => {
  const res = await api.post(`/admin/problems/${id}/testcases`, payload);
  return res.data;
};

export const submitCode = async (payload: {
  problem_id: number;
  language: string;
  code: string;
  mode: "run_sample" | "submit" | "custom";
  custom_input?: string;
}) => {
  const res = await api.post<SubmissionResult>("/submissions", payload);
  return res.data;
};

export const listSubmissions = async (params?: { problem_id?: number; user_id?: number; limit?: number }) => {
  const res = await api.get<SubmissionSummary[]>("/submissions", { params });
  return res.data;
};

export const getSubmission = async (id: number) => {
  const res = await api.get(`/submissions/${id}`);
  return res.data;
};

export const loginApi = async (username: string, password: string) => {
  const form = new URLSearchParams();
  form.append("username", username);
  form.append("password", password);
  const res = await api.post<{ access_token: string; token_type: string }>("/auth/token", form, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" }
  });
  return res.data;
};

export const registerApi = async (payload: {
  username: string;
  email: string;
  password: string;
  verification_code: string;
}) => {
  const res = await api.post<User>("/auth/register", payload);
  return res.data;
};

export const logoutApi = async () => {
  const res = await api.post<{ message: string }>("/auth/logout");
  return res.data;
};

export const sendVerificationCode = async (email: string, type: "register" | "reset") => {
  const res = await api.post<{ message: string }>("/auth/send-code", { email, type });
  return res.data;
};

export const fetchMe = async () => {
  const res = await api.get<UserProfile>("/users/me");
  return res.data;
};

export const fetchUsers = async () => {
  const res = await api.get<UserSummary[]>("/admin/users");
  return res.data;
};

export const deleteUser = async (userId: number) => {
  const res = await api.delete<{ message: string }>(`/admin/users/${userId}`);
  return res.data;
};

export const fetchUserCode = async (problemId: number) => {
  const res = await api.get<{ code: string; language: string; updated_at: string | null }>(
    `/problems/${problemId}/code`
  );
  return res.data;
};

export const saveUserCode = async (problemId: number, payload: { code: string; language: string }) => {
  const res = await api.put<{ message: string }>(`/problems/${problemId}/code`, payload);
  return res.data;
};

export const uploadAvatarApi = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post<{ avatar_url: string }>("/users/avatar", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return res.data;
};

export const resetPasswordApi = async (payload: { email: string; code: string; new_password: string }) => {
  const res = await api.post<{ message: string }>("/users/reset-password", payload);
  return res.data;
};

export default api;
