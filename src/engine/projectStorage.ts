/**
 * Project Storage, Download, and Mobile Sharing Helpers
 * Highly reliable download & sharing trigger across desktop, mobile browsers, iOS, and Android.
 */
import { ProjectData } from '../types/cad';

const STORAGE_KEY = 'geoimage2cad_current_project';

export function saveProjectToLocalStorage(project: ProjectData): void {
  try {
    const serialized = JSON.stringify(project);
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (e) {
    console.warn('LocalStorage limit reached; project remains active in memory', e);
  }
}

export function loadProjectFromLocalStorage(): ProjectData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

/**
 * Universal file download function that works across Desktop, Android, and iOS browsers.
 */
export function downloadFile(
  content: string | Blob | ArrayBuffer,
  filename: string,
  mimeType: string = 'application/octet-stream'
): void {
  let blob: Blob;
  if (content instanceof Blob) {
    blob = content;
  } else if (content instanceof ArrayBuffer) {
    blob = new Blob([content], { type: mimeType });
  } else {
    blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  }

  // Check for Microsoft Internet Explorer / Legacy Edge
  if ((window.navigator as any).msSaveOrOpenBlob) {
    (window.navigator as any).msSaveOrOpenBlob(blob, filename);
    return;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';

  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    try {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Ignore if element already detached
    }
  }, 1500);
}

/**
 * Shares a file using the Web Share API (native share sheet on Android / iOS)
 * or falls back to standard download if Web Share is not supported.
 */
export async function shareOrDownloadFile(
  content: string | Blob | ArrayBuffer,
  filename: string,
  mimeType: string = 'application/octet-stream',
  title: string = 'GeoImage2CAD Export'
): Promise<boolean> {
  let blob: Blob;
  if (content instanceof Blob) {
    blob = content;
  } else if (content instanceof ArrayBuffer) {
    blob = new Blob([content], { type: mimeType });
  } else {
    blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  }

  try {
    const file = new File([blob], filename, { type: mimeType });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title,
        text: `Exported from GeoImage2CAD Pro: ${filename}`,
      });
      return true;
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      // User cancelled share sheet
      return true;
    }
    console.warn('Web Share failed, falling back to direct download', err);
  }

  // Fallback to direct download
  downloadFile(blob, filename, mimeType);
  return false;
}
