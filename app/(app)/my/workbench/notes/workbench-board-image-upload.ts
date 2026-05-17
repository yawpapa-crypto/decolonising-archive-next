const MAX_BOARD_IMAGE_BYTES = 5 * 1024 * 1024;
/** Data URLs inflate payload size — keep fallback uploads smaller. */
const MAX_DATA_URL_FALLBACK_BYTES = 4 * 1024 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Could not read image file."));
    };
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}

async function uploadBoardImageToApi(file: File, noteId: string | null): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("noteId", noteId || "temp");
  const res = await fetch("/api/workbench/notes/upload-image", { method: "POST", body: form });
  const data = (await res.json()) as { url?: string; error?: string; details?: string };
  if (!res.ok || !data.url) {
    throw new Error(data.error || data.details || "Could not upload image.");
  }
  return data.url;
}

/**
 * Resolves an image URL for board cards — prefers hosted upload, falls back to data URL.
 */
export async function resolveBoardImageUpload(file: File, noteId: string | null): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file (PNG, JPG, GIF, or WebP).");
  }
  if (file.size > MAX_BOARD_IMAGE_BYTES) {
    throw new Error("Image must be 5MB or smaller.");
  }

  try {
    return await uploadBoardImageToApi(file, noteId);
  } catch {
    if (file.size > MAX_DATA_URL_FALLBACK_BYTES) {
      throw new Error(
        "Image is too large for local preview. Use a file under 4MB or try again when upload is available.",
      );
    }
    // TODO: Replace data URL fallback with Supabase Storage upload and return hosted image URL.
    return readFileAsDataUrl(file);
  }
}
