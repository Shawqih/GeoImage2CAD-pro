/**
 * Enhanced CAD & GIS Multi-Format Export Modal
 * Provides direct downloads, Mobile Share sheet integration (Android/iOS),
 * and 1-Click Code Inspector for AutoCAD DXF R2013+, ESRI Shapefile Bundle (.zip),
 * GeoJSON, Google Earth KML, SVG, and CSV.
 */
import React, { useState } from 'react';
import {
  X,
  Download,
  FileCode,
  Layers,
  MapPin,
  Table,
  Image as ImageIcon,
  Copy,
  Check,
  Code2,
  Share2,
  CheckCircle,
} from 'lucide-react';
import { CADFeature, CADLayer, GeoreferenceInfo, ScaleCalibration } from '../types/cad';
import { generateDXF } from '../engine/dxfWriter';
import {
  generateCSV,
  generateGeoJSON,
  generateKML,
  generateShapefileZip,
  generateSVG,
} from '../engine/gisExporters';
import { downloadFile, shareOrDownloadFile } from '../engine/projectStorage';
import { Language, TRANSLATIONS } from '../i18n/translations';

interface ExportModalProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  features: CADFeature[];
  layers: CADLayer[];
  scaleCalibration: ScaleCalibration;
  georeference: GeoreferenceInfo;
  imageWidth: number;
  imageHeight: number;
  projectName: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  lang,
  isOpen,
  onClose,
  features,
  layers,
  scaleCalibration,
  georeference,
  imageWidth,
  imageHeight,
  projectName,
}) => {
  const t = TRANSLATIONS[lang];
  const [isExportingShp, setIsExportingShp] = useState(false);
  const [previewContent, setPreviewContent] = useState<{ title: string; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeDownloadId, setActiveDownloadId] = useState<string | null>(null);

  if (!isOpen) return null;

  const baseFileName = projectName.replace(/\.[^/.]+$/, '').replace(/\s+/g, '_') || 'GeoImage2CAD_Plan';

  const markDownloaded = (id: string) => {
    setActiveDownloadId(id);
    setTimeout(() => setActiveDownloadId(null), 2000);
  };

  // 1. Export DXF
  const handleExportDXF = () => {
    const dxfString = generateDXF(features, layers, {
      acadVersion: 'AC1027',
      invertY: true,
      imageHeight,
      scaleCalibration,
    });
    downloadFile(dxfString, `${baseFileName}.dxf`, 'application/dxf');
    markDownloaded('dxf');
  };

  const handleShareDXF = async () => {
    const dxfString = generateDXF(features, layers, {
      acadVersion: 'AC1027',
      invertY: true,
      imageHeight,
      scaleCalibration,
    });
    await shareOrDownloadFile(dxfString, `${baseFileName}.dxf`, 'application/dxf', 'CAD DXF Plan');
    markDownloaded('dxf');
  };

  const handlePreviewDXF = () => {
    const dxfString = generateDXF(features, layers, {
      acadVersion: 'AC1027',
      invertY: true,
      imageHeight,
      scaleCalibration,
    });
    setPreviewContent({ title: `${baseFileName}.dxf (AutoCAD R2013+)`, text: dxfString });
  };

  // 2. Export Shapefile ZIP
  const handleExportShapefile = async () => {
    setIsExportingShp(true);
    try {
      const zipBlob = await generateShapefileZip(
        features,
        layers,
        scaleCalibration,
        georeference,
        imageHeight
      );
      downloadFile(zipBlob, `${baseFileName}_Shapefile.zip`, 'application/zip');
      markDownloaded('shp');
    } catch (err) {
      console.error('Failed to create shapefile zip', err);
    } finally {
      setIsExportingShp(false);
    }
  };

  const handleShareShapefile = async () => {
    setIsExportingShp(true);
    try {
      const zipBlob = await generateShapefileZip(
        features,
        layers,
        scaleCalibration,
        georeference,
        imageHeight
      );
      await shareOrDownloadFile(
        zipBlob,
        `${baseFileName}_Shapefile.zip`,
        'application/zip',
        'ESRI Shapefile Bundle'
      );
      markDownloaded('shp');
    } catch (err) {
      console.error('Failed to share shapefile zip', err);
    } finally {
      setIsExportingShp(false);
    }
  };

  // 3. Export GeoJSON
  const handleExportGeoJSON = () => {
    const geoJson = generateGeoJSON(features, scaleCalibration, georeference, imageHeight);
    downloadFile(geoJson, `${baseFileName}.geojson`, 'application/geo+json');
    markDownloaded('geojson');
  };

  const handleShareGeoJSON = async () => {
    const geoJson = generateGeoJSON(features, scaleCalibration, georeference, imageHeight);
    await shareOrDownloadFile(geoJson, `${baseFileName}.geojson`, 'application/geo+json', 'GeoJSON Plan');
    markDownloaded('geojson');
  };

  const handlePreviewGeoJSON = () => {
    const geoJson = generateGeoJSON(features, scaleCalibration, georeference, imageHeight);
    setPreviewContent({ title: `${baseFileName}.geojson (GeoJSON RFC 7946)`, text: geoJson });
  };

  // 4. Export KML
  const handleExportKML = () => {
    const kml = generateKML(features, layers, scaleCalibration, georeference, imageHeight);
    downloadFile(kml, `${baseFileName}.kml`, 'application/vnd.google-earth.kml+xml');
    markDownloaded('kml');
  };

  const handlePreviewKML = () => {
    const kml = generateKML(features, layers, scaleCalibration, georeference, imageHeight);
    setPreviewContent({ title: `${baseFileName}.kml (Google Earth KML 2.2)`, text: kml });
  };

  // 5. Export SVG
  const handleExportSVG = () => {
    const svg = generateSVG(features, layers, imageWidth, imageHeight);
    downloadFile(svg, `${baseFileName}.svg`, 'image/svg+xml');
    markDownloaded('svg');
  };

  const handlePreviewSVG = () => {
    const svg = generateSVG(features, layers, imageWidth, imageHeight);
    setPreviewContent({ title: `${baseFileName}.svg (Vector SVG Graphic)`, text: svg });
  };

  // 6. Export CSV
  const handleExportCSV = () => {
    const csv = generateCSV(features, scaleCalibration);
    downloadFile(csv, `${baseFileName}_attributes.csv`, 'text/csv');
    markDownloaded('csv');
  };

  const handlePreviewCSV = () => {
    const csv = generateCSV(features, scaleCalibration);
    setPreviewContent({ title: `${baseFileName}_attributes.csv (WKT & Attributes)`, text: csv });
  };

  const handleCopyPreview = () => {
    if (previewContent) {
      navigator.clipboard.writeText(previewContent.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const exportFormats = [
    {
      id: 'dxf',
      name: 'AutoCAD DXF R2013+',
      ext: '.dxf',
      icon: FileCode,
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
      tag: 'AC1027 Standard',
      desc: lang === 'ar' ? 'مخطط أوتوكاد متوافق مع AutoCAD وCivil 3D وQCAD وBricsCAD مع طبقات حقيقية' : 'Production AutoCAD format for AutoCAD, Civil 3D, and QCAD with true layers',
      onDownload: handleExportDXF,
      onShare: handleShareDXF,
      onPreview: handlePreviewDXF,
    },
    {
      id: 'shp',
      name: 'ESRI Shapefile Bundle',
      ext: '.zip',
      icon: Layers,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
      tag: '.shp + .shx + .dbf + .prj',
      desc: lang === 'ar' ? 'حزمة شيب فايل كاملة للمضلعات والخطوط والنقاط مع ملف الإسقاط وقواعد البيانات' : 'Full Shapefile package for Polygons, Lines, and Points with DBF attributes',
      onDownload: handleExportShapefile,
      onShare: handleShareShapefile,
      isLoading: isExportingShp,
    },
    {
      id: 'geojson',
      name: 'GeoJSON FeatureCollection',
      ext: '.geojson',
      icon: MapPin,
      color: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
      tag: 'RFC 7946 Standard',
      desc: lang === 'ar' ? 'صيغة البيانات الجغرافية المعيارية للويب وQGIS وMapbox' : 'Standard web GIS vector format for web apps, QGIS, and Leaflet',
      onDownload: handleExportGeoJSON,
      onShare: handleShareGeoJSON,
      onPreview: handlePreviewGeoJSON,
    },
    {
      id: 'kml',
      name: 'Google Earth KML',
      ext: '.kml',
      icon: MapPin,
      color: 'text-red-500 bg-red-500/10 border-red-500/30',
      tag: 'OGC KML 2.2',
      desc: lang === 'ar' ? 'ملف خرائط جوجل إيرث للعرض ثلاثي الأبعاد وإسقاط المعالم الجوية' : 'Google Earth 3D vector map overlay with polygon styling and metadata',
      onDownload: handleExportKML,
      onShare: handleExportKML,
      onPreview: handlePreviewKML,
    },
    {
      id: 'svg',
      name: 'Scalable Vector Graphics',
      ext: '.svg',
      icon: ImageIcon,
      color: 'text-purple-500 bg-purple-500/10 border-purple-500/30',
      tag: 'W3C Vector',
      desc: lang === 'ar' ? 'رسم متجهي عالي الدقة مقسم إلى مجموعات طبقات للتصميم والطباعة' : 'Layer-grouped vector graphic for Adobe Illustrator, CorelDraw, and Inkscape',
      onDownload: handleExportSVG,
      onShare: handleExportSVG,
      onPreview: handlePreviewSVG,
    },
    {
      id: 'csv',
      name: 'Attribute Table & WKT',
      ext: '.csv',
      icon: Table,
      color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/30',
      tag: 'Well-Known Text',
      desc: lang === 'ar' ? 'جدول السمات الهندسية الشامل (المساحات، الأطوال، المعاملات، وهندسة WKT)' : 'Comprehensive attributes spreadsheet with areas, lengths, and WKT geometries',
      onDownload: handleExportCSV,
      onShare: handleExportCSV,
      onPreview: handlePreviewCSV,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center text-blue-600">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {t.exportModalTitle}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {features.length} {t.featuresCount} · {layers.length} Layers · {baseFileName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {exportFormats.map((fmt) => {
              const Icon = fmt.icon;
              const isDownloaded = activeDownloadId === fmt.id;

              return (
                <div
                  key={fmt.id}
                  className="p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-lg border ${fmt.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                            {fmt.name}
                          </h3>
                          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                            {fmt.ext}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 whitespace-nowrap">
                        {fmt.tag}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                      {fmt.desc}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-slate-200 dark:border-slate-800/80">
                    <button
                      onClick={fmt.onDownload}
                      disabled={fmt.isLoading}
                      className="flex-1 min-h-[40px] px-3 py-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {isDownloaded ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-emerald-300" />
                          <span>{lang === 'ar' ? 'تم التصدير!' : 'Exported!'}</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span>{fmt.isLoading ? '...' : lang === 'ar' ? 'تصدير الملف' : 'Download'}</span>
                        </>
                      )}
                    </button>

                    {fmt.onShare && (
                      <button
                        onClick={fmt.onShare}
                        className="min-h-[40px] min-w-[40px] px-2.5 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium transition-colors flex items-center justify-center"
                        title={lang === 'ar' ? 'مشاركة عبر الجوال' : 'Share File'}
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    )}

                    {fmt.onPreview && (
                      <button
                        onClick={fmt.onPreview}
                        className="min-h-[40px] px-2.5 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
                        title={lang === 'ar' ? 'معاينة ونسخ الكود' : 'Preview & Copy'}
                      >
                        <Code2 className="w-3.5 h-3.5" />
                        <span className="text-[11px] hidden sm:inline">{lang === 'ar' ? 'معاينة' : 'Code'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Interactive Code / File Inspector Modal */}
          {previewContent && (
            <div className="mt-4 p-4 rounded-xl border border-blue-500/30 bg-slate-950 text-slate-200 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-mono font-semibold text-white truncate max-w-[280px] sm:max-w-md">
                    {previewContent.title}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyPreview}
                    className="min-h-[34px] px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? (lang === 'ar' ? 'تم النسخ!' : 'Copied!') : (lang === 'ar' ? 'نسخ الكل' : 'Copy All')}</span>
                  </button>
                  <button
                    onClick={() => setPreviewContent(null)}
                    className="min-h-[34px] min-w-[34px] p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-3 relative">
                <pre className="font-mono text-[11px] leading-relaxed max-h-60 overflow-y-auto bg-slate-900 p-3 rounded-lg border border-slate-800 select-all scrollbar-thin text-slate-300">
                  {previewContent.text.slice(0, 15000)}
                  {previewContent.text.length > 15000 && '\n\n... [Content truncated for preview: full file will be saved on download or copy]'}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>{lang === 'ar' ? 'جاهز للاستيراد في AutoCAD، QGIS، ArcGIS، وCivil 3D' : 'Ready for AutoCAD, QGIS, ArcGIS, & Civil 3D'}</span>
          <button
            onClick={onClose}
            className="min-h-[36px] px-4 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg font-medium transition-colors"
          >
            {lang === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
