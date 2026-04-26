export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: 'superadmin' | 'maker' | 'checker';
  created_at: string;
}

export interface Topic {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  subtopics: Subtopic[];
}

export interface Subtopic {
  id: number;
  topic_id: number;
  name: string;
  slug: string;
  is_active: boolean;
}

export type QuestionStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'published' | 'archived';

export interface Question {
  id: number;
  question_text: string;
  statements: string[];
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  rationale: string | null;
  topic_id: number;
  subtopic_id: number | null;
  difficulty: string;
  year: number | null;
  source_label: string | null;
  status: QuestionStatus;
  created_by: number | null;
  reviewed_by: number | null;
  submitted_by: number | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  rejection_comment: string | null;
  published_at: string | null;
  import_batch_id: string | null;
  created_at: string;
  updated_at: string;
  created_by_name: string | null;
  submitted_by_name: string | null;
  reviewed_by_name: string | null;
  topic_name: string | null;
}

export interface PaginatedQuestions {
  questions: Question[];
  total: number;
  page: number;
  has_more: boolean;
}

export interface OverviewStats {
  total_users: number;
  active_today: number;
  total_questions: number;
  published_questions: number;
  total_subscriptions: number;
  active_subscriptions: number;
}

export interface BulkImportResult {
  imported: number;
  failed: number;
  errors: string[];
  batch_id: string;
}
