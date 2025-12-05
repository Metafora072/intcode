export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export interface TestCase {
  id?: number;
  input_text: string;
  output_text: string;
  is_sample: boolean;
}

export interface Problem {
  id: number;
  slug: string;
  title: string;
  difficulty: Difficulty;
  tags: string[];
  content: string;
  input_description: string;
  output_description: string;
  constraints: string;
  is_spj?: boolean;
  spj_code?: string | null;
  created_at: string;
  updated_at: string;
  testcases: TestCase[];
}

export interface SubmissionSummary {
  id: number;
  problem_id: number;
  language: string;
  status: string;
  runtime_ms: number;
  score: number;
  created_at: string;
}

export interface SubmissionCaseResult {
  case_id: number;
  status: string;
  input_preview?: string;
  expected_preview?: string;
  output_preview?: string;
  runtime_ms?: number;
  error?: string;
}

export interface SubmissionResult {
  status: string;
  runtime_ms: number;
  compile_error?: string | null;
  runtime_error?: string | null;
  cases: SubmissionCaseResult[];
  submission_id?: number;
}

export interface User {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  created_at: string;
  avatar_url?: string | null;
}

export interface RecentSubmission {
  id: number;
  problem_id: number;
  problem_title: string;
  status: string;
  runtime_ms: number;
  created_at: string;
}

export interface UserProfile extends User {
  solved_count: number;
  submission_count: number;
  acceptance_rate: number;
  rank: number;
  recent_submissions: RecentSubmission[];
}
