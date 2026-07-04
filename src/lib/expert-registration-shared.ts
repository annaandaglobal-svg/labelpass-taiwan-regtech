// Client-safe types and option lists for expert registration. This module must NOT
// import server-only code (e.g. postgres) so it can be used from client components.

// Disciplines an expert can offer, aligned with the operator expert pipeline categories.
export const EXPERT_SERVICE_OPTIONS = [
  "TFDA 등록",
  "PIF 작성",
  "라벨 검수",
  "중문 라벨 감수",
  "광고·표시 심의",
  "HS/CCC 분류",
  "수출입 통관",
  "원산지증명(C/O)",
  "식품 수입검사",
  "건강식품 허가"
] as const;

export const EXPERT_LANGUAGE_OPTIONS = ["ko", "zh-Hant", "zh-Hans", "en", "ja"] as const;

export type ExpertRegistrationInput = {
  id: string;
  createdAt: string;
  displayName: string;
  companyName: string;
  role: string;
  yearsExperience: number | null;
  categories: string[];
  languages: string[];
  hourlyRate: number | null;
  currency: string;
  credential: string;
  contactEmail: string;
  bio: string;
};

export type ExpertRegistrationPayload = {
  registration: ExpertRegistrationInput;
  requestId?: string | null;
};
