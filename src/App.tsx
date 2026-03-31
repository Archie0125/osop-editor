import React, { useState, useEffect, useRef } from 'react';
import { parseOsop } from './lib/osop-parser';
import { OsopWorkflow } from './types/osop';
import { GraphView } from './components/GraphView';
import { StoryView } from './components/StoryView';
import { RoleView } from './components/RoleView';
import { AgentView } from './components/AgentView';
import { McpCliSkeleton } from './components/McpCliSkeleton';
import { LayoutGrid, BookOpen, Users, Bot, TerminalSquare, Play, Clock, FileText, FolderOpen, Save, Download, Upload, ChevronDown } from 'lucide-react';
import { OSOP_TEMPLATES } from './lib/templates';

type TabType = 'graph' | 'story' | 'role' | 'agent' | 'mcp';

const EXAMPLE_FILES = [
  { name: 'ESG PDF Pipeline', file: 'esg_pipeline.osop' },
  { name: 'Conditional Approval (IF/ELSE)', file: 'conditional_approval.osop' },
  { name: 'Multi-Agent Collaboration', file: 'multi_agent_collab.osop' },
  { name: 'CI/CD Release Pipeline', file: 'cicd_release.osop' },
  { name: 'Retry Loop', file: 'retry_loop.osop' },
  { name: 'Fallback Error Handling', file: 'fallback_error.osop' },
];

