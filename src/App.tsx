import React, { useState, useEffect, useRef, useMemo } from 'react';
import { parseOsop } from './lib/osop-parser';
import { OsopWorkflow } from './types/osop';
import { GraphView } from './components/GraphView';
import { StoryView } from './components/StoryView';
import { RoleView } from './components/RoleView';
import { AgentView } from './components/AgentView';
import { McpCliSkeleton } from './components/McpCliSkeleton';
import { RiskPanel } from './components/RiskPanel';
import { LedgerView } from './components/LedgerView';
import { LayoutGrid, BookOpen, Users, Bot, TerminalSquare, Clock, FileText, FolderOpen, Save, Download, ChevronDown, Sparkles, Loader2, Send, Globe, FileOutput, ShieldAlert, ScrollText } from 'lucide-react';
import { OSOP_TEMPLATES } from './lib/templates';
import { generateOsopFromPrompt } from './lib/ai-generate';
import { generateHtmlReport } from './lib/report/html-report';
import { analyzeWorkflowRisk, WorkflowRiskReport } from './lib/risk';
import { parseOsopLog, isOsopLogFile } from './lib/execution/log-parser';
import { WorkflowRunRecord } from './lib/execution/types';
import { runStore } from './lib/execution/store';
import { useT, LOCALE_OPTIONS } from './i18n';

type TabType = 'graph' | 'story' | 'role' | 'agent' | 'mcp' | 'ledger';

const EXAMPLE_FILES = [
  { nameKey: 'example.esgPipeline', file: 'esg_pipeline.osop' },
  { nameKey: 'example.conditionalApproval', file: 'conditional_approval.osop' },
  { nameKey: 'example.multiAgent', file: 'multi_agent_collab.osop' },
  { nameKey: 'example.cicdRelease', file: 'cicd_release.osop' },
  { nameKey: 'example.retryLoop', file: 'retry_loop.osop' },
  { nameKey: 'example.fallbackError', file: 'fallback_error.osop' },
  { nameKey: 'example.b2bSupplyChain', file: 'b2b_supply_chain.osop' },
  { nameKey: 'example.dailyStandup', file: 'daily_standup_bot.osop' },
  { nameKey: 'example.meetingPrep', file: 'meeting_prep.osop' },
  { nameKey: 'example.prReview', file: 'pr_review_pipeline.osop' },
  { nameKey: 'example.translateLocalize', file: 'translate_localize.osop' },
  { nameKey: 'example.competitorResearch', file: 'competitor_research.osop' },
  { nameKey: 'example.repoSetup', file: 'repo_setup.osop' },
  { nameKey: 'example.emailTriage', file: 'email_triage.osop' },
  { nameKey: 'example.weeklyReport', file: 'weekly_report.osop' },
  { nameKey: 'example.bugTriage', file: 'bug_triage.osop' },
  { nameKey: 'example.agentResearch', file: 'agent_research.osop' },
  { nameKey: 'example.riskDemo', file: 'risk_analysis_demo.osop' },
];

