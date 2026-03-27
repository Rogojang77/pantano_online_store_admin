import type { AxiosError } from "axios";
import type { UseFormSetError, FieldValues, Path } from "react-hook-form";

interface BackendValidationError {
  statusCode: number;
  message: string | string[];
  error?: string;
}

const FIELD_ERROR_PATTERNS: Record<string, string> = {
  slug: "slug",
  sku: "sku",
  name: "name",
  categoryId: "categoryId",
  brandId: "brandId",
};

export function mapApiErrorToForm<T extends FieldValues>(
  err: unknown,
  setError: UseFormSetError<T>,
): string {
  const axiosErr = err as AxiosError<BackendValidationError>;
  const data = axiosErr?.response?.data;
  const status = axiosErr?.response?.status;

  if (status === 409 && typeof data?.message === "string") {
    const msg = data.message.toLowerCase();
    if (msg.includes("slug")) {
      setError("slug" as Path<T>, { type: "server", message: data.message });
      return data.message;
    }
    if (msg.includes("sku")) {
      setError("sku" as Path<T>, { type: "server", message: data.message });
      return data.message;
    }
    return data.message;
  }

  if (status === 400 && data) {
    const messages = Array.isArray(data.message) ? data.message : [data.message];
    let mapped = false;
    for (const msg of messages) {
      if (typeof msg !== "string") continue;
      const lower = msg.toLowerCase();
      for (const [keyword, field] of Object.entries(FIELD_ERROR_PATTERNS)) {
        if (lower.includes(keyword)) {
          setError(field as Path<T>, { type: "server", message: msg });
          mapped = true;
          break;
        }
      }
    }
    if (mapped) return messages.join(". ");
    return messages.join(". ") || "Validation failed.";
  }

  if (!axiosErr?.response) return "Network error. Please check your connection.";
  return typeof data?.message === "string" ? data.message : "An unexpected error occurred.";
}
