/**
 * Topology Audit & Auto-Fix Modal
 * Responsive for mobile and desktop screens.
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-800 dark:text-slate-200 my-auto animate-in fade-in zoom-in-95 duration-150 max-h-[90dvh] flex flex-col">
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
              {t.validation}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[38px] min-w-[38px] flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Issue List */}
        <div className="p-3.5 sm:p-4 overflow-y-auto flex-1 space-y-2 text-xs">
          {issues.length === 0 ? (
            <div className="p-6 text-center text-slate-500 dark:text-slate-400">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2.5" />
              <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                {lang === 'ar' ? 'جميع العناصر الهندسية سليمة ومطابقة للمواصفات!' : 'All Geometries Clean & Valid!'}
              </div>
              <div className="text-[11px] mt-1 max-w-sm mx-auto leading-relaxed">
                {lang === 'ar'
                  ? 'لا توجد مضلعات غير مقفلة أو رؤوس مكررة أو أطوال صفرية. المخطط جاهز تماماً للتصدير إلى AutoCAD وCivil 3D وQGIS.'
                  : 'No unclosed polygons, zero-length lines, or duplicate vertices detected. Ready for AutoCAD and GIS export.'}
              </div>
            </div>
          ) : (
            issues.map((issue) => (
              <div
                key={issue.id}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-start gap-2.5"
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
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                    {issue.message}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/40 shrink-0">
          <span className="text-[11px] text-slate-500 font-mono">
            {issues.length} {lang === 'ar' ? 'ملاحظة' : 'Issues Found'}
          </span>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="min-h-[38px] px-3.5 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              {t.close}
            </button>
            {issues.length > 0 && (
              <button
                onClick={() => {
                  onAutoFix();
                  onClose();
                }}
                className="min-h-[38px] px-4 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-semibold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
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