export default function App() {
  const { t, locale, setLocale } = useT();
  const [selectedTemplateId, setSelectedTemplateId] = useState(OSOP_TEMPLATES[0].id);
  const [yamlText, setYamlText] = useState(OSOP_TEMPLATES[0].yaml);
  const [workflow, setWorkflow] = useState<OsopWorkflow | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('graph');
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [showExamples, setShowExamples] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [riskOverlay, setRiskOverlay] = useState(false);
  const [showRiskPanel, setShowRiskPanel] = useState(false);
  const [importedRun, setImportedRun] = useState<WorkflowRunRecord | null>(null);
  const [playbackNodeId, setPlaybackNodeId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from URL parameter: ?yaml=... (URL-encoded YAML)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const yamlParam = params.get('yaml');
    if (yamlParam) {
      try {
        const decoded = decodeURIComponent(yamlParam);
        setYamlText(decoded);
        setFileName('imported.osop.yaml');
      } catch { /* ignore decode errors */ }
    }
  }, []);

  useEffect(() => {
    const parsed = parseOsop(yamlText);
    if (parsed) {
      setWorkflow(parsed);
      setError(null);
    } else {
      setError(t('error.invalidYaml'));
    }
  }, [yamlText, t]);

  const riskReport = useMemo<WorkflowRiskReport | null>(() => {
    if (!workflow) return null;
    return analyzeWorkflowRisk(workflow);
  }, [workflow]);

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tpl = OSOP_TEMPLATES.find(t => t.id === e.target.value);
    if (tpl) {
      setSelectedTemplateId(tpl.id);
      setYamlText(tpl.yaml);
      setFileName(null);
    }
  };

  const handleOpenFile = () => fileInputRef.current?.click();

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (isOsopLogFile(file.name)) {
        const run = parseOsopLog(content);
        if (run) {
          setImportedRun(run);
          runStore.saveRun(run);
          setActiveTab('ledger');
          setFileName(file.name);
        }
      } else {
        setYamlText(content);
        setFileName(file.name);
        setSelectedTemplateId('');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

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

  const handleGenerateReport = () => {
    const html = generateHtmlReport(yamlText);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const baseName = fileName?.replace(/\.(osop|yaml|yml)$/g, '') || workflow?.id || 'workflow';
    a.download = `${baseName}-report.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim() || aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const yaml = await generateOsopFromPrompt(aiPrompt.trim());
      setYamlText(yaml);
      setFileName('ai-generated.osop');
      setSelectedTemplateId('');
      setShowAiPanel(false);
      setAiPrompt('');
    } catch (err: any) {
      setAiError(err.message || t('error.aiGeneration'));
    } finally {
      setAiLoading(false);
    }
  };

  const handleLoadExample = async (exampleFile: string) => {
    try {
      const resp = await fetch(`/examples/${exampleFile}`);
      if (!resp.ok) throw new Error(`Failed to load ${exampleFile}`);
      const content = await resp.text();
      setYamlText(content);
      setFileName(exampleFile);
      setSelectedTemplateId('');
      setShowExamples(false);
    } catch {
      setError(t('error.loadExample', { filename: exampleFile }));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (isOsopLogFile(file.name)) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const run = parseOsopLog(ev.target?.result as string);
        if (run) {
          setImportedRun(run);
          runStore.saveRun(run);
          setActiveTab('ledger');
          setFileName(file.name);
        }
      };
      reader.readAsText(file);
    } else if (file.name.endsWith('.osop') || file.name.endsWith('.yaml') || file.name.endsWith('.yml')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setYamlText(ev.target?.result as string);
        setFileName(file.name);
        setSelectedTemplateId('');
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#0f172a] text-slate-200 overflow-hidden font-sans">

      <input
        ref={fileInputRef}
        type="file"
        accept=".osop,.osop.yaml,.osop.yml,.osoplog,.osoplog.yaml,.yaml,.yml"
        onChange={handleFileSelected}
        className="hidden"
      />

      {/* Left Panel: Editor */}
      <div className="w-1/3 h-full flex flex-col border-r border-slate-800 bg-[#1e293b]">
        <div className="p-4 border-b border-slate-800 bg-[#0f172a]">
          {/* Header Row */}
          <div className="flex justify-between items-center mb-3">
            <div>
              <h1 className="font-bold text-lg text-white tracking-tight">{t('app.title')}</h1>
              <p className="text-xs text-slate-400">{t('app.subtitle')}</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Language Selector */}
              <div className="flex items-center bg-slate-800 rounded border border-slate-700">
                <Globe className="w-3 h-3 text-slate-400 ml-2" />
                {LOCALE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setLocale(opt.value)}
                    className={
                      "px-2 py-1 text-xs font-medium transition-colors " +
                      (locale === opt.value
                        ? "bg-blue-600 text-white"
                        : "text-slate-400 hover:text-white")
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {/* Run button — Phase 2: AI agents generate .osoplog for replay */}
            </div>
          </div>

          {/* File Actions Row */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <button
              onClick={handleOpenFile}
              className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded text-xs font-medium transition-colors"
              title={t('tooltip.openFile')}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              {t('button.open')}
            </button>
            <button
              onClick={handleSaveFile}
              className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded text-xs font-medium transition-colors"
              title={t('tooltip.saveFile')}
            >
              <Save className="w-3.5 h-3.5" />
              {t('button.save')}
            </button>
            <button
              onClick={handleGenerateReport}
              className="flex items-center gap-1.5 bg-indigo-700 hover:bg-indigo-600 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
              title="Generate HTML Report"
            >
              <FileOutput className="w-3.5 h-3.5" />
              Report
            </button>
            <div className="relative">
              <button
                onClick={() => setShowExamples(!showExamples)}
                className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
                title={t('tooltip.loadExamples')}
              >
                <Download className="w-3.5 h-3.5" />
                {t('button.examples')}
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
                        <div className="font-medium">{t(ex.nameKey)}</div>
                        <div className="text-slate-500">{ex.file}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowAiPanel(!showAiPanel)}
              className={
                "flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors " +
                (showAiPanel
                  ? "bg-violet-500 text-white"
                  : "bg-violet-700 hover:bg-violet-600 text-white")
              }
              title={t('tooltip.aiGenerate')}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {t('button.aiGenerate')}
            </button>
          </div>

          {/* AI Generation Panel */}
          {showAiPanel && (
            <div className="mb-3 bg-violet-950/50 border border-violet-800 rounded-lg p-3">
              <div className="text-xs text-violet-300 mb-2 font-medium">
                {t('ai.describePrompt')}
              </div>
              <div className="flex gap-2">
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAiGenerate();
                    }
                  }}
                  placeholder={t('ai.placeholder')}
                  className="flex-1 bg-slate-900 text-slate-200 text-xs rounded px-3 py-2 border border-violet-800 focus:outline-none focus:border-violet-500 resize-none font-sans"
                  rows={3}
                  disabled={aiLoading}
                />
                <button
                  onClick={handleAiGenerate}
                  disabled={aiLoading || !aiPrompt.trim()}
                  className="self-end flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-2 rounded text-xs font-medium transition-colors"
                >
                  {aiLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  {aiLoading ? t('button.generating') : t('button.generate')}
                </button>
              </div>
              {aiError && (
                <div className="mt-2 text-xs text-red-400 bg-red-900/30 rounded px-2 py-1">
                  {aiError}
                </div>
              )}
            </div>
          )}

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
            <option value="" disabled>{t('template.placeholder')}</option>
            {OSOP_TEMPLATES.map(tpl => (
              <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
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
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={handleDrop}
            className="w-full h-full bg-[#1e293b] text-slate-300 p-4 font-mono text-sm resize-none focus:outline-none"
            spellCheck={false}
            placeholder={t('editor.placeholder')}
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
          <TabButton active={activeTab === 'graph'} onClick={() => setActiveTab('graph')} icon={<LayoutGrid className="w-4 h-4" />} label={t('tab.graph')} />
          <TabButton active={activeTab === 'story'} onClick={() => setActiveTab('story')} icon={<BookOpen className="w-4 h-4" />} label={t('tab.story')} />
          <TabButton active={activeTab === 'role'} onClick={() => setActiveTab('role')} icon={<Users className="w-4 h-4" />} label={t('tab.role')} />
          <TabButton active={activeTab === 'agent'} onClick={() => setActiveTab('agent')} icon={<Bot className="w-4 h-4" />} label={t('tab.agent')} />
          <div className="flex-1" />
          <TabButton active={activeTab === 'ledger'} onClick={() => setActiveTab('ledger')} icon={<ScrollText className="w-4 h-4" />} label="Ledger" />
          {/* Risk Analysis Toggle */}
          <button
            onClick={() => { setShowRiskPanel(!showRiskPanel); setRiskOverlay(!showRiskPanel); }}
            className={
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all " +
              (showRiskPanel
                ? "bg-red-100 text-red-700 shadow-sm border border-red-200"
                : "text-slate-500 hover:bg-slate-200 hover:text-slate-700")
            }
            title="Toggle Risk Analysis"
          >
            <ShieldAlert className="w-4 h-4" />
            Risk
            {riskReport && riskReport.overall_score > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                riskReport.verdict === 'danger' ? 'bg-red-600 text-white' :
                riskReport.verdict === 'warning' ? 'bg-orange-500 text-white' :
                riskReport.verdict === 'caution' ? 'bg-yellow-500 text-white' :
                'bg-emerald-500 text-white'
              }`}>
                {riskReport.overall_score}
              </span>
            )}
          </button>
          <TabButton active={activeTab === 'mcp'} onClick={() => setActiveTab('mcp')} icon={<TerminalSquare className="w-4 h-4" />} label={t('tab.mcp')} />
        </div>

        {/* View Content */}
        <div className="flex-1 overflow-hidden relative flex flex-col">
          {workflow ? (
            <>
              {workflow.metadata && (
                <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center gap-4 text-xs text-slate-600">
                  {workflow.metadata.version && (
                    <span className="font-semibold text-slate-700">v{workflow.metadata.version}</span>
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
              <div className="flex-1 overflow-hidden relative flex">
                <div className={`${showRiskPanel ? 'flex-1' : 'w-full'} overflow-hidden`}>
                  {activeTab === 'graph' && <GraphView workflow={workflow} riskReport={riskReport} riskOverlay={riskOverlay} executionNodeId={playbackNodeId} />}
                  {activeTab === 'story' && <StoryView workflow={workflow} />}
                  {activeTab === 'role' && <RoleView workflow={workflow} />}
                  {activeTab === 'agent' && <AgentView workflow={workflow} />}
                  {activeTab === 'ledger' && <LedgerView workflow={workflow} importedRun={importedRun} onStepChange={(_step, nodeId) => setPlaybackNodeId(nodeId)} />}
                  {activeTab === 'mcp' && <McpCliSkeleton />}
                </div>
                {showRiskPanel && riskReport && (
                  <div className="w-80 border-l border-slate-200 shrink-0">
                    <RiskPanel report={riskReport} />
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">
              {t('message.fixYaml')}
            </div>
          )}
        </div>
      </div>

      {showExamples && (
        <div className="fixed inset-0 z-40" onClick={() => setShowExamples(false)} />
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
