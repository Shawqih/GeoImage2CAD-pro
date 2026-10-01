/**
 * Project Storage, Download, and Mobile Sharing Helpers
 * Highly reliable download & sharing trigger across desktop, mobile browsers, iOS, and Android.
 */
import { ProjectData } from '../types/cad';

const STORAGE_KEY = 'geoimage2cad_current_project';

async function saveThroughAndroidBridge(blob: Blob, filename: string, mimeType: string): Promise<boolean> {
  const bridge = (window as Window & {
    AndroidBridge?: { saveFile: (base64Data: string, filename: string, mimeType: string) => string };
  }).AndroidBridge;
  if (!bridge?.saveFile) return false;
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + 0x8000, bytes.length)));
  }
  const result = bridge.saveFile(btoa(binary), filename, mimeType);
  if (result !== 'OK') throw new Error(result || 'Android MediaStore rejected the file');
  return true;
}

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
export async function downloadFile(
  content: string | Blob | ArrayBuffer,
  filename: string,
  mimeType: string = 'application/octet-stream'
): Promise<void> {
  let blob: Blob;
  if (content instanceof Blob) {
    blob = content;
  } else if (content instanceof ArrayBuffer) {
    blob = new Blob([content], { type: mimeType });
  } else {
    blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  }

  if (await saveThroughAndroidBridge(blob, filename, mimeType)) return;

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
  await downloadFile(blob, filename, mimeType);
  return false;
}
