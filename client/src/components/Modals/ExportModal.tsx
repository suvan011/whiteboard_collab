/**
 * ExportModal.tsx
 * Modal for exporting the whiteboard to PNG, JPEG, or PDF formats
 */

import React, { useState } from 'react';
import { Download, FileImage, FileText, Check, X, Loader2 } from 'lucide-react';
import { DrawingElement } from '../../types/whiteboard';
import { exportWhiteboard } from '../../utils/exportUtils';

interface ExportModalProps {
  isOpen: boolean;
  roomId: string;
  elements: DrawingElement[];
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  roomId,
  elements,
  onClose,
  onSuccess,
  onError,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'png' | 'jpeg' | 'pdf'>('png');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportWhiteboard(elements, {
        format: selectedFormat,
        roomId,
        theme,
      });
      onSuccess('Whiteboard exported successfully!');
      onClose();
    } catch (err) {
      onError('Unable to export the whiteboard. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md p-6 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl animate-scale-in text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 mb-5">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
            <Download className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Export Whiteboard</h3>
            <p className="text-xs text-slate-400">Save your collaborative canvas locally in high resolution.</p>
          </div>
        </div>

        {/* Format Selector */}
        <div className="mb-5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Select Format
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => setSelectedFormat('png')}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition-all ${
                selectedFormat === 'png'
                  ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-md shadow-blue-500/10'
                  : 'bg-slate-800/60 border-slate-700 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <FileImage className="w-5 h-5 mb-1 text-blue-400" />
              <span>PNG</span>
              <span className="text-[10px] text-slate-400">Crisp Image</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFormat('jpeg')}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition-all ${
                selectedFormat === 'jpeg'
                  ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-md shadow-blue-500/10'
                  : 'bg-slate-800/60 border-slate-700 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <FileImage className="w-5 h-5 mb-1 text-amber-400" />
              <span>JPEG</span>
              <span className="text-[10px] text-slate-400">Compact</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFormat('pdf')}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition-all ${
                selectedFormat === 'pdf'
                  ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-md shadow-blue-500/10'
                  : 'bg-slate-800/60 border-slate-700 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <FileText className="w-5 h-5 mb-1 text-emerald-400" />
              <span>PDF</span>
              <span className="text-[10px] text-slate-400">Document</span>
            </button>
          </div>
        </div>

        {/* Background Theme Selector */}
        <div className="mb-6">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Canvas Background
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                theme === 'light'
                  ? 'bg-white text-slate-900 border-white font-semibold'
                  : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="w-3.5 h-3.5 rounded-full bg-slate-100 border border-slate-300" />
              Light (Print Friendly)
            </button>

            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                theme === 'dark'
                  ? 'bg-slate-950 text-white border-blue-500 font-semibold'
                  : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="w-3.5 h-3.5 rounded-full bg-slate-900 border border-slate-700" />
              Dark Theme
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {isExporting ? 'Exporting...' : `Download ${selectedFormat.toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
};
