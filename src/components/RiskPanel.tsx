import React, { useState } from 'react';
import { WorkflowRiskReport, NodeRiskScore } from '../lib/risk';
import type { RiskSeverity } from '../lib/risk';
import { ShieldAlert, ShieldCheck, AlertTriangle, ChevronDown, ChevronRight, Info, XCircle } from 'lucide-react';

interface RiskPanelProps {
  report: WorkflowRiskReport;
  onNodeSelect?: (nodeId: string) => void;
}

const VERDICT_CONFIG = {
  safe:    { color: 'text-emerald-400', bg: 'bg-emerald-900/30', border: 'border-emerald-700', icon: ShieldCheck, label: 'SAFE' },
  caution: { color: 'text-yellow-400',  bg: 'bg-yellow-900/30',  border: 'border-yellow-700',  icon: AlertTriangle, label: 'CAUTION' },
  warning: { color: 'text-orange-400',  bg: 'bg-orange-900/30',  border: 'border-orange-700',  icon: AlertTriangle, label: 'WARNING' },
  danger:  { color: 'text-red-400',     bg: 'bg-red-900/30',     border: 'border-red-700',     icon: ShieldAlert, label: 'DANGER' },
};

const SEVERITY_COLORS: Record<RiskSeverity, string> = {
  info: 'bg-slate-600 text-slate-200',
  low: 'bg-blue-700 text-blue-100',
  medium: 'bg-yellow-700 text-yellow-100',
  high: 'bg-orange-700 text-orange-100',
  critical: 'bg-red-700 text-red-100',
};

function ScoreGauge({ score, verdict }: { score: number; verdict: string }) {
  const config = VERDICT_CONFIG[verdict as keyof typeof VERDICT_CONFIG] || VERDICT_CONFIG.safe;
  const rotation = (score / 100) * 180 - 90; // -90 to 90 degrees

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-32 h-16 overflow-hidden">
        {/* Background arc */}
        <div className="absolute inset-0 rounded-t-full border-4 border-slate-700" />
        {/* Score arc segments */}
        <div className="absolute inset-0 rounded-t-full border-4 border-transparent"
          style={{
            borderTopColor: score <= 20 ? '#10b981' : score <= 45 ? '#eab308' : score <= 70 ? '#f97316' : '#ef4444',
            clipPath: `polygon(0 100%, 50% 50%, ${50 + 50 * Math.cos((rotation - 90) * Math.PI / 180)}% ${50 + 50 * Math.sin((rotation - 90) * Math.PI / 180)}%, 0 0)`,
          }}
        />
        {/* Score number */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
          <div className={`text-2xl font-bold ${config.color}`}>{score}</div>
        </div>
      </div>
      <div className={`text-xs font-bold uppercase tracking-wider ${config.color}`}>
        {config.label}
      </div>
    </div>
  );
}

