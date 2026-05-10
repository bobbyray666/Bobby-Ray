import React, { useState, useEffect, useRef } from 'react';
import { Command, Search, File, History, Sparkles, X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  projects: any[];
  onSelectProject: (project: any) => void;
  onSearchFiles: (query: string) => void;
  onActionSelect?: (actionId: string) => void;
}

export default function CommandPalette({ isOpen, onClose, projects, onSelectProject, onSearchFiles, onActionSelect }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isOpen]);

  const filteredItems = [
    ...projects.map(p => ({ type: 'project', id: p.id, label: p.name, icon: Sparkles, data: p })),
    { type: 'action', id: 'export', label: 'Export All to NotebookLM', icon: History },
    { type: 'action', id: 'health', label: 'Run Health Audit', icon: Search },
    ].filter(item => item.label.toLowerCase().includes(query.toLowerCase())) as any[];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      setSelectedIndex(prev => (prev + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter') {
      const item = filteredItems[selectedIndex];
      if (item) {
        if (item.type === 'project' && item.data) {
          onSelectProject(item.data);
        } else if (item.type === 'action' && onActionSelect) {
          onActionSelect(item.id);
        }
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-app-bg/60 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: -20 }}
            className="relative w-full max-w-2xl bg-app-surface border border-app-border rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center px-4 py-3 border-b border-app-border">
              <Command className="w-5 h-5 text-app-subtext mr-3" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search projects, files, or actions... (Cmd+K)"
                className="flex-1 bg-transparent border-none text-app-text focus:ring-0 placeholder:text-app-subtext text-sm"
              />
              <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-app-bg rounded border border-app-border text-[10px] font-bold text-app-subtext">
                ESC
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto py-2 custom-scrollbar">
              {filteredItems.length === 0 ? (
                <div className="px-4 py-12 text-center text-app-subtext">
                  <p className="text-sm">No results found for "{query}"</p>
                </div>
              ) : (
                filteredItems.map((item, idx) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onClick={() => {
                      if (item.type === 'project' && item.data) {
                        onSelectProject(item.data);
                      } else if (item.type === 'action' && onActionSelect) {
                        onActionSelect(item.id);
                      }
                      onClose();
                    }}
                    className={cn(
                      "px-4 py-3 flex items-center justify-between cursor-pointer transition-colors",
                      selectedIndex === idx ? "bg-blue-600/20 text-app-text" : "text-app-subtext hover:bg-app-hover"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className={cn("w-4 h-4", selectedIndex === idx ? "text-blue-400" : "text-app-subtext")} />
                      <span className="text-sm font-medium">{item.label}</span>
                      {item.type === 'project' && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-app-bg rounded text-app-subtext uppercase font-bold">Project</span>
                      )}
                    </div>
                    {selectedIndex === idx && <ChevronRight className="w-4 h-4 text-blue-500" />}
                  </div>
                ))
              )}
            </div>

            <div className="px-4 py-2 bg-app-bg/50 border-t border-app-border flex items-center justify-between">
              <div className="flex items-center gap-4 text-[10px] font-bold text-app-subtext uppercase tracking-widest">
                <div className="flex items-center gap-1">
                  <span className="px-1 py-0.5 bg-app-bg rounded">Enter</span> Select
                </div>
                <div className="flex items-center gap-1">
                  <span className="px-1 py-0.5 bg-app-bg rounded">↑↓</span> Navigate
                </div>
              </div>
              <p className="text-[10px] text-app-subtext italic font-medium">Vault AI Intelligence Active</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
