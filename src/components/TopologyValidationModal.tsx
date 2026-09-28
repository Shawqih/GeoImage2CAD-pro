/**
 * Topology Audit & Auto-Fix Modal
 */
import React from 'react';
import { X, CheckCircle2, AlertTriangle, AlertCircle, Wrench } from 'lucide-react';
import { TopologyIssue } from '../types/cad';
import { Language, TRANSLATIONS } from '../i18n/translations';

interface TopologyValidationModalProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  issues: TopologyIssue[];
  onAutoFix: () => void;
}

export const TopologyValidationModal: React.FC<TopologyValidationModalProps> = ({
  lang,
  isOpen,
  onClose,
  issues,
  onAutoFix,
}) => {
  const t = TRANSLATIONS[lang];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-800 dark:text-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              {t.validation}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Issue List */}
        <div className="p-4 max-h-80 overflow-y-auto space-y-2 text-xs">
          {issues.length === 0 ? (
            <div className="p-6 text-center text-slate-500 dark:text-slate-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                All Geometries Clean & Valid!
              </div>
              <div className="text-[11px] mt-1">
                No unclosed polygons, zero-length lines, or duplicate vertices detected. Ready for AutoCAD and GIS export.
              </div>
            </div>
          ) : (
            issues.map((issue) => (
              <div
                key={issue.id}
                className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-start gap-2.5"
              >
                {issue.severity === 'ERROR' ? (
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>{issue.type}</span>
                    <span className="text-[10px] text-slate-500 font-mono">[{issue.layer}]</span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                    {issue.message}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/40">
          <span className="text-[11px] text-slate-500 font-mono">
            {issues.length} Issues Found
          </span>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
            >
              {t.close}
            </button>
            {issues.length > 0 && (
              <button
                onClick={() => {
                  onAutoFix();
                  onClose();
                }}
                className="px-3.5 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>{t.autoFix}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