function FindingItem({ finding, onNodeSelect }: {
  key?: string;
  finding: WorkflowRiskReport['findings'][0];
  onNodeSelect?: (nodeId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-slate-700 rounded-md overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-800/50 transition-colors"
      >
        {expanded ? <ChevronDown className="w-3 h-3 text-slate-500 shrink-0" /> : <ChevronRight className="w-3 h-3 text-slate-500 shrink-0" />}
        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${SEVERITY_COLORS[finding.severity]}`}>
          {finding.severity}
        </span>
        <span className="text-xs text-slate-200 flex-1 truncate">{finding.title}</span>
        {finding.node_id && (
          <button
            onClick={(e) => { e.stopPropagation(); onNodeSelect?.(finding.node_id!); }}
            className="text-[10px] text-blue-400 hover:text-blue-300 font-mono shrink-0"
          >
            {finding.node_id}
          </button>
        )}
      </button>
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-slate-700/50">
          <p className="text-xs text-slate-400 mb-2">{finding.description}</p>
          <div className="flex items-start gap-1.5">
            <Info className="w-3 h-3 text-blue-400 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-300">{finding.suggestion}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function NodeRiskRow({ nodeScore, onNodeSelect }: {
  key?: string;
  nodeScore: NodeRiskScore;
  onNodeSelect?: (nodeId: string) => void;
}) {
  const riskColor = nodeScore.risk_level === 'critical' ? 'text-red-400'
    : nodeScore.risk_level === 'high' ? 'text-orange-400'
    : nodeScore.risk_level === 'medium' ? 'text-yellow-400'
    : 'text-slate-400';

  return (
    <tr className="border-b border-slate-700/50 hover:bg-slate-800/30">
      <td className="px-2 py-1.5">
        <button
          onClick={() => onNodeSelect?.(nodeScore.node_id)}
          className="text-xs text-blue-400 hover:text-blue-300 font-mono"
        >
          {nodeScore.node_name}
        </button>
      </td>
      <td className="px-2 py-1.5 text-[10px] text-slate-500 uppercase">{nodeScore.node_type}</td>
      <td className={`px-2 py-1.5 text-xs font-semibold ${riskColor}`}>
        {nodeScore.risk_level}
      </td>
      <td className="px-2 py-1.5 text-xs text-slate-400 text-right">
        {nodeScore.mitigated_score.toFixed(1)}
      </td>
      <td className="px-2 py-1.5 text-xs text-slate-500 text-right">
        {nodeScore.findings.length > 0 ? nodeScore.findings.length : '-'}
      </td>
    </tr>
  );
}

export function RiskPanel({ report, onNodeSelect }: RiskPanelProps) {
  const [section, setSection] = useState<'findings' | 'nodes' | 'summary'>('findings');
  const { summary } = report;

  return (
    <div className="h-full flex flex-col bg-[#1e293b] text-slate-200 overflow-hidden">
      {/* Score Header */}
      <div className={`p-4 border-b border-slate-700 ${VERDICT_CONFIG[report.verdict].bg}`}>
        <ScoreGauge score={report.overall_score} verdict={report.verdict} />

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="text-center">
            <div className="text-lg font-bold text-slate-200">{summary.total_nodes}</div>
            <div className="text-[10px] text-slate-400 uppercase">Nodes</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-orange-400">{summary.high_risk_nodes}</div>
            <div className="text-[10px] text-slate-400 uppercase">High Risk</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-red-400">{summary.total_findings}</div>
            <div className="text-[10px] text-slate-400 uppercase">Findings</div>
          </div>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex border-b border-slate-700">
        {(['findings', 'nodes', 'summary'] as const).map(s => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={`flex-1 px-3 py-2 text-xs font-medium capitalize transition-colors ${
              section === s ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800/50' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {s}
            {s === 'findings' && summary.total_findings > 0 && (
              <span className="ml-1.5 bg-red-700 text-red-100 text-[10px] px-1.5 py-0.5 rounded-full">
                {summary.total_findings}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {section === 'findings' && (
          <div className="flex flex-col gap-2">
            {report.findings.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-slate-500">
                <ShieldCheck className="w-8 h-8 mb-2 text-emerald-500" />
                <p className="text-sm">No risk findings detected</p>
              </div>
            ) : (
              <>
                {/* Group by severity */}
                {(['critical', 'high', 'medium', 'low', 'info'] as RiskSeverity[]).map(severity => {
                  const items = report.findings.filter(f => f.severity === severity);
                  if (items.length === 0) return null;
                  return (
                    <div key={severity}>
                      <div className="text-[10px] uppercase font-bold text-slate-500 mb-1 mt-2">{severity} ({items.length})</div>
                      {items.map((f, i) => (
                        <FindingItem key={`${f.rule_id}-${i}`} finding={f} onNodeSelect={onNodeSelect} />
                      ))}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {section === 'nodes' && (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-600">
                <th className="px-2 py-1.5 text-[10px] text-slate-500 uppercase">Node</th>
                <th className="px-2 py-1.5 text-[10px] text-slate-500 uppercase">Type</th>
                <th className="px-2 py-1.5 text-[10px] text-slate-500 uppercase">Risk</th>
                <th className="px-2 py-1.5 text-[10px] text-slate-500 uppercase text-right">Score</th>
                <th className="px-2 py-1.5 text-[10px] text-slate-500 uppercase text-right">Issues</th>
              </tr>
            </thead>
            <tbody>
              {report.node_scores.map(ns => (
                <NodeRiskRow key={ns.node_id} nodeScore={ns} onNodeSelect={onNodeSelect} />
              ))}
            </tbody>
          </table>
        )}

        {section === 'summary' && (
          <div className="flex flex-col gap-3">
            {/* Permissions */}
            {summary.permissions_required.length > 0 && (
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Permissions Required</div>
                <div className="flex flex-wrap gap-1">
                  {summary.permissions_required.map(p => (
                    <span key={p} className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded font-mono">{p}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Secrets */}
            {summary.secrets_required.length > 0 && (
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Secrets Referenced</div>
                <div className="flex flex-wrap gap-1">
                  {summary.secrets_required.map(s => (
                    <span key={s} className="text-[10px] bg-amber-900/50 text-amber-300 px-2 py-0.5 rounded font-mono">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Cost */}
            {summary.estimated_cost !== null && (
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Estimated Cost</div>
                <div className="text-sm font-semibold text-slate-200">${summary.estimated_cost.toFixed(2)}</div>
              </div>
            )}

            {/* Approval Gates */}
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Approval Gates</div>
              <div className={`text-xs ${summary.has_approval_gates ? 'text-emerald-400' : 'text-orange-400'}`}>
                {summary.has_approval_gates ? 'Present' : 'None detected'}
              </div>
            </div>

            {/* Severity Breakdown */}
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Finding Breakdown</div>
              <div className="flex gap-2">
                {(['critical', 'high', 'medium', 'low', 'info'] as RiskSeverity[]).map(sev => (
                  <div key={sev} className="text-center">
                    <div className={`text-sm font-bold ${
                      sev === 'critical' ? 'text-red-400' :
                      sev === 'high' ? 'text-orange-400' :
                      sev === 'medium' ? 'text-yellow-400' :
                      sev === 'low' ? 'text-blue-400' : 'text-slate-400'
                    }`}>{summary.by_severity[sev]}</div>
                    <div className="text-[10px] text-slate-500 capitalize">{sev}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
