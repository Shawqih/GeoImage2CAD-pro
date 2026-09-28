/**
 * Android Architecture & GitHub Repository Hub Modal
 * Allows developers to browse, inspect, copy, and download the entire
 * Android Studio Kotlin project and GitHub repository archive.
 * Responsive for mobile and desktop screens.
 */
import React, { useState } from 'react';
import { X, Smartphone, Copy, Check, Download, FileCode, GitBranch, Terminal } from 'lucide-react';
import JSZip from 'jszip';
import { ANDROID_SOURCE_FILES, SourceFile } from '../android/sourceCodeBundle';
import { downloadFile, shareOrDownloadFile } from '../engine/projectStorage';
import { Language, TRANSLATIONS } from '../i18n/translations';

interface AndroidCodeModalProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidCodeModal: React.FC<AndroidCodeModalProps> = ({
  lang,
  isOpen,
  onClose,
}) => {
  const t = TRANSLATIONS[lang];
  const [selectedFile, setSelectedFile] = useState<SourceFile>(ANDROID_SOURCE_FILES[0]);
  const [copied, setCopied] = useState<boolean>(false);
  const [isZipping, setIsZipping] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFullZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();

      // Add each file with proper folder structure
      for (const file of ANDROID_SOURCE_FILES) {
        zip.file(file.path, file.content);
      }

      // Add gradle wrapper properties placeholder
      zip.file(
        'gradle/wrapper/gradle-wrapper.properties',
        `distributionBase=GRADLE_USER_HOME\r\ndistributionPath=wrapper/dists\r\ndistributionUrl=https\\://services.gradle.org/distributions/gradle-8.4-bin.zip\r\nzipStoreBase=GRADLE_USER_HOME\r\nzipStorePath=wrapper/dists\r\n`
      );

      const blob = await zip.generateAsync({ type: 'blob' });
      await shareOrDownloadFile(
        blob,
        'GeoImage2CAD-Pro-Android-Project.zip',
        'application/zip',
        'GeoImage2CAD Pro Android Project'
      );
    } catch (err) {
      console.error('Failed to bundle Android project zip', err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-2 sm:p-4">
      <div className="w-full max-w-5xl h-[92vh] sm:h-[88vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-800 dark:text-slate-200 flex flex-col my-auto">
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                  Android Studio & GitHub Hub
                </h3>
                <span className="hidden md:inline text-[10px] bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 font-mono px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800 whitespace-nowrap">
                  Kotlin MVVM + Clean Architecture
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate hidden sm:block">
                Jetpack Compose, Room, Hilt, OpenCV, and GitHub Actions CI/CD.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDownloadFullZip}
              disabled={isZipping}
              className="min-h-[38px] px-3 py-1.5 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isZipping ? 'Bundling...' : 'Download ZIP'}</span>
            </button>
            <button
              onClick={onClose}
              className="min-h-[38px] min-w-[38px] p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile File Selector Dropdown (< md) */}
        <div className="md:hidden px-3 py-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
            Select Android Source File:
          </label>
          <select
            value={selectedFile.path}
            onChange={(e) => {
              const file = ANDROID_SOURCE_FILES.find((f) => f.path === e.target.value);
              if (file) setSelectedFile(file);
            }}
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs rounded-lg px-2.5 py-1.5 font-mono text-slate-800 dark:text-slate-200"
          >
            {ANDROID_SOURCE_FILES.map((f) => (
              <option key={f.path} value={f.path}>
                {f.path}
              </option>
            ))}
          </select>
        </div>

        {/* Git Setup Banner */}
        <div className="hidden sm:flex px-4 py-2 bg-slate-950 text-slate-300 border-b border-slate-800 items-center justify-between text-xs font-mono shrink-0">
          <div className="flex items-center gap-2 truncate">
            <Terminal className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-slate-400">Git Initializer:</span>
            <span className="text-emerald-400 select-all truncate">
              git init && git add . && git commit -m "Initial commit: GeoImage2CAD Pro"
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-400 shrink-0 ms-2">
            <GitBranch className="w-3.5 h-3.5" />
            <span>branch: main</span>
          </div>
        </div>

        {/* Main Content: File Explorer Sidebar & Code Viewer */}
        <div className="flex-1 flex overflow-hidden">
          {/* File Tree Sidebar (hidden on mobile, shown on md+) */}
          <div className="hidden md:block w-64 border-e border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 overflow-y-auto p-2 space-y-1 shrink-0 text-xs">
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Project Files
            </div>
            {ANDROID_SOURCE_FILES.map((file) => {
              const isSelected = selectedFile.path === file.path;
              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-start px-2.5 py-1.5 rounded-lg flex items-center gap-2 transition-colors font-mono text-[11px] truncate ${
                    isSelected
                      ? 'bg-purple-600 text-white font-medium shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5 shrink-0 opacity-70" />
                  <span className="truncate">{file.path}</span>
                </button>
              );
            })}
          </div>

          {/* Code Viewer Panel */}
          <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-mono text-xs">
            {/* Viewer Header */}
            <div className="px-3 sm:px-4 py-2 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 shrink-0">
              <div className="truncate min-w-0">
                <span className="font-semibold text-slate-200 text-xs truncate block sm:inline">
                  {selectedFile.path}
                </span>
                <span className="text-[11px] text-slate-400 ms-2 hidden lg:inline">
                  — {selectedFile.description}
                </span>
              </div>
              <button
                onClick={handleCopy}
                className="min-h-[32px] px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1.5 transition-colors border border-slate-700 shrink-0 ms-2"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Code Content */}
            <div className="flex-1 overflow-auto p-3 sm:p-4 select-text">
              <pre className="text-slate-300 leading-relaxed font-mono whitespace-pre text-[11px]">
                {selectedFile.content}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
