import api from "./api";
import type { PaginatedResponse } from "@/types/api";

export type FaqSubmissionStatus = "NEW" | "IN_PROGRESS" | "ANSWERED";

export interface FaqSubmissionListItem {
  id: string;
  name: string;
  email: string;
  question: string;
  status: string;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export const faqService = {
  getSubmissions: (params?: { page?: number; limit?: number; status?: string }) =>
    api
      .get<PaginatedResponse<FaqSubmissionListItem>>("/faq/submissions", { params })
      .then((r) => r.data),

  updateSubmission: (
    id: string,
    payload: { status?: FaqSubmissionStatus; adminNotes?: string }
  ) =>
    api
      .patch<FaqSubmissionListItem>(`/faq/submissions/${id}`, payload)
      .then((r) => r.data),
};
