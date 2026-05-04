import { toast } from "sonner";

type ErrorLike = unknown;

function extractMessage(error: ErrorLike): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const responseData = (error as { response?: { data?: { message?: unknown } } }).response?.data;
  const message = responseData?.message;
  if (typeof message === "string") return message;
  if (Array.isArray(message)) {
    return message.map((m) => String(m)).join(", ");
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return undefined;
}

function extractRequestId(error: ErrorLike): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const responseData = (error as { response?: { data?: { requestId?: unknown } } }).response?.data;
  const responseHeaders = (error as { response?: { headers?: Record<string, string | undefined> } }).response?.headers;
  const fromBody = responseData?.requestId;
  if (typeof fromBody === "string" && fromBody.trim()) return fromBody;
  const fromHeader = responseHeaders?.["x-request-id"];
  if (typeof fromHeader === "string" && fromHeader.trim()) return fromHeader;
  return undefined;
}

export function notifyApiError(
  error: ErrorLike,
  fallbackMessage = "Operation failed",
): void {
  const message = extractMessage(error) ?? fallbackMessage;
  const requestId = extractRequestId(error);
  if (requestId) {
    toast.error(`${message} (requestId: ${requestId})`);
    return;
  }
  toast.error(message);
}
