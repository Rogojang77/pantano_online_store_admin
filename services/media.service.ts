import api from "./api";
import type { PaginatedResponse } from "@/types/api";

export interface MediaItem {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  alt: string | null;
  folder: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListMediaParams {
  page?: number;
  limit?: number;
  folder?: string;
  mimeType?: string;
  search?: string;
}

export interface UpdateMediaPayload {
  alt?: string;
  originalName?: string;
  folder?: string;
}

export const mediaService = {
  upload: (file: File, options?: { alt?: string; folder?: string }) => {
    const formData = new FormData();
    formData.append("file", file);
    if (options?.alt != null) formData.append("alt", options.alt);
    if (options?.folder != null) formData.append("folder", options.folder);
    return api.post<MediaItem>("/media/upload", formData).then((r) => r.data);
  },

  getList: (params?: ListMediaParams) =>
    api
      .get<PaginatedResponse<MediaItem>>("/media", { params })
      .then((r) => r.data),

  getById: (id: string) =>
    api.get<MediaItem>(`/media/${id}`).then((r) => r.data),

  update: (id: string, payload: UpdateMediaPayload) =>
    api.patch<MediaItem>(`/media/${id}`, payload).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/media/${id}`).then((r) => r.data),
};
