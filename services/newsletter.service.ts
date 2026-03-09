import api from "./api";

export type NewsletterSubscriberStatus = "PENDING" | "SUBSCRIBED" | "UNSUBSCRIBED";
export type NewsletterSource = "HOMEPAGE" | "CHECKOUT" | "POPUP" | "ACCOUNT";

export interface NewsletterSubscriberListItem {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: NewsletterSubscriberStatus;
  source: NewsletterSource;
  consent: boolean;
  consentTimestamp: string | null;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewsletterSubscribersResponse {
  data: NewsletterSubscriberListItem[];
  total: number;
}

export const newsletterService = {
  getSubscribers: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }) =>
    api
      .get<NewsletterSubscribersResponse>("/newsletter/subscribers", { params })
      .then((r) => r.data),

  exportCsv: async (status?: string): Promise<void> => {
    const params = status ? { status } : {};
    const res = await api.get<Blob>("/newsletter/subscribers/export", {
      params,
      responseType: "blob",
    });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
