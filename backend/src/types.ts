export type Language = "en" | "hi" | "te" | "ta" | "bn" | "gu";
export type TestType = "riasec" | "values" | "personal";

export interface UserProfile {
  name: string;
  class: string;
  age?: string;
  language: Language;
  email?: string;
  phone?: string;
}

export interface AssessmentAnswer {
  [questionId: number]: string | string[];
}

export interface AssessmentPayload {
  userProfile: UserProfile;
  tests: {
    type: TestType;
    answers: AssessmentAnswer;
  }[];
  completedAt: string;
  assessmentId: number;
}

export interface CareerRecommendation {
  title: string;
  confidence: number;
  reason: string;
  next_steps: string[];
}

export interface AssessmentResponse {
  recommendations: CareerRecommendation[];
  summary: string;
  smsMessage?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface ChatSession {
  sessionId: string;
  assessmentId?: number;
  assessmentSummary?: string;
  messages: ChatMessage[];
  createdAt: Date;
  lastActivity: Date;
}

export interface ChatStartRequest {
  sessionId: string;
  assessmentId?: number;
  assessmentSummary?: string;
  language?: Language;
}

export interface ChatMessageRequest {
  sessionId: string;
  message: string;
  language?: Language;
  assessmentId?: number;
}

export interface ChatMessageResponse {
  reply: string;
  intent: string;
}

