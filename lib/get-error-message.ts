export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;

  if (typeof error === "string") return error;

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  // Catch browser/React Event objects (e.g. MouseEvent, ErrorEvent, ProgressEvent)
  // without referencing the Event global directly (which may not exist in SSR).
  if (
    error &&
    typeof error === "object" &&
    "type" in error &&
    "target" in error
  ) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getErrorMessage] Received Event-like object instead of Error:", error);
    }
    return "Something went wrong while handling this action.";
  }

  return "Something went wrong.";
}
