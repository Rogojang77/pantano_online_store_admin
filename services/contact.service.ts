import api from "./api";

export interface ContactInfoResponse {
  pageTitle: string;
  imageUrl?: string;
  address: { street: string; city: string; postalCode: string };
  phone: string;
  email: string;
  openingHours: {
    headline?: string;
    rows: { day: string; time: string }[];
  };
  openingHoursSummary?: string;
  mapUrl?: string;
  latitude?: number;
  longitude?: number;
}

export interface UpdateContactInfoPayload {
  pageTitle?: string;
  imageUrl?: string;
  addressStreet?: string;
  addressCity?: string;
  addressPostalCode?: string;
  phone?: string;
  email?: string;
  openingHoursHeadline?: string;
  openingHoursRows?: { day: string; time: string }[];
  openingHoursSummary?: string;
  mapUrl?: string;
  latitude?: number;
  longitude?: number;
}

export const contactService = {
  get: () => api.get<ContactInfoResponse>("/contact").then((r) => r.data),

  update: (payload: UpdateContactInfoPayload) =>
    api.patch<ContactInfoResponse>("/contact", payload).then((r) => r.data),
};
