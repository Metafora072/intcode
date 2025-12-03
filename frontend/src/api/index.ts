import axios from "axios";
import { Problem, SubmissionResult, SubmissionSummary } from "../types";

const api = axios.create({
  baseURL: "/api"
});

export const fetchProblems = async (params?: { keyword?: string; difficulty?: string; limit?: number; offset?: number }) => {
  const res = await api.get<Problem[]>("/problems", { params });
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
  mode: "run_sample" | "submit";
}) => {
  const res = await api.post<SubmissionResult>("/submissions", payload);
  return res.data;
};

export const listSubmissions = async (problemId?: number) => {
  const res = await api.get<SubmissionSummary[]>("/submissions", { params: { problem_id: problemId } });
  return res.data;
};

export const getSubmission = async (id: number) => {
  const res = await api.get(`/submissions/${id}`);
  return res.data;
};
