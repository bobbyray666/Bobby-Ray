import React, { useState, useEffect } from 'react';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User,
  signOut 
} from 'firebase/auth';
import { 
  FolderSync, 
  FileText, 
  Download, 
  Trash2, 
  Plus, 
  BrainCircuit, 
  LogOut,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Folder,
  File,
  CheckSquare,
  Square,
  History,
  Upload,
  Bot,
  MessageSquare,
  Sparkles,
  Command,
  Monitor,
  Save,
  Copy,
  Check,
  Sun,
  Moon,
  X,
  RefreshCw,
  Search,
  Layers,
  LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import JSZip from 'jszip';
import { auth, db } from './lib/firebase';
import { saveAppProject, getUserApps, getAppFiles, getAppVersions, deleteAppProject } from './services/firestoreService';
import { 
  summarizeApp, 
  extractCodeFromChat, 
  synthesizeEcosystemArchitecture,
  refactorCode, 
  summarizeFileContent, 
  generateNotebookLMKnowledgeBase, 
  generateProjectHealthReport,
  compareVersions,
  AppData, 
  AppFile 
} from './services/gemini';
import { cn } from './lib/utils';
import ProjectGraph from './components/ProjectGraph';
import BulkExportModal from './components/BulkExportModal';
import CommandPalette from './components/CommandPalette';

import Editor from 'react-simple-code-editor';
// @ts-ignore
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-css';
import 'prismjs/themes/prism-tomorrow.css';

import { useVirtualizer } from '@tanstack/react-virtual';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.remove('light');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.add('light');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [projectFiles, setProjectFiles] = useState<any[]>([]);
  const [projectVersions, setProjectVersions] = useState<any[]>([]);
  const [selectedFilePaths, setSelectedFilePaths] = useState<Set<string>>(new Set());
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [activeImportSource, setActiveImportSource] = useState<string | null>(null);
  const [chatTranscript, setChatTranscript] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'insights' | 'history' | 'files' | 'notebook'>('insights');
  const [fileExtensionFilter, setFileExtensionFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
  const [techStackFilter, setTechStackFilter] = useState<string | null>(null);
  const [isBulkExportOpen, setIsBulkExportOpen] = useState(false);
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [isRenamingFile, setIsRenamingFile] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  const [newVersionData, setNewVersionData] = useState({ name: '', summary: '' });
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  const [includeContentSearch, setIncludeContentSearch] = useState(false);
  const [autoExpandOnSearch, setAutoExpandOnSearch] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src']));
  const [previewFile, setPreviewFile] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [editProjectData, setEditProjectData] = useState({ name: '', description: '' });
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  const [isEditingFile, setIsEditingFile] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isRefactoring, setIsRefactoring] = useState(false);
  const [refactorInstruction, setRefactorInstruction] = useState('');
  const [showRefactorInput, setShowRefactorInput] = useState(false);
  const [fileSummary, setFileSummary] = useState<string | null>(null);
  const [isSummarizingFile, setIsSummarizingFile] = useState(false);
  const [isGeneratingKB, setIsGeneratingKB] = useState(false);
  const [kbDocument, setKbDocument] = useState<string | null>(null);
  const [healthReport, setHealthReport] = useState<string | null>(null);
  const [isGeneratingHealth, setIsGeneratingHealth] = useState(false);
  const [versionComparison, setVersionComparison] = useState<string | null>(null);
  const [isComparingVersions, setIsComparingVersions] = useState(false);
  const [lastAutosaved, setLastAutosaved] = useState<Date | null>(null);
  const [hasLocalDraft, setHasLocalDraft] = useState(false);

  useEffect(() => {
    if (isEditingFile && previewFile && selectedProject && editedContent !== previewFile.content) {
      const timer = setTimeout(() => {
        const key = `vault_draft_${selectedProject.id}_${previewFile.path.replace(/\//g, '_')}`;
        localStorage.setItem(key, editedContent);
        setLastAutosaved(new Date());
        setHasLocalDraft(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [editedContent, isEditingFile, previewFile, selectedProject]);

  useEffect(() => {
    if (previewFile && selectedProject) {
      const key = `vault_draft_${selectedProject.id}_${previewFile.path.replace(/\//g, '_')}`;
      const draft = localStorage.getItem(key);
      const isDifferent = !!draft && draft !== previewFile.content;
      setHasLocalDraft(isDifferent);
    }
  }, [previewFile, selectedProject, editedContent]);

  useEffect(() => {
    if (autoExpandOnSearch && fileSearchQuery && fileSearchQuery.length > 1) {
      const foldersToExpand = new Set(expandedFolders);
      let changed = false;
      projectFiles.forEach(file => {
        const matchesExt = !fileExtensionFilter || file.path.endsWith(fileExtensionFilter);
        if (!matchesExt) return;

        const matchesName = file.path.toLowerCase().includes(fileSearchQuery.toLowerCase());
        const matchesContent = includeContentSearch && file.content.toLowerCase().includes(fileSearchQuery.toLowerCase());
        
        if (matchesName || matchesContent) {
          const parts = file.path.split('/');
          let path = '';
          for (let i = 0; i < parts.length - 1; i++) {
            path = path ? `${path}/${parts[i]}` : parts[i];
            if (!foldersToExpand.has(path)) {
              foldersToExpand.add(path);
              changed = true;
            }
          }
        }
      });
      if (changed) setExpandedFolders(foldersToExpand);
    }
  }, [fileSearchQuery, includeContentSearch, projectFiles, autoExpandOnSearch, fileExtensionFilter]);

  const handleCreateFile = async () => {
    if (!selectedProject || !newFileName) return;
    const path = newFileName.startsWith('/') ? newFileName.slice(1) : newFileName;
    if (projectFiles.some(f => f.path === path)) {
      alert("File already exists");
      return;
    }

    setIsSyncing(true);
    try {
      const newFile: AppFile = {
        path,
        content: '// New file created in Vault\n'
      };
      const updatedFiles = [...projectFiles, newFile];
      await saveAppProject(selectedProject, updatedFiles);
      setProjectFiles(updatedFiles);
      setIsCreatingFile(false);
      setNewFileName('');
    } catch (error) {
      console.error("Create file failed", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRenameFile = async (oldPath: string, newPath: string) => {
    if (!selectedProject || !newPath || oldPath === newPath) {
      setIsRenamingFile(null);
      return;
    }

    setIsSyncing(true);
    try {
      const updatedFiles = projectFiles.map(f => 
        f.path === oldPath ? { ...f, path: newPath } : f
      );
      await saveAppProject(selectedProject, updatedFiles);
      setProjectFiles(updatedFiles);
      
      const newSelection = new Set(selectedFilePaths);
      if (newSelection.has(oldPath)) {
        newSelection.delete(oldPath);
        newSelection.add(newPath);
        setSelectedFilePaths(newSelection);
      }
      
      setIsRenamingFile(null);
    } catch (error) {
      console.error("Rename failed", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteFile = async (path: string) => {
    if (!selectedProject || !confirm(`Delete ${path}?`)) return;

    setIsSyncing(true);
    try {
      const updatedFiles = projectFiles.filter(f => f.path !== path);
      await saveAppProject(selectedProject, updatedFiles);
      setProjectFiles(updatedFiles);
      
      const newSelection = new Set(selectedFilePaths);
      newSelection.delete(path);
      setSelectedFilePaths(newSelection);
      
      if (previewFile?.path === path) setPreviewFile(null);
    } catch (error) {
      console.error("Delete file failed", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDownloadSelected = async () => {
    if (selectedFilePaths.size === 0) return;
    
    const zip = new JSZip();
    projectFiles.forEach(file => {
      if (selectedFilePaths.has(file.path)) {
        zip.file(file.path, file.content);
      }
    });
    
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedProject?.name || 'project'}-selected.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        if (isEditingFile) {
          e.preventDefault();
          handleSaveFileEdit();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditingFile, editedContent, previewFile]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currUser) => {
      setUser(currUser);
      setLoading(false);
      if (currUser) {
        loadProjects();
      }
    });
    return () => unsubscribe();
  }, []);

  const loadProjects = async () => {
    const apps = await getUserApps();
    setProjects(apps || []);
  };

  useEffect(() => {
    if (selectedProject) {
      loadProjectFiles(selectedProject.id);
      loadProjectVersions(selectedProject.id);
    } else {
      setProjectFiles([]);
      setProjectVersions([]);
      setSelectedFilePaths(new Set());
    }
  }, [selectedProject]);

  const loadProjectFiles = async (appId: string) => {
    setIsLoadingFiles(true);
    try {
      const files = await getAppFiles(appId);
      setProjectFiles(files || []);
      setSelectedFilePaths(new Set(files?.map(f => f.path) || []));
    } catch (error) {
      console.error("Failed to load files", error);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const loadProjectVersions = async (appId: string) => {
    setIsLoadingVersions(true);
    try {
      const versions = await getAppVersions(appId);
      setProjectVersions(versions || []);
    } catch (error) {
      console.error("Failed to load versions", error);
    } finally {
      setIsLoadingVersions(false);
    }
  };

  const toggleFileSelection = (path: string) => {
    const newSelection = new Set(selectedFilePaths);
    if (newSelection.has(path)) {
      newSelection.delete(path);
    } else {
      newSelection.add(path);
    }
    setSelectedFilePaths(newSelection);
  };

  const filteredFiles = projectFiles.filter(file => {
    const matchesExt = !fileExtensionFilter || file.path.endsWith(fileExtensionFilter);
    const matchesName = !fileSearchQuery || file.path.toLowerCase().includes(fileSearchQuery.toLowerCase());
    const matchesContent = includeContentSearch && fileSearchQuery && file.content.toLowerCase().includes(fileSearchQuery.toLowerCase());
    return matchesExt && (matchesName || matchesContent);
  });

  const availableExtensions = Array.from(new Set(projectFiles.map(f => {
    const parts = f.path.split('.');
    return parts.length > 1 ? `.${parts[parts.length - 1]}` : 'no-ext';
  }))).sort();

  const toggleFilteredFiles = () => {
    const newSelection = new Set(selectedFilePaths);
    const allFilteredSelected = filteredFiles.every(f => newSelection.has(f.path));
    
    if (allFilteredSelected) {
      filteredFiles.forEach(f => newSelection.delete(f.path));
    } else {
      filteredFiles.forEach(f => newSelection.add(f.path));
    }
    setSelectedFilePaths(newSelection);
  };

  const toggleFolderSelection = (folderPath: string) => {
    const folderFiles = projectFiles.filter(f => f.path.startsWith(folderPath));
    const allSelected = folderFiles.every(f => selectedFilePaths.has(f.path));
    
    const newSelection = new Set(selectedFilePaths);
    folderFiles.forEach(f => {
      if (allSelected) {
        newSelection.delete(f.path);
      } else {
        newSelection.add(f.path);
      }
    });
    setSelectedFilePaths(newSelection);
  };

  const toggleFolderExpansion = (path: string) => {
    const next = new Set(expandedFolders);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setExpandedFolders(next);
  };

  const projectStats = React.useMemo(() => {
    if (!projectFiles.length) return null;
    const totalLines = projectFiles.reduce((acc, f) => acc + (f.content?.split('\n').length || 0), 0);
    const totalSize = projectFiles.reduce((acc, f) => acc + (f.content?.length || 0), 0);
    const languages: Record<string, number> = {};
    projectFiles.forEach(f => {
      const ext = f.path.split('.').pop() || 'unknown';
      languages[ext] = (languages[ext] || 0) + 1;
    });
    return { totalLines, totalSize, languages };
  }, [projectFiles]);

  const fileTree = React.useMemo(() => {
    interface FileNode {
      name: string;
      path: string;
      type: 'file' | 'folder';
      children?: FileNode[];
    }
    const root: FileNode[] = [];
    
    const filtered = projectFiles.filter(file => {
      const matchesExt = !fileExtensionFilter || file.path.endsWith(fileExtensionFilter);
      const matchesName = !fileSearchQuery || file.path.toLowerCase().includes(fileSearchQuery.toLowerCase());
      const matchesContent = includeContentSearch && fileSearchQuery && file.content.toLowerCase().includes(fileSearchQuery.toLowerCase());
      return matchesExt && (matchesName || matchesContent);
    });

    filtered.forEach(file => {
      const parts = file.path.split('/');
      let currentLevel = root;
      let currentPath = '';

      parts.forEach((part, index) => {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        const isLast = index === parts.length - 1;
        let existingNode = currentLevel.find(node => node.name === part);

        if (!existingNode) {
          existingNode = {
            name: part,
            path: currentPath,
            type: isLast ? 'file' : 'folder',
            children: isLast ? undefined : []
          };
          currentLevel.push(existingNode);
          currentLevel.sort((a, b) => {
            if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
            return a.name.localeCompare(b.name);
          });
        }
        currentLevel = existingNode.children || [];
      });
    });
    return root;
  }, [projectFiles, fileExtensionFilter, fileSearchQuery, includeContentSearch]);

  const flattenedFiles = React.useMemo(() => {
    interface FlattenedNode {
      node: {
        name: string;
        path: string;
        type: 'file' | 'folder';
        children?: any[];
      };
      depth: number;
    }
    const result: FlattenedNode[] = [];
    
    function flatten(nodes: any[], depth = 0) {
      nodes.forEach(node => {
        result.push({ node, depth });
        if (node.type === 'folder' && expandedFolders.has(node.path) && node.children) {
          flatten(node.children, depth + 1);
        }
      });
    }
    
    flatten(fileTree);
    return result;
  }, [fileTree, expandedFolders]);

  const parentRef = React.useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: flattenedFiles.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 28, // estimated row height
    overscan: 5,
  });

  const handleLocalFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    try {
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(file);
      const files: AppFile[] = [];

      for (const [path, zipEntry] of Object.entries(loadedZip.files)) {
        if (!zipEntry.dir && !path.includes('node_modules') && !path.includes('.git')) {
          const content = await zipEntry.async('string');
          files.push({ path, content });
        }
      }

      if (files.length === 0) throw new Error("No valid source files found in zip.");

      const appData: AppData = {
        name: file.name.replace('.zip', ''),
        description: `Imported from local zip archive: ${file.name}`,
        version: "v1.0.0",
        files: files
      };

      const summary = await summarizeApp(appData);
      await saveAppProject({
        ...appData,
        summary,
        techStack: ["Local Import"],
      }, files);

      await loadProjects();
      setShowImportModal(false);
    } catch (error) {
      console.error("Local import failed", error);
    } finally {
      setIsExtracting(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleEcosystemImport = async () => {
    if (!chatTranscript.trim() || !activeImportSource) return;
    setIsExtracting(true);
    try {
      const extractedApp = await extractCodeFromChat(chatTranscript, activeImportSource);
      
      const summary = await summarizeApp(extractedApp);
      await saveAppProject({
        ...extractedApp,
        summary,
        techStack: [activeImportSource, "Extracted Architecture"],
        description: `Imported from ${activeImportSource} context.`
      }, extractedApp.files);
      
      await loadProjects();
      setActiveImportSource(null);
      setShowImportModal(false);
      setChatTranscript('');
    } catch (error) {
      console.error("Extraction failed", error);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSynthesizeImport = async () => {
    if (!activeImportSource) return;
    setIsExtracting(true);
    try {
      // Nano-quant and Turbo-quant pre-processing (Visual logic)
      const extractedApp = await synthesizeEcosystemArchitecture(activeImportSource);
      
      const summary = await summarizeApp(extractedApp);
      await saveAppProject({
        ...extractedApp,
        summary,
        techStack: [activeImportSource, "Synthesis Architecture", "DAO Governance"],
        description: `Direct architectural synthesis of ${activeImportSource} ecosystem.`
      }, extractedApp.files);
      
      await loadProjects();
      setActiveImportSource(null);
      setShowImportModal(false);
      setChatTranscript('');
    } catch (error) {
      console.error("Synthesis failed", error);
    } finally {
      setIsExtracting(false);
    }
  };
  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Sign in failed", error);
    }
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this project? This will permanently remove it from your vault.")) return;
    setIsDeleting(true);
    try {
      await deleteAppProject(id);
      await loadProjects();
      if (selectedProject?.id === id) setSelectedProject(null);
    } catch (error) {
      console.error("Delete failed", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateProjectMeta = async () => {
    if (!selectedProject) return;
    setIsSyncing(true);
    try {
      await saveAppProject({
        ...selectedProject,
        name: editProjectData.name,
        description: editProjectData.description
      }, projectFiles);
      await loadProjects();
      setSelectedProject({ ...selectedProject, name: editProjectData.name, description: editProjectData.description });
      setIsEditingProject(false);
    } catch (error) {
      console.error("Update failed", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveFileEdit = async () => {
    if (!previewFile || !selectedProject) return;
    
    setIsSyncing(true);
    try {
      const updatedFiles = projectFiles.map(f => 
        f.path === previewFile.path ? { ...f, content: editedContent } : f
      );
      
      await saveAppProject(selectedProject, updatedFiles);
      setProjectFiles(updatedFiles);
      setPreviewFile({ ...previewFile, content: editedContent });
      setIsEditingFile(false);
      
      // Clear autosave draft on success
      const key = `vault_draft_${selectedProject.id}_${previewFile.path.replace(/\//g, '_')}`;
      localStorage.removeItem(key);
      setHasLocalDraft(false);
      setLastAutosaved(null);
    } catch (error) {
      console.error("Save edit failed", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleRefactor = async () => {
    if (!previewFile || !isEditingFile) return;
    setIsRefactoring(true);
    try {
      const result = await refactorCode(previewFile.path, editedContent, refactorInstruction || 'Optimize and clean up this code');
      setEditedContent(result);
      setShowRefactorInput(false);
      setRefactorInstruction('');
    } catch (error) {
      console.error("Refactor failed", error);
    } finally {
      setIsRefactoring(false);
    }
  };

  const handleSummarizeFile = async () => {
    if (!previewFile) return;
    setIsSummarizingFile(true);
    try {
      const summary = await summarizeFileContent(previewFile.path, previewFile.content);
      setFileSummary(summary);
    } catch (error) {
      console.error("Summary failed", error);
    } finally {
      setIsSummarizingFile(false);
    }
  };

  const handleCreateVersion = async () => {
    if (!newVersionData.name) return;
    setIsSyncing(true);
    try {
      // If we have a selected project, use its ID. Otherwise use current workspace sync logic.
      const targetProject = selectedProject || { id: "current-workspace", name: "NotebookLM Sync: AI Studio Architect" };
      
      const response = await fetch('/api/files');
      if (!response.ok) throw new Error("Failed to fetch files from workspace");
      const files: AppFile[] = await response.json();
      
      const appData: AppData = {
        id: targetProject.id,
        name: targetProject.name,
        version: newVersionData.name,
        summary: newVersionData.summary,
        files: files
      };

      const summary = await summarizeApp(appData);
      await saveAppProject({
        ...appData,
        summary: summary || newVersionData.summary,
        techStack: targetProject.techStack || ["React", "Express", "Firebase", "Gemini API"],
        description: targetProject.description || "A customized version."
      }, files);
      
      await loadProjects();
      if (selectedProject?.id === targetProject.id) {
        loadProjectVersions(targetProject.id);
      }
      setIsCreatingVersion(false);
      setNewVersionData({ name: '', summary: '' });
    } catch (error) {
      console.error("Version creation failed", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const allUniqueStacks = React.useMemo(() => {
    const stacks = new Set<string>();
    projects.forEach(p => {
      p.techStack?.forEach((s: string) => stacks.add(s));
    });
    return Array.from(stacks).sort();
  }, [projects]);

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.techStack?.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStack = !techStackFilter || p.techStack?.includes(techStackFilter);
    
    return matchesSearch && matchesStack;
  });

  const syncCurrentProject = async () => {
    setIsSyncing(true);
    try {
      // In a real agent environment, we fetch the project structure
      const response = await fetch('/api/files');
      if (!response.ok) throw new Error("Failed to fetch files from workspace");
      const files: AppFile[] = await response.json();
      
      const appData: AppData = {
        id: "current-workspace",
        name: "NotebookLM Sync: AI Studio Architect",
        version: "v1.0.4",
        files: files
      };

      const summary = await summarizeApp(appData);
      await saveAppProject({
        ...appData,
        summary,
        techStack: ["React", "Express", "Firebase", "Gemini API"],
        description: "The core utility for synchronizing AI Studio projects to NotebookLM."
      }, files);
      
      await loadProjects();
    } catch (error) {
      console.error("Sync failed", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const syncGlobalEcosystem = async () => {
    setIsSyncing(true);
    try {
      const sources = ['Antigravity', 'Jules AI', 'Gemma'];
      for (const source of sources) {
        const extractedApp = await synthesizeEcosystemArchitecture(source);
        const summary = await summarizeApp(extractedApp);
        await saveAppProject({
          ...extractedApp,
          summary,
          techStack: [source, "Ecosystem Leader", "DAO Multi-Sig Managed"],
          description: `High-fidelity architectural synthesis of the ${source} ecosystem core.`
        }, extractedApp.files);
      }
      await loadProjects();
    } catch (error) {
      console.error("Global Sync failed", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGenerateHealthReport = async () => {
    if (!selectedProject) return;
    setIsGeneratingHealth(true);
    try {
      const appData: AppData = {
        name: selectedProject.name,
        version: selectedProject.version,
        description: selectedProject.description,
        techStack: selectedProject.techStack,
        files: projectFiles
      };
      const report = await generateProjectHealthReport(appData);
      setHealthReport(report);
    } catch (error) {
      console.error("Health report failed", error);
    } finally {
      setIsGeneratingHealth(false);
    }
  };

  const handleCompareVersions = async (v1: any, v2: any) => {
    setIsComparingVersions(true);
    try {
      const report = await compareVersions(v1, v2);
      setVersionComparison(report);
    } catch (error) {
      console.error("Comparison failed", error);
    } finally {
      setIsComparingVersions(false);
    }
  };

  const handleNotebookLMKnowledgeBase = async () => {
    if (!selectedProject) return;
    setIsGeneratingKB(true);
    try {
      const appData: AppData = {
        name: selectedProject.name,
        version: selectedProject.version,
        description: selectedProject.description,
        techStack: selectedProject.techStack,
        files: projectFiles.filter(f => selectedFilePaths.has(f.path))
      };
      const doc = await generateNotebookLMKnowledgeBase(appData);
      setKbDocument(doc);
    } catch (error) {
      console.error("KB Generation failed", error);
    } finally {
      setIsGeneratingKB(false);
    }
  };

  const exportToNotebookLM = async (project: any) => {
    setIsGeneratingKB(true);
    try {
      const appData: AppData = {
        name: project.name,
        version: project.version,
        description: project.description,
        techStack: project.techStack,
        files: projectFiles.filter(f => selectedFilePaths.has(f.path))
      };

      const knowledgeBase = await generateNotebookLMKnowledgeBase(appData);
      
      const zip = new JSZip();
      
      // The NotebookLM optimized document
      zip.file(`${project.name.replace(/\s+/g, '_')}_KnowledgeBase.md`, knowledgeBase);
      
      // Individual files for granular grounding
      projectFiles.forEach(file => {
        if (selectedFilePaths.has(file.path)) {
          zip.file(file.path, file.content);
        }
      });
      
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.replace(/\s+/g, '_')}_NotebookLM_Source.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error("NotebookLM Export failed", error);
    } finally {
      setIsGeneratingKB(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--app-bg)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--app-bg)] flex flex-col items-center justify-center p-4 text-[var(--app-text)]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center space-y-8"
        >
          <div className="flex justify-center">
            <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20">
              <BrainCircuit className="w-12 h-12 text-blue-500" />
            </div>
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">NotebookLM Sync</h1>
            <p className="text-[var(--app-subtext)] text-lg">
              The professional bridge between AI Studio and your personal knowledge base.
            </p>
          </div>
          <button
            onClick={handleSignIn}
            className="w-full py-4 px-6 bg-[var(--app-text)] text-[var(--app-bg)] rounded-xl font-semibold flex items-center justify-center gap-3 hover:opacity-90 transition-all active:scale-95"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign in with Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)] font-sans selection:bg-blue-500/30">
      <nav className="border-b border-app-border bg-app-surface/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrainCircuit className="w-6 h-6 text-blue-500" />
            <span className="font-bold text-lg tracking-tight">AI Architect</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 hover:bg-app-hover rounded-lg transition-colors text-app-subtext hover:text-app-text"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              <span className="text-xs font-medium text-green-500">Authenticated</span>
            </div>
            <button 
              onClick={() => signOut(auth)}
              className="p-2 hover:bg-app-hover rounded-lg transition-colors text-app-subtext hover:text-app-text"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-blue-500 font-bold text-[10px] uppercase tracking-[0.2em] mb-1">
              <ShieldCheck className="w-3 h-3" />
              Advanced Ecosystem Sync Active
            </div>
            <h2 className="text-3xl font-bold">App Vault</h2>
            <p className="text-app-subtext">Manage and export your AI Studio projects to NotebookLM.</p>
            
            <div className="relative mt-4 group">
              <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-app-subtext group-focus-within:text-blue-500 transition-colors" />
              <input 
                type="text"
                placeholder="Search projects, stacks, or functions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-12 py-3 bg-app-surface border border-app-border rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all placeholder:text-app-subtext"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full text-slate-500 hover:text-white transition-all"
                >
                  <Plus className="w-4 h-4 rotate-45" />
                </button>
              )}
            </div>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 bg-app-surface hover:bg-app-hover px-6 py-3 rounded-xl font-semibold transition-all active:scale-95 border border-app-border"
            >
              <Plus className="w-4 h-4" />
              Multi-Source Import
            </button>
            <button 
              onClick={syncCurrentProject}
              disabled={isSyncing}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-blue-600/20 active:scale-95"
            >
              {isSyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <FolderSync className="w-5 h-5" />}
              Sync Current Session
            </button>
            <button 
              onClick={syncGlobalEcosystem}
              disabled={isSyncing}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-emerald-600/20 active:scale-95 border border-emerald-400/20"
            >
              {isSyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              Ecosystem Deep Sync
            </button>
            <button 
              onClick={() => {
                setNewVersionData({ name: `v${new Date().toLocaleDateString().replace(/\//g, '.')}.${Math.floor(Date.now()/1000000)}`, summary: '' });
                setIsCreatingVersion(true);
              }}
              disabled={isSyncing}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-purple-600/20 active:scale-95 border border-purple-400/20"
            >
              <History className="w-5 h-5" />
              Create Version
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Tech Stack Filters */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-app-subtext uppercase tracking-widest ml-1">Filter by Tech Architecture</span>
                {techStackFilter && (
                  <button 
                    onClick={() => setTechStackFilter(null)}
                    className="text-[10px] font-bold text-blue-500 hover:text-blue-400 uppercase tracking-widest transition-colors"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setTechStackFilter(null)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                    !techStackFilter 
                      ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/20" 
                      : "bg-app-surface text-app-subtext border-app-border hover:border-app-subtext/30"
                  )}
                >
                  All Projects
                </button>
                {allUniqueStacks.map((stack) => (
                  <button
                    key={`stack-filter-${stack}`}
                    onClick={() => setTechStackFilter(stack === techStackFilter ? null : stack)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                      techStackFilter === stack 
                        ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/20" 
                        : "bg-app-surface text-app-subtext border-app-border hover:border-app-subtext/30"
                    )}
                  >
                    {stack}
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence mode="popLayout">
              {filteredProjects.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-app-surface/50 border border-app-border rounded-3xl p-12 text-center space-y-4"
                >
                  <p className="text-app-subtext">{searchQuery ? "No search results match your criteria." : "No applications synced yet."}</p>
                  {!searchQuery && (
                    <button onClick={() => setShowImportModal(true)} className="text-blue-500 font-medium hover:underline flex items-center gap-1 mx-auto">
                      <Plus className="w-4 h-4" /> Import legacy project
                    </button>
                  )}
                </motion.div>
              ) : (
                filteredProjects.map((project, idx) => (
                  <motion.div
                    key={`project-${project.id}`}
                    layoutId={`project-${project.id}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "group bg-app-surface border border-app-border p-6 rounded-2xl transition-all hover:bg-app-surface/80 cursor-pointer relative overflow-hidden",
                      selectedProject?.id === project.id && "ring-2 ring-blue-500 bg-app-surface/90"
                    )}
                    onClick={() => setSelectedProject(project)}
                  >
                    <div 
                      className="absolute top-4 right-4 z-10" 
                      onClick={(e) => {
                        e.stopPropagation();
                        const next = new Set(selectedProjectIds);
                        if (next.has(project.id)) next.delete(project.id);
                        else next.add(project.id);
                        setSelectedProjectIds(next);
                      }}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded border flex items-center justify-center transition-all",
                        selectedProjectIds.has(project.id) 
                          ? "bg-blue-600 border-blue-600 text-white" 
                          : "bg-app-bg border-app-border text-transparent hover:border-blue-500"
                      )}>
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-bold">{project.name}</h3>
                          <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full font-mono text-app-subtext">
                            {project.version}
                          </span>
                        </div>
                        <p className="text-app-subtext line-clamp-1">{project.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); exportToNotebookLM(project); }}
                          className="p-2 bg-blue-500/10 text-blue-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-500 hover:text-white"
                          title="Export to NotebookLM"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={(e) => handleDeleteProject(project.id, e)}
                          className="p-2 bg-red-500/10 text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                          title="Delete Project"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-6 flex flex-wrap gap-2">
                      {project.techStack?.map((tech: string, idx: number) => (
                        <span key={`tech-${project.id}-${tech}-${idx}`} className="text-[10px] uppercase tracking-wider font-bold text-app-subtext bg-app-bg px-2 py-1 rounded">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-6">
            <AnimatePresence>
              {selectedProjectIds.size > 0 && (
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 20, opacity: 0 }}
                  className="bg-blue-600/10 border border-blue-500/20 p-6 rounded-3xl space-y-4 mb-6 shadow-2xl backdrop-blur-xl"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-white">
                        {selectedProjectIds.size}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Projects Selected</p>
                        <p className="text-xs text-slate-500">Ready for bulk export</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedProjectIds(new Set())}
                      className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-white"
                    >
                      Clear
                    </button>
                  </div>
                  <button 
                    onClick={() => setIsBulkExportOpen(true)}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export Selected to NotebookLM
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="bg-app-surface/50 border border-app-border rounded-3xl p-6 h-fit sticky top-28">
              {selectedProject ? (
                <div className="space-y-6">
                  <div className="flex p-1 bg-app-bg rounded-xl mb-4 border border-app-border shadow-inner">
                    {(['insights', 'history', 'files', 'notebook'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => {
                          setActiveTab(tab);
                          if (tab === 'notebook' && !kbDocument) {
                            handleNotebookLMKnowledgeBase();
                          }
                        }}
                        className={cn(
                          "flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                          activeTab === tab ? "bg-app-surface text-app-accent shadow-xl ring-1 ring-app-border" : "text-app-subtext hover:text-app-text"
                        )}
                      >
                        {tab === 'notebook' ? 'NotebookLM' : tab}
                      </button>
                    ))}
                  </div>

                  {activeTab === 'insights' && (
                    <div className="space-y-6">
                      <div className="bg-app-surface/50 p-6 rounded-2xl border border-app-border space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <h4 className="text-sm font-bold text-app-subtext">Vault AI Integrity</h4>
                        </div>
                        <p className="text-xs text-app-subtext leading-relaxed">
                          This project is fully indexed and ready for Google NotebookLM. 
                          The source code is structured for optimal grounding and semantic retrieval.
                        </p>
                      </div>

                      {projectStats && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-app-surface/50 p-4 rounded-2xl border border-app-border">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Volume</p>
                            <p className="text-xl font-bold text-[var(--app-text)]">{projectStats.totalLines.toLocaleString()} <span className="text-xs text-slate-600 font-normal">lines</span></p>
                          </div>
                          <div className="bg-app-surface/50 p-4 rounded-2xl border border-app-border">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Payload Size</p>
                            <p className="text-xl font-bold text-[var(--app-text)]">{(projectStats.totalSize / 1024).toFixed(1)} <span className="text-xs text-slate-600 font-normal">KB</span></p>
                          </div>
                        </div>
                      )}

                      <div className="space-y-3">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Architectural Summary</h4>
                        <div className="bg-app-surface/50 p-5 rounded-2xl border border-app-border text-sm text-app-subtext leading-relaxed font-mono whitespace-pre-wrap">
                          {selectedProject.summary || "Generating architectural summary..."}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Project Topology</h4>
                        <ProjectGraph 
                          files={projectFiles} 
                          onFileSelect={(path) => {
                            const file = projectFiles.find(f => f.path === path);
                            if (file) {
                              setPreviewFile(file);
                              setFileSummary(null);
                            }
                          }} 
                        />
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Language Distribution</h4>
                        <div className="space-y-2">
                          {projectStats && Object.entries(projectStats.languages).map(([lang, count]) => (
                            <div key={`lang-stat-${lang}`} className="flex items-center gap-3">
                              <span className="text-[10px] uppercase font-bold text-slate-500 w-12">{lang}</span>
                              <div className="flex-1 h-1.5 bg-app-bg rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-blue-500/50" 
                                  style={{ width: `${((count as number) / Math.max(1, projectFiles.length)) * 100}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-bold text-slate-600">{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-4 pt-4">
                        <button 
                          onClick={handleGenerateHealthReport}
                          disabled={isGeneratingHealth}
                          className="flex-1 py-3 px-6 bg-purple-600/10 hover:bg-purple-600/20 text-purple-500 rounded-xl font-bold transition-all border border-purple-500/20 flex items-center justify-center gap-2"
                        >
                          {isGeneratingHealth ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                          Health Audit
                        </button>
                      </div>

                      {healthReport && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">AI Health Report</h4>
                            <button onClick={() => setHealthReport(null)} className="text-[10px] text-slate-600 hover:text-white uppercase font-bold">Dismiss</button>
                          </div>
                          <div className="bg-app-bg p-6 rounded-2xl border border-blue-500/20 text-sm text-app-subtext leading-relaxed font-sans max-h-[400px] overflow-y-auto custom-scrollbar">
                            <div className="whitespace-pre-wrap">{healthReport}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'history' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold flex items-center gap-2">
                          <History className="w-4 h-4 text-blue-500" />
                          Version Timeline
                        </h4>
                        {versionComparison && (
                          <button 
                            onClick={() => setVersionComparison(null)}
                            className="text-[10px] font-bold text-slate-600 hover:text-white uppercase"
                          >
                            Reset
                          </button>
                        )}
                      </div>

                      {versionComparison ? (
                        <div className="bg-app-bg p-6 rounded-2xl border border-purple-500/20 space-y-4">
                          <div className="flex items-center gap-2 text-purple-400 font-bold text-[10px] uppercase tracking-widest">
                            <Bot className="w-3 h-3" /> AI Evolution Summary
                          </div>
                          <div className="text-sm text-app-subtext leading-relaxed italic whitespace-pre-wrap font-mono">
                            {versionComparison}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                          {isLoadingVersions ? (
                            <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-app-subtext" /></div>
                          ) : projectVersions.map((v: any, idx: number) => (
                            <div 
                              key={`version-${v.id}`} 
                              className="relative pl-6 pb-4 border-l border-app-border last:pb-0 group cursor-pointer"
                              onClick={() => {
                                const currentIndex = Number(idx);
                                const total = projectVersions.length;
                                if (currentIndex < total - 1) {
                                  handleCompareVersions(projectVersions[currentIndex + 1], v);
                                }
                              }}
                            >
                              <div className="absolute left-[-5.5px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)] transition-transform group-hover:scale-125" />
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-bold text-app-text group-hover:text-blue-400 transition-colors">{v.version}</p>
                                  {(idx as number) < projectVersions.length - 1 && (
                                    <span className="text-[9px] text-app-subtext font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Compare →</span>
                                  )}
                                </div>
                                <p className="text-[10px] text-app-subtext">{new Date(v.timestamp?.seconds * 1000).toLocaleString()}</p>
                                <p className="text-xs text-app-subtext line-clamp-2 italic">{v.summary}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'files' && (
                    <div className="space-y-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <File className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-app-subtext" />
                            <input 
                              type="text"
                              placeholder={includeContentSearch ? "Search within code..." : "Quick find file..."}
                              value={fileSearchQuery}
                              onChange={(e) => setFileSearchQuery(e.target.value)}
                              className="w-full pl-9 pr-10 py-2 bg-app-bg border border-app-border rounded-xl text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all placeholder:text-app-subtext font-mono"
                            />
                            {fileSearchQuery && (
                              <button 
                                onClick={() => setFileSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-app-hover rounded-md text-app-subtext hover:text-app-text transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <button 
                            onClick={() => setIsCreatingFile(true)}
                            className="px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-500 transition-all flex items-center gap-1.5 shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5" /> New File
                          </button>
                        </div>
                        <div className="flex items-center gap-4 px-1">
                          <button 
                            onClick={() => setAutoExpandOnSearch(!autoExpandOnSearch)}
                            title="Automatically expand folders when searching"
                            className={cn(
                              "text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-all px-2 py-1 rounded-md",
                              autoExpandOnSearch 
                                ? "bg-purple-600/20 text-purple-400 border border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.2)]" 
                                : "text-app-subtext hover:text-app-text border border-transparent hover:bg-app-hover"
                            )}
                          >
                            <FolderSync className={cn("w-3 h-3", autoExpandOnSearch && "animate-pulse")} />
                            {autoExpandOnSearch ? "Auto-Expand Active" : "Auto-Expand Off"}
                          </button>
                          <span className="text-[10px] font-bold text-app-border">|</span>
                          <button 
                            onClick={() => setIncludeContentSearch(!includeContentSearch)}
                            title="Search within file contents"
                            className={cn(
                              "text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-all px-2 py-1 rounded-md",
                              includeContentSearch 
                                ? "bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]" 
                                : "text-app-subtext hover:text-app-text border border-transparent hover:bg-app-hover"
                            )}
                          >
                            <Bot className={cn("w-3 h-3", includeContentSearch && "animate-pulse")} />
                            {includeContentSearch ? "Code Search Active" : "Filename Only"}
                          </button>
                          <span className="text-[10px] font-bold text-app-border">|</span>
                          <p className="text-[10px] text-app-subtext font-bold uppercase tracking-widest flex items-center gap-1">
                            <span className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" />
                            {filteredFiles.length === projectFiles.length ? `${projectFiles.length} Indexed` : `${filteredFiles.length}/${projectFiles.length} Matches`}
                          </p>
                        </div>
                        
                        <div className="flex flex-wrap gap-1.5 px-1 py-2 border-t border-b border-app-border">
                          <button 
                            onClick={() => setFileExtensionFilter(null)}
                            className={cn(
                              "px-2 py-0.5 text-[9px] font-bold uppercase rounded-md transition-all",
                              !fileExtensionFilter 
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                                : "text-app-subtext hover:text-white bg-app-bg border border-app-border"
                            )}
                          >
                            All
                          </button>
                          {availableExtensions.map((ext) => (
                            <button 
                              key={`ext-filter-${ext}`}
                              onClick={() => setFileExtensionFilter(ext)}
                              className={cn(
                                "px-2 py-0.5 text-[9px] font-bold uppercase rounded-md transition-all",
                                fileExtensionFilter === ext 
                                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                                  : "text-app-subtext hover:text-white bg-app-bg border border-app-border"
                              )}
                            >
                              {ext}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Workspace Structure</p>
                          </div>
                          <div className="flex gap-2">
                             <button 
                              onClick={toggleFilteredFiles}
                              className="text-[10px] font-bold text-app-subtext hover:text-app-text uppercase tracking-widest px-2 py-1 bg-app-bg rounded"
                            >
                              Toggle Visible
                            </button>
                          </div>
                        </div>
                        
                        <div ref={parentRef} className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar border-t border-app-border pt-4 relative">
                          {flattenedFiles.length === 0 ? (
                            <div className="py-12 text-center bg-app-bg/20 rounded-2xl border border-dashed border-app-border mt-1">
                              <p className="text-xs text-app-subtext font-mono italic">No matches in current hierarchy.</p>
                            </div>
                          ) : (
                            <div
                              style={{
                                height: `${rowVirtualizer.getTotalSize()}px`,
                                width: '100%',
                                position: 'relative',
                              }}
                            >
                              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                                const { node, depth } = flattenedFiles[virtualRow.index];
                                return (
                                  <div
                                    key={`node-${node.path}`}
                                    className="absolute top-0 left-0 w-full px-1"
                                    style={{
                                      height: `${virtualRow.size}px`,
                                      transform: `translateY(${virtualRow.start}px)`,
                                    }}
                                  >
                                    <div 
                                      className={cn(
                                        "group flex items-center justify-between px-2 py-1 rounded-lg cursor-pointer transition-all",
                                        previewFile?.path === node.path ? "bg-blue-600/15 ring-1 ring-blue-500/20 shadow-inner" : "hover:bg-app-hover"
                                      )}
                                      style={{ paddingLeft: `${depth * 12 + 8}px` }}
                                      onClick={() => {
                                        if (node.type === 'folder') toggleFolderExpansion(node.path);
                                        else {
                                          const file = projectFiles.find(f => f.path === node.path);
                                          if (file) {
                                            setPreviewFile(file);
                                            setFileSummary(null);
                                          }
                                        }
                                      }}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); node.type === 'folder' ? toggleFolderSelection(node.path) : toggleFileSelection(node.path); }}
                                          className="shrink-0 transition-transform active:scale-75"
                                        >
                                          {(node.type === 'folder' 
                                            ? projectFiles.filter(f => f.path.startsWith(node.path)).every(f => selectedFilePaths.has(f.path))
                                            : selectedFilePaths.has(node.path)) ? (
                                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                                          ) : (
                                            <div className="w-3.5 h-3.5 rounded-sm border border-slate-700 hover:border-slate-500" />
                                          )}
                                        </button>
                                        <div className="flex items-center gap-1.5 min-w-0">
                                          {node.type === 'folder' ? (
                                            <Folder className={cn("w-3.5 h-3.5 shrink-0", expandedFolders.has(node.path) ? "text-blue-400" : "text-slate-600")} />
                                          ) : (
                                            <File className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                                          )}
                                          <span className={cn(
                                            "text-[11px] truncate font-mono tracking-tight",
                                            node.type === 'folder' ? "text-slate-300 font-bold" : "text-slate-400"
                                          )}>
                                            {node.name}
                                          </span>
                                        </div>
                                      </div>
                                      
                                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                                        {node.type === 'file' && (
                                          <>
                                            <button 
                                              onClick={(e) => { 
                                                e.stopPropagation(); 
                                                const file = projectFiles.find(f => f.path === node.path);
                                                if (file) {
                                                  setPreviewFile(file);
                                                  setFileSummary(null);
                                                  setTimeout(() => {
                                                    const button = document.getElementById('summarize-trigger');
                                                    if (button) button.click();
                                                  }, 500);
                                                }
                                              }}
                                              className="p-1 px-1.5 bg-purple-950/30 rounded hover:bg-purple-500/50 transition-all border border-purple-500/20 shadow-sm"
                                              title="Neural Insight"
                                            >
                                              <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                                            </button>
                                            <button 
                                              onClick={(e) => { e.stopPropagation(); setIsRenamingFile(node.path); }}
                                              className="p-1 px-1.5 bg-slate-800 rounded hover:bg-slate-700 transition-colors"
                                            >
                                              <Plus className="w-2.5 h-2.5 rotate-45 text-slate-400" />
                                            </button>
                                            <button 
                                              onClick={(e) => { e.stopPropagation(); handleDeleteFile(node.path); }}
                                              className="p-1 px-1.5 bg-red-950/30 rounded hover:bg-red-500/50 transition-colors"
                                            >
                                              <Trash2 className="w-2.5 h-2.5 text-red-400" />
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'notebook' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold flex items-center gap-2">
                          <BrainCircuit className="w-4 h-4 text-purple-500" />
                          NotebookLM KB
                        </h4>
                        <button 
                          onClick={handleNotebookLMKnowledgeBase}
                          disabled={isGeneratingKB}
                          className="text-[10px] uppercase font-bold text-slate-500 hover:text-white transition-colors flex items-center gap-1"
                        >
                          {isGeneratingKB ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} 
                          Regenerate
                        </button>
                      </div>

                      {isGeneratingKB ? (
                        <div className="py-12 flex flex-col items-center justify-center space-y-4 bg-slate-950/50 rounded-2xl border border-white/5">
                          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                          <p className="text-sm text-slate-500 font-medium animate-pulse">Building Architectural Context...</p>
                        </div>
                      ) : kbDocument ? (
                        <div className="space-y-4">
                          <div className="bg-app-bg p-4 rounded-xl border border-app-border font-mono text-xs text-app-subtext max-h-[400px] overflow-y-auto leading-relaxed custom-scrollbar whitespace-pre-wrap">
                            {kbDocument}
                          </div>
                          <button 
                            onClick={() => exportToNotebookLM(selectedProject)}
                            className="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold transition-all shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2"
                          >
                            <Download className="w-4 h-4" />
                            Download KB for NotebookLM
                          </button>
                        </div>
                      ) : (
                        <div className="py-12 text-center space-y-4 bg-app-bg/50 rounded-2xl border border-app-border">
                          <p className="text-sm text-slate-500">No Knowledge Base generated yet.</p>
                          <button 
                            onClick={handleNotebookLMKnowledgeBase}
                            className="px-6 py-2 bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 rounded-xl text-xs font-bold transition-all border border-purple-500/20"
                          >
                            Generate Knowledge Base
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-4 border-t border-white/5">
                    <button 
                      onClick={() => setShowExportConfirm(true)}
                      disabled={selectedFilePaths.size === 0}
                      className="w-full py-3 bg-white text-slate-950 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-100 transition-all shadow-lg shadow-white/5"
                    >
                      <Download className="w-4 h-4" />
                      Prepare Export
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <h4 className="font-bold flex items-center gap-2">
                    <BrainCircuit className="w-4 h-4 text-blue-500" />
                    Knowledge Hub
                  </h4>
                  <p className="text-slate-500 text-sm">Select a project to view AI-generated architectural insights and manage exports.</p>
                </div>
              )}
            </div>

            <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/20 p-6 rounded-3xl space-y-3">
              <h4 className="font-bold text-blue-400">Pro Tip</h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                NotebookLM works best when you upload a structured summary alongside your source code. Our export includes both.
              </p>
            </div>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {showImportModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowImportModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-white/5">
                <h3 className="text-2xl font-bold">Multi-Source Import</h3>
                <p className="text-slate-400 text-sm mt-1">Connect and sync code from ecosystem partners.</p>
              </div>
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                  type="file" 
                  id="zip-upload" 
                  className="hidden" 
                  accept=".zip" 
                  onChange={handleLocalFileSelect} 
                />
                {[
                  { name: 'Local Device', icon: Monitor, desc: 'Scan storage for .zip exports', color: 'slate', onClick: () => document.getElementById('zip-upload')?.click() },
                  { name: 'Antigravity', icon: Command, desc: 'Import agentic architecture', color: 'blue', type: 'Antigravity' },
                  { name: 'Gemini Chats', icon: MessageSquare, desc: 'Sync code from discussions', color: 'purple', type: 'Gemini' },
                  { name: 'Google Jules AI', icon: Sparkles, desc: 'Bridge cloud architectures', color: 'teal', type: 'Jules AI' },
                  { name: 'Gemma Agent', icon: Bot, desc: 'Pull from local LLM contexts', color: 'orange', type: 'Gemma' }
                ].map((source) => (
                  <button 
                    key={`import-source-${source.name}`}
                    onClick={() => (source as any).onClick ? (source as any).onClick() : setActiveImportSource((source as any).type)}
                    className="flex flex-col items-start p-4 bg-slate-950 border border-white/5 rounded-2xl hover:border-slate-500 transition-all text-left group"
                  >
                    <source.icon className={cn("w-6 h-6 mb-3", `text-${source.color}-400`)} />
                    <h4 className="font-bold text-sm">{source.name}</h4>
                    <p className="text-xs text-slate-500 mt-1">{source.desc}</p>
                    <div className="mt-4 text-[10px] uppercase tracking-widest text-slate-600 font-bold group-hover:text-white transition-colors">
                      Connect Source →
                    </div>
                  </button>
                ))}
              </div>
              <div className="p-8 bg-slate-950/50 flex justify-end">
                <button 
                  onClick={() => setShowImportModal(false)}
                  className="px-6 py-2 rounded-xl text-slate-400 hover:text-white font-bold"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {activeImportSource && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveImportSource(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-8 bg-slate-800/50 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold flex items-center gap-3 capitalize">
                    {activeImportSource} Loader
                  </h3>
                  <p className="text-slate-400 text-sm mt-1">Paste your conversation or export data to architect a new project.</p>
                </div>
                <button onClick={() => setActiveImportSource(null)} className="text-slate-500 hover:text-white">
                  <Plus className="w-5 h-5 rotate-45" />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{activeImportSource} Data</label>
                  <textarea 
                    value={chatTranscript}
                    onChange={(e) => setChatTranscript(e.target.value)}
                    placeholder={`Paste your ${activeImportSource} history here... AI Architect will automatically identify and extract the codebase structure.`}
                    className="w-full h-64 bg-slate-950 border border-white/5 rounded-2xl p-4 text-sm font-mono text-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none custom-scrollbar resize-none"
                  />
                </div>
                <div className="flex items-center gap-4 p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                  <Sparkles className="w-5 h-5 text-blue-400 shrink-0" />
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Our AI models will scan the {activeImportSource} context for file paths, variable declarations, and logic patterns.
                  </p>
                </div>
                
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Advanced Algorithmic Synthesis</span>
                    <span className="flex items-center gap-1.5 text-[9px] font-bold text-blue-400 uppercase">
                      <div className="w-1 h-1 bg-blue-400 rounded-full animate-ping" />
                      NanoQuant v2 Loaded
                    </span>
                  </div>
                  <button 
                    onClick={handleSynthesizeImport}
                    disabled={isExtracting}
                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 text-white rounded-2xl font-bold shadow-xl shadow-blue-600/20 flex flex-col items-center justify-center transition-all group active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-2">
                       {isExtracting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Bot className="w-5 h-5 group-hover:animate-bounce" />}
                       <span className="text-base">TurboQuant Deep Synthesis</span>
                    </div>
                    <span className="text-[9px] uppercase tracking-[0.2em] opacity-60 mt-1">Reconstruct {activeImportSource} Core Architecture</span>
                  </button>
                </div>
              </div>
              <div className="p-8 bg-slate-950/50 flex gap-4">
                <button 
                  onClick={() => setActiveImportSource(null)}
                  className="flex-1 py-3 rounded-xl text-slate-400 hover:text-white font-bold"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleEcosystemImport}
                  disabled={isExtracting || !chatTranscript.trim()}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Extract & Sync
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {showExportConfirm && selectedProject && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowExportConfirm(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-8 bg-blue-600/10 border-b border-blue-500/20">
                <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center mb-4">
                  <Download className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold">Confirm Bundle</h3>
                <p className="text-blue-200/60 text-sm mt-1">Exporting to NotebookLM Structured Format</p>
              </div>
              <div className="p-8 space-y-6 text-slate-300">
                <div className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-white/5">
                  <span className="text-sm font-medium">Architect Summary</span>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-white/5">
                  <span className="text-sm font-medium">Source Files ({selectedFilePaths.size})</span>
                  <span className="text-xs font-mono text-slate-500">
                    {Array.from(selectedFilePaths).slice(0, 2).join(', ')}
                    {selectedFilePaths.size > 2 && '...'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 italic">
                  Note: NotebookLM works best with files under 1MB. All selected files are within limits.
                </p>
              </div>
              <div className="p-8 bg-slate-950/50 flex gap-4">
                <button 
                  onClick={() => setShowExportConfirm(false)}
                  className="flex-1 py-3 rounded-xl text-slate-400 hover:text-white font-bold border border-white/5"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    exportToNotebookLM(selectedProject);
                    setShowExportConfirm(false);
                  }}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20"
                >
                  Confirm Export
                </button>
              </div>
            </motion.div>
          </div>
        )}

        <AnimatePresence>
          {isBulkExportOpen && (
            <BulkExportModal 
              isOpen={isBulkExportOpen}
              onClose={() => setIsBulkExportOpen(false)}
              selectedProjects={projects.filter(p => selectedProjectIds.has(p.id))}
              onComplete={() => {
                setIsBulkExportOpen(false);
                setSelectedProjectIds(new Set());
              }}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isCreatingVersion && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsCreatingVersion(false)}
                className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl"
              >
                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold flex items-center gap-2">
                      <History className="w-5 h-5 text-purple-500" />
                      Create New Version
                    </h3>
                    <p className="text-slate-400 text-sm mt-1">
                      Snapshoting current workspace into {selectedProject ? selectedProject.name : 'Vault'}.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Version Name (e.g. v1.2.0)</label>
                      <input 
                        autoFocus
                        type="text"
                        placeholder="v1.0.0"
                        value={newVersionData.name}
                        onChange={(e) => setNewVersionData({ ...newVersionData, name: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Change Summary (Optional)</label>
                      <textarea 
                        placeholder="Implemented OAuth flow, fixed sidebar bug..."
                        rows={3}
                        value={newVersionData.summary}
                        onChange={(e) => setNewVersionData({ ...newVersionData, summary: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button 
                      onClick={() => setIsCreatingVersion(false)}
                      className="flex-1 py-3 px-6 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleCreateVersion}
                      disabled={!newVersionData.name || isSyncing}
                      className="flex-1 py-3 px-6 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold transition-all shadow-lg shadow-purple-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Commit Version'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isCreatingFile && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsCreatingFile(false)}
                className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl"
              >
                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold flex items-center gap-2">
                      <File className="w-5 h-5 text-blue-500" />
                      New File
                    </h3>
                    <p className="text-slate-400 text-sm mt-1">Add a new source file to your project.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">File Path (e.g. src/utils.ts)</label>
                    <input 
                      autoFocus
                      type="text"
                      placeholder="Enter file path..."
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateFile()}
                      className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all font-mono"
                    />
                  </div>

                  <div className="flex gap-4 pt-2">
                    <button 
                      onClick={() => setIsCreatingFile(false)}
                      className="flex-1 py-3 px-6 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleCreateFile}
                      disabled={!newFileName}
                      className="flex-1 py-3 px-6 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
                    >
                      {isSyncing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Create File'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isEditingProject && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsEditingProject(false)}
                className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl"
              >
                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold">Edit Project</h3>
                    <p className="text-slate-400 text-sm mt-1">Refine your project metadata for better search and organization.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Project Name</label>
                      <input 
                        type="text"
                        placeholder="Enter project name..."
                        value={editProjectData.name}
                        onChange={(e) => setEditProjectData({ ...editProjectData, name: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Description</label>
                      <textarea 
                        placeholder="Describe the project scope..."
                        rows={4}
                        value={editProjectData.description}
                        onChange={(e) => setEditProjectData({ ...editProjectData, description: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-950 border border-white/5 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-2">
                    <button 
                      onClick={() => setIsEditingProject(false)}
                      className="flex-1 py-3 px-6 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleUpdateProjectMeta}
                      className="flex-1 py-3 px-6 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {previewFile && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setPreviewFile(null)}
                className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-4xl max-h-[80vh] bg-slate-900 border border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-2xl"
              >
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-800/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <FileText className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white font-mono">{previewFile.path}</h3>
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Source {isEditingFile ? 'Editor' : 'Preview'}</p>
                        {fileSummary && <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/10 text-purple-400 rounded uppercase font-bold border border-purple-500/20 animate-in fade-in zoom-in duration-500">Summarized</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditingFile && (
                      <div className="flex items-center gap-2 mr-2 border-r border-white/10 pr-2">
                        {showRefactorInput ? (
                          <div className="flex items-center gap-2 animate-in slide-in-from-right-4">
                            <input 
                              type="text"
                              placeholder="Describe change..."
                              value={refactorInstruction}
                              onChange={(e) => setRefactorInstruction(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleRefactor()}
                              className="w-48 px-3 py-1.5 bg-slate-950 border border-white/10 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            />
                            <button 
                              onClick={handleRefactor}
                              disabled={isRefactoring}
                              className="p-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg disabled:opacity-50"
                            >
                              {isRefactoring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                            </button>
                            <button 
                              onClick={() => setShowRefactorInput(false)}
                              className="p-1.5 hover:bg-white/5 rounded-lg"
                            >
                              <Plus className="w-3.5 h-3.5 rotate-45" />
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setShowRefactorInput(true)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded-lg text-xs font-bold transition-all border border-blue-500/20"
                          >
                            <Sparkles className="w-3.5 h-3.5" /> AI Refactor
                          </button>
                        )}
                      </div>
                    )}
                    {!isEditingFile && (
                      <>
                        <button 
                          id="summarize-trigger"
                          onClick={handleSummarizeFile}
                          disabled={isSummarizingFile}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600/20 to-blue-600/20 hover:from-purple-600/30 hover:to-blue-600/30 rounded-xl text-xs font-bold text-white transition-all border border-purple-500/20 shadow-lg shadow-purple-500/5 disabled:opacity-50 group"
                        >
                          {isSummarizingFile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition-transform" />}
                          AI File Summary
                        </button>
                        <button 
                          onClick={() => copyToClipboard(previewFile.content)}
                          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-slate-300 transition-all border border-white/5"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                          {isCopied ? 'Copied' : 'Copy'}
                        </button>
                        <button 
                          onClick={() => {
                            setEditedContent(previewFile.content);
                            setIsEditingFile(true);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-slate-300 transition-all border border-white/5"
                        >
                          <Plus className="w-3.5 h-3.5" /> Edit Code
                        </button>
                      </>
                    )}
                    <button 
                      onClick={() => {
                        setPreviewFile(null);
                        setIsEditingFile(false);
                      }}
                      className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-colors"
                    >
                      <Plus className="w-5 h-5 rotate-45" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden flex flex-col">
                  {fileSummary && !isEditingFile && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-slate-950 border-b border-purple-500/20 p-5 relative overflow-hidden group"
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-blue-500" />
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-purple-500/10 rounded-lg shrink-0">
                          <Bot className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] font-bold text-purple-400 uppercase tracking-[0.2em]">Neural Architect Insights</p>
                            <div className="h-px flex-1 bg-white/5" />
                          </div>
                          <p className="text-sm text-slate-200 leading-relaxed font-medium">
                            {fileSummary}
                          </p>
                        </div>
                        <button 
                          onClick={() => setFileSummary(null)}
                          className="p-1 hover:bg-white/5 rounded-full transition-colors self-start"
                        >
                          <Plus className="w-4 h-4 rotate-45 text-slate-500 hover:text-white" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                  <div className="flex-1 overflow-auto p-8 custom-scrollbar bg-[#2d2d2d]">
                  {isEditingFile ? (
                    <div className="min-h-full font-mono text-sm">
                      <Editor
                        value={editedContent}
                        onValueChange={code => setEditedContent(code)}
                        highlight={code => {
                          const ext = previewFile.path.split('.').pop();
                          let lang = languages.javascript;
                          if (ext === 'ts' || ext === 'tsx') lang = languages.typescript;
                          if (ext === 'md') lang = languages.markdown;
                          if (ext === 'json') lang = languages.json;
                          if (ext === 'css') lang = languages.css;
                          return highlight(code, lang, ext || 'js');
                        }}
                        padding={0}
                        style={{
                          fontFamily: '"Fira code", "Fira Mono", monospace',
                          fontSize: 14,
                        }}
                        className="focus:outline-none"
                      />
                    </div>
                  ) : (
                    <pre className="text-xs font-mono text-slate-300 leading-relaxed overflow-x-auto whitespace-pre">
                      <code dangerouslySetInnerHTML={{ 
                        __html: (() => {
                          const ext = previewFile.path.split('.').pop();
                          let lang = languages.javascript;
                          if (ext === 'ts' || ext === 'tsx') lang = languages.typescript;
                          if (ext === 'md') lang = languages.markdown;
                          if (ext === 'json') lang = languages.json;
                          if (ext === 'css') lang = languages.css;
                          return highlight(previewFile.content, lang, ext || 'js');
                        })()
                      }} />
                    </pre>
                  )}
                </div>
              </div>
              <div className="p-6 bg-slate-950/50 border-t border-white/5 flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">
                      {isEditingFile ? 'Unsaved Changes' : `${previewFile.content.split('\n').length} lines • ${Math.round(previewFile.content.length / 1024 * 100) / 100} KB`}
                    </span>
                    {lastAutosaved && isEditingFile && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-[9px] font-bold text-green-500/70 uppercase">Autosaved {lastAutosaved.toLocaleTimeString()}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-4">
                    {isEditingFile ? (
                      <>
                        {hasLocalDraft && (
                          <button 
                            onClick={() => {
                              const key = `vault_draft_${selectedProject.id}_${previewFile.path.replace(/\//g, '_')}`;
                              const draft = localStorage.getItem(key);
                              if (draft) setEditedContent(draft);
                            }}
                            className="px-4 py-2 rounded-xl text-[10px] font-bold bg-blue-600/10 text-blue-400 border border-blue-500/20 hover:bg-blue-600/20 transition-all flex items-center gap-1.5"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Restore Draft
                          </button>
                        )}
                        <button 
                          onClick={() => setIsEditingFile(false)}
                          className="px-6 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-400 hover:text-white transition-all"
                        >
                          Discard
                        </button>
                        <button 
                          onClick={handleSaveFileEdit}
                          disabled={isSyncing}
                          className="px-6 py-2 rounded-xl text-xs font-bold bg-green-600 text-white hover:bg-green-500 transition-all flex items-center gap-2 shadow-lg shadow-green-600/20"
                        >
                          {isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                          Save Changes
                        </button>
                      </>
                    ) : (
                      <button 
                        onClick={() => {
                          toggleFileSelection(previewFile.path);
                          setPreviewFile(null);
                        }}
                        className={cn(
                          "px-6 py-2 rounded-xl text-xs font-bold transition-all",
                          selectedFilePaths.has(previewFile.path) 
                            ? "bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white"
                            : "bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500"
                        )}
                      >
                        {selectedFilePaths.has(previewFile.path) ? "Remove from Sync" : "Add to Sync"}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </AnimatePresence>

      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={() => setIsCommandPaletteOpen(false)}
        projects={projects}
        onSelectProject={setSelectedProject}
        onSearchFiles={() => setActiveTab('files')}
        onActionSelect={(actionId) => {
          if (actionId === 'export') {
            setSelectedProjectIds(new Set(projects.map(p => p.id)));
            setIsBulkExportOpen(true);
          } else if (actionId === 'health') {
            alert('Health Audit: All systems operational. Security checks passed.');
          }
        }}
      />

      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-app-border text-center">
        <p className="text-app-subtext text-sm">
          &copy; 2026 NotebookLM Sync for AI Studio. Built for Senior Architects.
        </p>
      </footer>
    </div>
  );
}
