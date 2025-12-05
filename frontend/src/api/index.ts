import axios from "axios";
import { Problem, SubmissionResult, SubmissionSummary, User } from "../types";

const api = axios.create({
  baseURL: "/api"
});

api.interceptors.request.use((config) => {
  const token = window.localStorage.getItem("intcode_token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (resp) => resp,
  (error) => {
    if (error.response?.status === 401) {
      window.localStorage.removeItem("intcode_token");
      window.dispatchEvent(new Event("intcode_logout"));
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

export const registerApi = async (payload: { username: string; email: string; password: string }) => {
  const res = await api.post<User>("/auth/register", payload);
  return res.data;
};

export const fetchMe = async () => {
  const res = await api.get<User>("/auth/users/me");
  return res.data;
};

export default api;
