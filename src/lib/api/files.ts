import type { AxiosInstance, AxiosProgressEvent } from "axios";
import type { Envelope } from "./envelope";

type SignedLink = { url: string; expires_in: number };

/**
 * Private files open only through a signed URL that expires (10 minutes), so a fresh link is
 * requested on every click. The tab is opened first, synchronously, to avoid popup blockers.
 */
export async function openSignedLink(fetchLink: () => Promise<Envelope<SignedLink>>) {
  const tab = window.open("about:blank", "_blank");
  try {
    const { data } = await fetchLink();
    if (tab) {
      tab.opener = null;
      tab.location.href = data.url;
    } else {
      window.location.assign(data.url);
    }
  } catch (error) {
    tab?.close();
    throw error;
  }
}

/** Authenticated CSV export (streamed by the API) saved as a file. */
export async function downloadFile(api: AxiosInstance, path: string, filename: string) {
  const res = await api.get<Blob>(path, { responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** multipart/form-data upload with the exact field names each endpoint documents (usually `file`). */
export async function uploadMultipart<T>(
  api: AxiosInstance,
  path: string,
  fields: Record<string, string | Blob>,
  opts: { onProgress?: (percent: number) => void; headers?: Record<string, string> } = {},
) {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) form.append(name, value);
  const res = await api.post<Envelope<T>>(path, form, {
    headers: opts.headers,
    onUploadProgress: (e: AxiosProgressEvent) => {
      if (e.total) opts.onProgress?.(Math.round((e.loaded / e.total) * 100));
    },
  });
  return res.data.data;
}
