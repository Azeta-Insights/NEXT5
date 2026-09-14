import React, { useState } from 'react';
import { 
  Download, 
  Upload, 
  Trash2, 
  Check, 
  ShieldCheck, 
  X, 
  AlertCircle, 
  Database
} from 'lucide-react';
import { StorageService } from '../lib/storage';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataRestored: () => void;
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  isOpen,
  onClose,
  onDataRestored,
}) => {
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExportJSON = () => {
    try {
      const exportData = {
        app: 'NEXT5 Priority & Decision Support Engine',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        user: StorageService.getUser(),
        goals: StorageService.getGoals(),
        dailyContext: StorageService.getDailyContext(),
        recommendations: StorageService.getRecommendations(),
        memory: StorageService.getMemory(),
        feedback: StorageService.getFeedback(),
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `next5_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setImportStatus('Backup downloaded successfully.');
      setTimeout(() => setImportStatus(null), 3000);
    } catch (e: any) {
      setErrorStatus('Failed to generate export file: ' + e.message);
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = e.target.files?.[0];
    if (!file) return;

    fileReader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed.goals && !parsed.memory) {
          throw new Error('Invalid NEXT5 backup file format.');
        }

        if (parsed.user) StorageService.saveUser(parsed.user);
        if (parsed.goals) StorageService.saveGoals(parsed.goals);
        if (parsed.dailyContext) StorageService.saveDailyContext(parsed.dailyContext);
        if (parsed.recommendations) StorageService.saveRecommendations(parsed.recommendations);
        if (parsed.memory) StorageService.saveMemory(parsed.memory);
        if (parsed.feedback) {
          localStorage.setItem('next5_feedback', JSON.stringify(parsed.feedback));
        }
        StorageService.setOnboardingComplete(true);

        setImportStatus('Data successfully restored! Reloading workspace...');
        setTimeout(() => {
          onDataRestored();
          onClose();
        }, 1200);
      } catch (err: any) {
        setErrorStatus('Import failed: ' + (err.message || 'Corrupt JSON file'));
      }
    };
    fileReader.readAsText(file);
  };

  const handleFactoryReset = () => {
    if (confirm('CRITICAL: Are you sure you want to erase all local data, memory patterns, goals, and history? This cannot be undone unless you have an exported backup.')) {
      StorageService.resetAll();
      onDataRestored();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-slate-950 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-800 flex flex-col gap-4 text-slate-100 selection:bg-emerald-500/20 selection:text-emerald-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-800 text-emerald-400 flex items-center justify-center border border-slate-700">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-100 text-base font-mono">Data Sovereignty & Backups</h3>
              <p className="text-xs text-slate-400">You own 100% of your data. Export or restore anytime.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Alerts */}
        {importStatus && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0 stroke-[3]" />
            <span>{importStatus}</span>
          </div>
        )}

        {errorStatus && (
          <div className="p-3 bg-rose-950/60 border border-rose-800/40 text-rose-300 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorStatus}</span>
          </div>
        )}

        {/* Transparency note */}
        <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
          <div className="font-bold text-slate-100 flex items-center gap-1.5 font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            No Vendor Lock-In
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            All your confirmed goals, behavioral preferences, daily reflections, and priority history can be exported as a standard unencrypted JSON file anytime.
          </p>
        </div>

        {/* Options */}
        <div className="space-y-2.5">
          {/* Export */}
          <button
            onClick={handleExportJSON}
            className="w-full p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 transition flex items-center justify-between text-left shadow-xs cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-800 text-emerald-400 flex items-center justify-center shrink-0 border border-slate-700">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-100 block">Export Full Backup (.JSON)</span>
                <span className="text-[11px] text-slate-400">Goals, preferences, history & reflections</span>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-400 font-mono">Download</span>
          </button>

          {/* Import */}
          <label className="w-full p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 transition flex items-center justify-between text-left shadow-xs cursor-pointer group">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center shrink-0 border border-slate-700 group-hover:text-emerald-400">
                <Upload className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-100 block">Restore from Backup (.JSON)</span>
                <span className="text-[11px] text-slate-400">Upload and merge an existing backup file</span>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-300 font-mono">Select File</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>
        </div>

        {/* Danger zone: reset */}
        <div className="pt-2 border-t border-slate-800">
          <button
            onClick={handleFactoryReset}
            className="w-full py-2.5 px-3 rounded-xl border border-rose-800/40 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            Wipe Workspace & Reset to Fresh Onboarding
          </button>
        </div>
      </div>
    </div>
  );
};
