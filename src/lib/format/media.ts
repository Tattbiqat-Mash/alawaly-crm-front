/** A stored media path or URL → something an <img> or link can load (stored paths go through /bff/media). */
export function mediaUrl(value: string | null | undefined): string | null {
  const v = value?.trim();
  if (!v) return null;
  if (/^(https?:)?\/\//i.test(v) || v.startsWith("data:")) return v;
  return `/bff/media/${v.replace(/^\/+/, "").split("/").map(encodeURIComponent).join("/")}`;
}

const IMAGE_EXT = /\.(avif|gif|jpe?g|png|svg|webp)(\?.*)?$/i;
export const isImagePath = (value: string) => IMAGE_EXT.test(value);

/** Last path segment, for a readable label. */
export const fileName = (value: string) => decodeURIComponent(value.split("?")[0].split("/").filter(Boolean).pop() ?? value);
