/**
 * Vector Conversion Pipeline Progress Modal
 * Displays real-time progress steps, stage descriptions, and percent completion.
 */
import React from 'react';
import { Cpu, Check } from 'lucide-react';
import { Language } from '../i18n/translations';

interface ProcessingProgressModalProps {
  lang: Language;
  isOpen: boolean;
  stage: string;
  percent: number;
}

export const ProcessingProgressModal: React.FC<ProcessingProgressModalProps> = ({
  isOpen,
  stage,
  percent,
}) => {
  if (!isOpen) return null;

  const steps = [
    { label: 'Image Preprocessing & Analysis', threshold: 10 },
    { label: 'Semantic & Instance Segmentation', threshold: 25 },
    { label: 'Building Extraction & Orthogonalization', threshold: 45 },
    { label: 'Road Corridors & Centerlines', threshold: 65 },
    { label: 'Trees, Vegetation & Water Bodies', threshold: 75 },
    { label: 'CAD Geometry Regularization & Topology', threshold: 90 },
    { label: 'CAD Layer Generation & DXF Assembly', threshold: 100 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 select-none">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-800 dark:text-slate-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-600/20 text-blue-600 flex items-center justify-center animate-pulse">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              GeoImage2CAD Processing Pipeline
            </h3>
            <p className="text-xs text-slate-500 font-mono">
              On-Device Computer Vision & AI Vectorization
            </p>
          </div>
        </div>

        {/* Current Stage */}
        <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2 truncate">
          {stage || 'Processing image data...'}
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-4 border border-slate-200 dark:border-slate-700">
          <div
            className="h-full bg-blue-600 transition-all duration-200 ease-out"
            style={{ width: `${Math.min(100, Math.max(5, percent))}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-xs font-mono tabular-nums text-slate-500 mb-5">
          <span>Processing Step</span>
          <span className="font-bold text-slate-900 dark:text-white">{percent}%</span>
        </div>

        {/* Steps Checkmarks */}
        <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-3">
          {steps.map((st, i) => {
            const isDone = percent >= st.threshold;
            const isCurrent = percent < st.threshold && (i === 0 || percent >= steps[i - 1].threshold);

            return (
              <div
                key={st.label}
                className={`flex items-center gap-2 text-[11px] transition-colors ${
                  isDone
                    ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                    : isCurrent
                    ? 'text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-slate-400 dark:text-slate-600'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border text-[9px] ${
                    isDone
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : isCurrent
                      ? 'border-blue-600 text-blue-600 animate-spin'
                      : 'border-slate-300 dark:border-slate-700'
                  }`}
                >
                  {isDone ? <Check className="w-2.5 h-2.5" /> : isCurrent ? '○' : ''}
                </div>
                <span>{st.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