export default function App() {
  const [selectedTemplateId, setSelectedTemplateId] = useState(OSOP_TEMPLATES[0].id);
  const [yamlText, setYamlText] = useState(OSOP_TEMPLATES[0].yaml);
  const [workflow, setWorkflow] = useState<OsopWorkflow | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('graph');
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [showExamples, setShowExamples] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const parsed = parseOsop(yamlText);
    if (parsed) {
      setWorkflow(parsed);
      setError(null);
    } else {
      setError("Invalid OSOP YAML format.");
    }
  }, [yamlText]);

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tpl = OSOP_TEMPLATES.find(t => t.id === e.target.value);
    if (tpl) {
      setSelectedTemplateId(tpl.id);
      setYamlText(tpl.yaml);
      setFileName(null);
    }
  };

  // --- .osop File Import ---
  const handleOpenFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setYamlText(content);
      setFileName(file.name);
      setSelectedTemplateId('');
    };
    reader.readAsText(file);

    // Reset input so the same file can be re-loaded
    e.target.value = '';
  };

  // --- .osop File Export ---
  const handleSaveFile = () => {
    const defaultName = fileName || (workflow?.id ? `${workflow.id}.osop` : 'workflow.osop');
    const blob = new Blob([yamlText], { type: 'application/x-yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultName.endsWith('.osop') ? defaultName : `${defaultName}.osop`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // --- Load Example .osop from public/examples/ ---
  const handleLoadExample = async (exampleFile: string) => {
    try {
      const resp = await fetch(`/examples/${exampleFile}`);
      if (!resp.ok) throw new Error(`Failed to load ${exampleFile}`);
      const content = await resp.text();
      setYamlText(content);
      setFileName(exampleFile);
      setSelectedTemplateId('');
      setShowExamples(false);
    } catch (err) {
      setError(`Failed to load example: ${exampleFile}`);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#0f172a] text-slate-200 overflow-hidden font-sans">

      {/* Hidden file input for .osop import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".osop,.osop.yaml,.osop.yml,.yaml,.yml"
        onChange={handleFileSelected}
        className="hidden"
      />

      {/* Left Panel: Editor */}
      <div className="w-1/3 h-full flex flex-col border-r border-slate-800 bg-[#1e293b]">
        <div className="p-4 border-b border-slate-800 bg-[#0f172a]">
          {/* Header Row */}
          <div className="flex justify-between items-center mb-3">
            <div>
              <h1 className="font-bold text-lg text-white tracking-tight">OSOP Editor</h1>
              <p className="text-xs text-slate-400">Process Operating System v1.0</p>
            </div>
            <button
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
            >
              <Play className="w-4 h-4" />
              Run
            </button>
          </div>

          {/* File Actions Row */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={handleOpenFile}
              className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded text-xs font-medium transition-colors"
              title="Open .osop file"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Open
            </button>
            <button
              onClick={handleSaveFile}
              className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded text-xs font-medium transition-colors"
              title="Save as .osop file"
            >
              <Save className="w-3.5 h-3.5" />
              Save .osop
            </button>
            <div className="relative">
              <button
                onClick={() => setShowExamples(!showExamples)}
                className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
                title="Load example .osop files"
              >
                <Download className="w-3.5 h-3.5" />
                Examples
                <ChevronDown className="w-3 h-3" />
              </button>
              {showExamples && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-slate-800 border border-slate-700 rounded-md shadow-lg z-50">
                  {EXAMPLE_FILES.map((ex) => (
                    <button
                      key={ex.file}
                      onClick={() => handleLoadExample(ex.file)}
                      className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-700 transition-colors flex items-center gap-2"
                    >
                      <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <div>
                        <div className="font-medium">{ex.name}</div>
                        <div className="text-slate-500">{ex.file}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Current file indicator */}
          {fileName && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 mb-2">
              <FileText className="w-3 h-3" />
              <span className="font-mono">{fileName}</span>
            </div>
          )}

          {/* Template Selector */}
          <select
            value={selectedTemplateId}
            onChange={handleTemplateChange}
            className="bg-slate-800 text-slate-200 text-xs rounded px-2 py-1 border border-slate-700 focus:outline-none focus:border-blue-500 w-full"
          >
            <option value="" disabled>-- Built-in Templates --</option>
            {OSOP_TEMPLATES.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 relative">
          <textarea
            value={yamlText}
            onChange={(e) => setYamlText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Tab') {
                e.preventDefault();
                const target = e.target as HTMLTextAreaElement;
                const start = target.selectionStart;
                const end = target.selectionEnd;
                const newValue = yamlText.substring(0, start) + '  ' + yamlText.substring(end);
                setYamlText(newValue);
                setTimeout(() => {
                  target.selectionStart = target.selectionEnd = start + 2;
                }, 0);
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const file = e.dataTransfer.files?.[0];
              if (file && (file.name.endsWith('.osop') || file.name.endsWith('.yaml') || file.name.endsWith('.yml'))) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                  const content = ev.target?.result as string;
                  setYamlText(content);
                  setFileName(file.name);
                  setSelectedTemplateId('');
                };
                reader.readAsText(file);
              }
            }}
            className="w-full h-full bg-[#1e293b] text-slate-300 p-4 font-mono text-sm resize-none focus:outline-none"
            spellCheck={false}
            placeholder="Drag & drop a .osop file here, or use Open button..."
          />
          {error && (
            <div className="absolute bottom-0 left-0 right-0 bg-red-900/90 text-red-200 p-2 text-xs font-mono border-t border-red-800">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Multi-View Output */}
      <div className="w-2/3 h-full flex flex-col bg-white text-slate-900">

        {/* View Tabs */}
        <div className="flex items-center gap-1 p-2 bg-slate-100 border-b border-slate-200">
          <TabButton
            active={activeTab === 'graph'}
            onClick={() => setActiveTab('graph')}
            icon={<LayoutGrid className="w-4 h-4" />}
            label="Graph View"
          />
          <TabButton
            active={activeTab === 'story'}
            onClick={() => setActiveTab('story')}
            icon={<BookOpen className="w-4 h-4" />}
            label="Story View"
          />
          <TabButton
            active={activeTab === 'role'}
            onClick={() => setActiveTab('role')}
            icon={<Users className="w-4 h-4" />}
            label="Role View"
          />
          <TabButton
            active={activeTab === 'agent'}
            onClick={() => setActiveTab('agent')}
            icon={<Bot className="w-4 h-4" />}
            label="Agent View"
          />
          <div className="flex-1" />
          <TabButton
            active={activeTab === 'mcp'}
            onClick={() => setActiveTab('mcp')}
            icon={<TerminalSquare className="w-4 h-4" />}
            label="MCP / CLI Code"
          />
        </div>

        {/* View Content */}
        <div className="flex-1 overflow-hidden relative flex flex-col">
          {workflow ? (
            <>
              {workflow.metadata && (
                <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center gap-4 text-xs text-slate-600">
                  {workflow.metadata.version && (
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-slate-700">v{workflow.metadata.version}</span>
                    </div>
                  )}
                  {workflow.metadata.creation_date && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {workflow.metadata.creation_date}
                    </div>
                  )}
                  {workflow.metadata.change_summary && (
                    <div className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {workflow.metadata.change_summary}
                    </div>
                  )}
                </div>
              )}
              <div className="flex-1 overflow-hidden relative">
                {activeTab === 'graph' && <GraphView workflow={workflow} />}
                {activeTab === 'story' && <StoryView workflow={workflow} />}
                {activeTab === 'role' && <RoleView workflow={workflow} />}
                {activeTab === 'agent' && <AgentView workflow={workflow} />}
                {activeTab === 'mcp' && <McpCliSkeleton />}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">
              Please fix YAML errors to view the visualization.
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close examples dropdown */}
      {showExamples && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowExamples(false)}
        />
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={
        "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all " +
        (active
          ? "bg-white text-blue-600 shadow-sm border border-slate-200"
          : "text-slate-600 hover:bg-slate-200 hover:text-slate-900")
      }
    >
      {icon}
      {label}
    </button>
  );
}
