export interface User {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  plan: string;
  daily_questions_used: number;
  created_at: string;
}

export interface QuestionOptions {
  A: string;
  B: string;
  C: string;
  D: string;
}

export interface Question {
  id: number;
  question_text: string;
  statements: string[];
  options: QuestionOptions;
  topic_name: string;
  subtopic_name: string | null;
  difficulty: string;
  source_label: string | null;
}

export interface QuestionWithAnswer extends Question {
  correct_option: string;
  rationale: string | null;
}

export interface Attempt {
  id: number;
  question: QuestionWithAnswer;
  session_id: number | null;
  selected_option: string;
  is_correct: boolean;
  time_taken_secs: number | null;
  attempted_at: string;
  bookmarked: boolean;
}

export interface AttemptHistoryItem extends Attempt {}

export interface TopicHeatmapItem {
  topic: string;
  slug: string;
  icon: string | null;
  accuracy: number | null;
  total_attempted: number;
  strength: string;
}

export interface HeatmapResponse {
  topics: TopicHeatmapItem[];
}

export interface TestSession {
  id: number;
  session_type: string;
  topic_id: number | null;
  total_questions: number;
  correct_count: number;
  score: number;
  completed: boolean;
  started_at: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  is_new_user: boolean;
}

export interface SubmitAttemptResponse {
  is_correct: boolean;
  correct_option: string;
  rationale: string | null;
  source_label: string | null;
}

export interface StatsResponse {
  total_attempted: number;
  total_correct: number;
  overall_accuracy: number;
  current_streak: number;
  longest_streak: number;
}

export interface PaginatedAttempts {
  attempts: AttemptHistoryItem[];
  total: number;
  page: number;
  has_more: boolean;
}

export interface Subscription {
  id: string;
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
}
