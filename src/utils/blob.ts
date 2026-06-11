/**
 * Shared helpers for converting stored base64 data URLs to Blob URLs
 * and triggering file downloads.
 *
 * Large PDFs must be rendered from Blob URLs — data URLs hit size limits
 * in iframes/objects (see CLAUDE.md).
 */

const dataUrlToBlob = (dataUrl: string): Blob | null => {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const [, mimeType, base64Data] = match;
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
};

/**
 * Convert a base64 data URL to a Blob URL. Falls back to returning the
 * data URL unchanged if it isn't in the expected format.
 * Caller is responsible for URL.revokeObjectURL when done.
 */
export const dataUrlToBlobUrl = (dataUrl: string): string => {
  const blob = dataUrlToBlob(dataUrl);
  if (!blob) {
    console.error('Invalid data URL format');
    return dataUrl;
  }
  return URL.createObjectURL(blob);
};

/**
 * Trigger a browser download of a base64 data URL.
 * Returns false if the data URL is malformed.
 */
export const downloadDataUrl = (dataUrl: string, filename: string): boolean => {
  const blob = dataUrlToBlob(dataUrl);
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
};
