/**
 * exportUtils.ts
 * High-resolution canvas export to PNG, JPEG, and PDF
 */

import { jsPDF } from 'jspdf';
import { DrawingElement } from '../types/whiteboard';
import { renderCanvasScene } from './canvasRenderer';

interface ExportOptions {
  format: 'png' | 'jpeg' | 'pdf';
  roomId: string;
  theme?: 'dark' | 'light';
  quality?: number;
}

/**
 * Creates an offscreen high-res canvas containing all elements on a clean background
 */
function createExportCanvas(
  elements: DrawingElement[],
  theme: 'dark' | 'light' = 'light',
  canvasWidth: number = 1920,
  canvasHeight: number = 1080
): HTMLCanvasElement {
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = canvasWidth;
  exportCanvas.height = canvasHeight;

  const ctx = exportCanvas.getContext('2d');
  if (!ctx) return exportCanvas;

  // Background
  ctx.fillStyle = theme === 'dark' ? '#090d16' : '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // If light theme, adapt pure white/light text/strokes to dark if needed, but render all elements cleanly
  renderCanvasScene(ctx, elements, null, new Map(), null, 1);

  // Subtle watermark in footer
  ctx.save();
  ctx.font = '12px Inter, sans-serif';
  ctx.fillStyle = theme === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)';
  ctx.fillText('Created with CanvasConnect', 24, canvasHeight - 20);
  ctx.restore();

  return exportCanvas;
}

/**
 * Exports the current whiteboard to the requested format and triggers download
 */
export async function exportWhiteboard(
  elements: DrawingElement[],
  options: ExportOptions
): Promise<boolean> {
  try {
    const { format, roomId, theme = 'light' } = options;
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `whiteboard-${roomId}-${timestamp}`;

    const exportCanvas = createExportCanvas(elements, theme, 1920, 1080);

    if (format === 'png') {
      const dataUrl = exportCanvas.toDataURL('image/png');
      downloadDataUrl(dataUrl, `${filename}.png`);
      return true;
    }

    if (format === 'jpeg') {
      const dataUrl = exportCanvas.toDataURL('image/jpeg', 0.95);
      downloadDataUrl(dataUrl, `${filename}.jpg`);
      return true;
    }

    if (format === 'pdf') {
      const imgData = exportCanvas.toDataURL('image/jpeg', 0.95);
      // Landscape A4
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${filename}.pdf`);
      return true;
    }

    return false;
  } catch (err) {
    console.error('Export error:', err);
    throw new Error('Unable to export the whiteboard. Please try again.');
  }
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
