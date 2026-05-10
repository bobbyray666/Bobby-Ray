import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Download, 
  X, 
  Loader2, 
  Check, 
  BrainCircuit, 
  Layers, 
  FileCode,
  Info 
} from 'lucide-react';
import JSZip from 'jszip';
import { getAppFiles } from '../services/firestoreService';
import { generateNotebookLMKnowledgeBase, AppData } from '../services/gemini';
import { cn } from '../lib/utils';

interface BulkExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProjects: any[];
  onComplete: () => void;
}

export default function BulkExportModal({ isOpen, onClose, selectedProjects, onComplete }: BulkExportModalProps) {
  const [step, setStep] = useState<'config' | 'exporting' | 'complete'>('config');
  const [progress, setProgress] = useState(0);
  const [currentAction, setCurrentAction] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const [settings, setSettings] = useState({
    includeContext: true,
    includeHistory: false,
    individualGrounding: true
  });

  const handleExport = async () => {
    setStep('exporting');
    setError(null);
    setProgress(0);
    
    try {
      const zip = new JSZip();
      const totalSteps = selectedProjects.length * 2 + 1;
      let completedSteps = 0;

      for (const project of selectedProjects) {
        setCurrentAction(`Fetching files for ${project.name}...`);
        const files = await getAppFiles(project.id);
        completedSteps++;
        setProgress((completedSteps / totalSteps) * 100);

        if (settings.includeContext) {
          setCurrentAction(`Generating AI Context for ${project.name}...`);
          const appData: AppData = {
            id: project.id,
            name: project.name,
            version: project.version || 'v1.0.0',
            description: project.description,
            techStack: project.techStack,
            files: files || []
          };
          const kb = await generateNotebookLMKnowledgeBase(appData);
          zip.file(`${project.name.replace(/\s+/g, '_')}_CONTEXT.md`, kb);
          completedSteps++;
          setProgress((completedSteps / totalSteps) * 100);
        }

        if (settings.individualGrounding && files) {
          files.forEach(f => {
            zip.file(`${project.name.replace(/\s+/g, '_')}/${f.path}`, f.content);
          });
        }
      }

      setCurrentAction('Finalizing archive...');
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AI_Studio_Vault_Export_${new Date().toISOString().split('T')[0]}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      
      setProgress(100);
      setStep('complete');
    } catch (err: any) {
      setError(err.message || 'Export failed');
      setStep('config');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-app-bg/90 backdrop-blur-md"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-app-surface border border-app-border rounded-3xl p-8 shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                  <Download className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-app-text">Vault Export Manager</h3>
                  <p className="text-app-subtext text-sm">Optimizing {selectedProjects.length} projects for NotebookLM</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-app-hover rounded-xl transition-colors"
              >
                <X className="w-6 h-6 text-app-subtext" />
              </button>
            </div>

            {step === 'config' && (
              <div className="space-y-6">
                {/* Project List */}
                <div className="bg-app-bg rounded-2xl border border-app-border p-4 max-h-48 overflow-y-auto custom-scrollbar">
                  <p className="text-[10px] font-bold text-app-subtext uppercase tracking-widest mb-3 ml-1">Projects to bundle</p>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedProjects.map((p) => (
                      <div key={`export-p-${p.id}`} className="flex items-center gap-2 p-2 bg-app-surface rounded-lg border border-app-border">
                        <Layers className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-xs text-app-subtext truncate font-medium">{p.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Settings */}
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-app-subtext uppercase tracking-widest ml-1">Customizable Settings</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button 
                      onClick={() => setSettings(s => ({ ...s, includeContext: !s.includeContext }))}
                      className={cn(
                        "flex items-start gap-3 p-4 rounded-2xl border transition-all text-left",
                        settings.includeContext ? "bg-blue-600/10 border-blue-500/50 ring-1 ring-blue-500/20" : "bg-app-bg border-app-border hover:border-app-subtext/30"
                      )}
                    >
                      <BrainCircuit className={cn("w-5 h-5 mt-0.5", settings.includeContext ? "text-blue-400" : "text-app-subtext")} />
                      <div>
                        <p className="text-sm font-bold text-app-text">Gemini Context</p>
                        <p className="text-[10px] text-app-subtext mt-0.5">Generate high-level architectural summaries for NotebookLM.</p>
                      </div>
                    </button>

                    <button 
                      onClick={() => setSettings(s => ({ ...s, individualGrounding: !s.individualGrounding }))}
                      className={cn(
                        "flex items-start gap-3 p-4 rounded-2xl border transition-all text-left",
                        settings.individualGrounding ? "bg-blue-600/10 border-blue-500/50 ring-1 ring-blue-500/20" : "bg-app-bg border-app-border hover:border-app-subtext/30"
                      )}
                    >
                      <FileCode className={cn("w-5 h-5 mt-0.5", settings.individualGrounding ? "text-blue-400" : "text-app-subtext")} />
                      <div>
                        <p className="text-sm font-bold text-app-text">Granular Grounding</p>
                        <p className="text-[10px] text-app-subtext mt-0.5">Include every individual source file in the bundle.</p>
                      </div>
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
                    <Info className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <div className="pt-4">
                  <button 
                    onClick={handleExport}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <Download className="w-5 h-5" />
                    Generate Optimized Archive
                  </button>
                </div>
              </div>
            )}

            {step === 'exporting' && (
              <div className="py-12 space-y-8">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="relative">
                    <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-blue-400">{Math.round(progress)}%</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-app-text">{currentAction}</h4>
                    <p className="text-app-subtext text-sm">Structuring knowledge for AI processing...</p>
                  </div>
                </div>

                <div className="h-2 w-full bg-app-bg rounded-full overflow-hidden border border-app-border">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-blue-600 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                  />
                </div>
              </div>
            )}

            {step === 'complete' && (
              <div className="py-12 space-y-8">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center border border-green-500/30">
                    <Check className="w-10 h-10 text-green-500" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold text-app-text">Export Complete!</h4>
                    <p className="text-app-subtext text-sm">Your NotebookLM optimized bundle is ready.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={onClose}
                    className="flex-1 py-4 bg-app-bg hover:bg-app-hover text-app-text rounded-2xl font-bold transition-all border border-app-border"
                  >
                    Done
                  </button>
                  <button 
                    onClick={handleExport}
                    className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold transition-all"
                  >
                    Export Again
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
