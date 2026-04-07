import React, { useState, useEffect, useRef, Component } from 'react';
import {
  UploadCloud, FileText, CheckCircle, AlertTriangle, Shield,
  Users, Activity, BarChart2, Cpu, Settings, ChevronRight,
  RefreshCw, Bell, Check, BookOpen, Briefcase,
  TrendingUp, TrendingDown, Eye, Lock, ClipboardList,
  GitBranch, Clock, Zap, Info, XCircle, Target, Layers
} from 'lucide-react';

const API_URL = 'http://localhost:8000';
const MODEL_NAME = 'Gemini 2.5 Pro';

/* ════════════════════════════════════════════
   ERROR BOUNDARY
════════════════════════════════════════════ */
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(err) { return { error: err }; }
  render() {
    if (this.state.error) return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
        <div className="max-w-lg bg-rose-900/20 border border-rose-500/30 rounded-2xl p-8 text-center">
          <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-white mb-2">Render Error</h2>
          <p className="text-rose-300 text-sm font-mono">{this.state.error.message}</p>
        </div>
      </div>
    );
    return this.props.children;
  }
}

/* ════════════════════════════════════════════
   STATIC DATA
════════════════════════════════════════════ */
const SCAN_LOGS = [
  { id: 0, text: 'Uploading document to FairAI Compliance Layer...', type: 'info' },
  { id: 1, text: 'Parsing resume structure and extracting content...', type: 'info' },
  { id: 2, text: 'Gemini 2.5 Pro model initializing...', type: 'info' },
  { id: 3, text: 'Running unbiased competency evaluation...', type: 'warn' },
  { id: 4, text: 'Scanning for bias proxy variables...', type: 'alert' },
  { id: 5, text: 'Running counterfactual fairness test...', type: 'alert' },
  { id: 6, text: 'Applying demographic parity constraints...', type: 'info' },
  { id: 7, text: 'Finalizing compliance audit report...', type: 'success' },
];

const SEVERITY_STYLE = {
  high:   { bg: 'bg-rose-500/10',  border: 'border-rose-500/30',  text: 'text-rose-400',   dot: 'bg-rose-500' },
  medium: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400',  dot: 'bg-amber-500' },
  low:    { bg: 'bg-sky-500/10',   border: 'border-sky-500/30',   text: 'text-sky-400',    dot: 'bg-sky-500'  },
};

const BIAS_TYPE_LABELS = {
  gender:       { label: 'Gender Proxy',     color: 'text-rose-400',  bg: 'bg-rose-500/10',  border: 'border-rose-500/20'  },
  age:          { label: 'Age Proxy',        color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  name:         { label: 'Name Bias',        color: 'text-orange-400',bg: 'bg-orange-500/10',border: 'border-orange-500/20'},
  institution:  { label: 'Institution',      color: 'text-purple-400',bg: 'bg-purple-500/10',border: 'border-purple-500/20'},
  gap:          { label: 'Career Gap',       color: 'text-pink-400',  bg: 'bg-pink-500/10',  border: 'border-pink-500/20'  },
  location:     { label: 'Location',         color: 'text-cyan-400',  bg: 'bg-cyan-500/10',  border: 'border-cyan-500/20'  },
  socioeconomic:{ label: 'Socioeconomic',    color: 'text-yellow-400',bg: 'bg-yellow-500/10',border: 'border-yellow-500/20'},
};

/* ════════════════════════════════════════════
   COMPONENTS
════════════════════════════════════════════ */
function ScoreMeter({ value, color }) {
  const R = 40;
  const circ = 2 * 3.14159 * R;
  const offset = circ * (1 - Math.max(0, Math.min(100, value)) / 100);
  const colors = {
    rose:    { s: '#dc2626', e: '#f87171' },
    indigo:  { s: '#6366f1', e: '#22d3ee' },
    emerald: { s: '#10b981', e: '#2dd4bf' },
  };
  const c = colors[color] || colors.indigo;
  const gid = 'meter-' + color;
  return (
    <div style={{ position: 'relative', width: 160, height: 160 }}>
      <svg width="160" height="160" viewBox="0 0 100 100"
        style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <defs>
          <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={c.s} />
            <stop offset="100%" stopColor={c.e} />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={R} fill="none" stroke="#1e293b" strokeWidth="10" />
        <circle cx="50" cy="50" r={R} fill="none"
          stroke={'url(#' + gid + ')'} strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={String(circ)}
          strokeDashoffset={String(offset)} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span className="text-3xl font-black text-white leading-none">{value}</span>
        <span className="text-xs text-slate-500 mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

function RadarChart({ data }) {
  const SIZE  = 320;
  const CX    = SIZE / 2;
  const CY    = SIZE / 2;
  const R     = 100;
  const N     = 6;
  const START = -Math.PI / 2;
  const STEP  = (2 * Math.PI) / N;

  const LABELS = ['Tech Depth', 'Problem Solving', 'Impact', 'Domain KW', 'Complexity', 'Communication'];
  const KEYS   = ['technical_depth', 'problem_solving', 'impact_evidence', 'domain_knowledge', 'project_complexity', 'communication_clarity'];
  const LEVELS = [0.2, 0.4, 0.6, 0.8, 1.0];

  function pt(angle, radius) {
    return { x: CX + radius * Math.cos(angle), y: CY + radius * Math.sin(angle) };
  }

  // Outer hexagon grid
  const gridPolys = LEVELS.map(function(lvl) {
    return Array.from({ length: N }, function(_, i) {
      const p = pt(START + i * STEP, R * lvl);
      return p.x + ',' + p.y;
    }).join(' ');
  });

  // Data polygon
  const dataPts = KEYS.map(function(key, i) {
    const v = Math.max(0, Math.min(100, data[key] || 0));
    const p = pt(START + i * STEP, R * (v / 100));
    return p.x + ',' + p.y;
  }).join(' ');

  // Axis endpoints and labels
  const axes = KEYS.map(function(key, i) {
    const angle = START + i * STEP;
    const outer = pt(angle, R);
    const label = pt(angle, R * 1.38);
    return { outer, label, text: LABELS[i], value: data[key] || 0, key };
  });

  return (
    <div className="flex flex-col items-center">
      <svg width={SIZE} height={SIZE} viewBox={'0 0 ' + SIZE + ' ' + SIZE} style={{ overflow: 'visible' }}>
        {/* Grid hexagons */}
        {gridPolys.map(function(pts, i) {
          return <polygon key={i} points={pts} fill="none" stroke="#1e293b" strokeWidth="1.5" />;
        })}
        {/* Grid level labels */}
        {LEVELS.map(function(lvl, i) {
          const p = pt(START + 0.5 * STEP, R * lvl);
          return (
            <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
              fontSize="8" fill="#475569">{(lvl * 100).toFixed(0)}</text>
          );
        })}
        {/* Axis lines */}
        {axes.map(function(ax, i) {
          return <line key={i} x1={CX} y1={CY} x2={ax.outer.x} y2={ax.outer.y} stroke="#1e293b" strokeWidth="1.5" />;
        })}
        {/* Data area */}
        <polygon points={dataPts} fill="rgba(99,102,241,0.15)" stroke="#6366f1" strokeWidth="2.5" />
        {/* Data dots */}
        {axes.map(function(ax, i) {
          const angle = START + i * STEP;
          const v = Math.max(0, Math.min(100, ax.value));
          const p = pt(angle, R * (v / 100));
          return (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="5" fill="#6366f1" stroke="#c7d2fe" strokeWidth="1.5" />
            </g>
          );
        })}
        {/* Axis labels */}
        {axes.map(function(ax, i) {
          return (
            <text key={i} x={ax.label.x} y={ax.label.y}
              textAnchor="middle" dominantBaseline="middle"
              fontSize="9.5" fontWeight="600" fill="#94a3b8">
              {ax.text}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function SectionHeading({ icon, label }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-indigo-400">{icon}</span>
      <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</span>
    </div>
  );
}

function MetaCell({ label, value, icon }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-0.5">{icon} {label}</div>
      <div className="text-sm font-semibold text-slate-200">{value}</div>
    </div>
  );
}

function Pill({ children, variant }) {
  const m = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    rose:    'bg-rose-500/10    text-rose-400    border-rose-500/20',
    indigo:  'bg-indigo-500/10  text-indigo-400  border-indigo-500/20',
    amber:   'bg-amber-500/10   text-amber-400   border-amber-500/20',
  };
  return (
    <span className={'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ' + (m[variant] || 'bg-slate-800 text-slate-300 border-slate-700')}>
      {children}
    </span>
  );
}

function LogIcon({ type }) {
  if (type === 'success') return <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
  if (type === 'alert')   return <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
  if (type === 'warn')    return <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
  return <ChevronRight className="w-3.5 h-3.5 text-indigo-500 shrink-0" />;
}

function getLogColor(type) {
  if (type === 'success') return 'text-emerald-400';
  if (type === 'alert')   return 'text-rose-400';
  if (type === 'warn')    return 'text-amber-400';
  return 'text-slate-400';
}

function NavItem({ icon, label, active }) {
  return (
    <button className={'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ' + (active
      ? 'bg-indigo-500/15 text-indigo-300 font-semibold border border-indigo-500/20'
      : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/60')}>
      {icon} {label}
      {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />}
    </button>
  );
}

function getFitVariant(fitLevel) {
  if (!fitLevel) return 'indigo';
  if (fitLevel === 'Strong Match') return 'emerald';
  if (fitLevel === 'Good Match') return 'indigo';
  if (fitLevel === 'Partial Match') return 'amber';
  return 'rose';
}

function getScoreColor(score) {
  if (score >= 80) return 'indigo';
  if (score >= 60) return 'emerald';
  return 'rose';
}

/* ════════════════════════════════════════════
   MAIN APP
════════════════════════════════════════════ */
export default function App() {
  const [step,     setStep]     = useState('upload');
  const [progress, setProgress] = useState(0);
  const [logs,     setLogs]     = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [jobRole,  setJobRole]  = useState('');
  const [detectingRole, setDetectingRole] = useState(false);
  const [result,   setResult]   = useState(null);
  const [apiError, setApiError] = useState(null);

  const fileInputRef = useRef(null);
  const progressRef  = useRef(0);
  const progTimerRef = useRef(null);
  const logTimerRef  = useRef(null);

  /* ── Start analysis: show animation & call API in parallel ── */
  function startScan() {
    if (!selectedFile) return;
    setStep('scanning');
    setProgress(0);
    setLogs([]);
    setApiError(null);
    progressRef.current = 0;
  }

  /* ── useEffect: runs when scanning starts ── */
  useEffect(function() {
    if (step !== 'scanning') return;

    // Fake progress animation (cap at 88% until API returns)
    progTimerRef.current = setInterval(function() {
      progressRef.current = Math.min(progressRef.current + (Math.random() * 2.5 + 0.5), 88);
      setProgress(Math.round(progressRef.current));
    }, 200);

    // Trickle scan logs
    let logIdx = 0;
    logTimerRef.current = setInterval(function() {
      if (logIdx < SCAN_LOGS.length) {
        const entry = SCAN_LOGS[logIdx];
        setLogs(function(prev) { return [...prev, entry]; });
        logIdx++;
      }
    }, 550);

    // Real API call
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('role', jobRole || 'Software Engineer');

    fetch(API_URL + '/analyze', { method: 'POST', body: formData })
      .then(function(res) {
        if (!res.ok) {
          return res.json().then(function(e) { throw new Error(e.detail || 'Analysis failed'); });
        }
        return res.json();
      })
      .then(function(data) {
        clearInterval(progTimerRef.current);
        clearInterval(logTimerRef.current);
        setProgress(100);
        setResult(data);
        setTimeout(function() { setStep('results'); }, 600);
      })
      .catch(function(err) {
        clearInterval(progTimerRef.current);
        clearInterval(logTimerRef.current);
        setApiError(err.message);
        setStep('error');
      });

    return function() {
      clearInterval(progTimerRef.current);
      clearInterval(logTimerRef.current);
    };
  }, [step]);

  function reset() {
    setStep('upload');
    setSelectedFile(null);
    setResult(null);
    setApiError(null);
    setProgress(0);
    setLogs([]);
    setJobRole('');
    setDetectingRole(false);
    progressRef.current = 0;
  }

  const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const ACCEPTED_EXTS  = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.gif'];

  function handleFileSelect(f) {
    if (!f) return;
    const isAccepted = ACCEPTED_TYPES.includes(f.type) ||
      ACCEPTED_EXTS.some(ext => f.name.toLowerCase().endsWith(ext));
    if (!isAccepted) {
      alert('Please upload a PDF or image file (JPG, PNG, WEBP, GIF).');
      return;
    }
    setSelectedFile(f);
    setJobRole('');
    setDetectingRole(true);

    // Auto-detect the role from the resume
    const fd = new FormData();
    fd.append('file', f);
    fetch(API_URL + '/detect-role', { method: 'POST', body: fd })
      .then(res => res.json())
      .then(data => {
        if (data.role) setJobRole(data.role);
        else setJobRole('Software Engineer');
      })
      .catch(() => setJobRole('Software Engineer'))
      .finally(() => setDetectingRole(false));
  }

  /* ── Derived display values ── */
  const fitScore     = result ? (result.fit_score || 0) : 0;
  const legacyScore  = result ? (result.counterfactual?.legacy_ats_score || Math.max(0, fitScore - 20)) : 0;
  const scoreDelta   = result ? (result.counterfactual?.score_delta || (fitScore - legacyScore)) : 0;
  const biasProxies  = result ? (result.bias_proxies || []) : [];
  const strongSignals= result ? (result.strong_signals || []) : [];
  const gaps         = result ? (result.gaps || []) : [];
  const radar        = result ? (result.radar || {}) : {};
  const fitLevel     = result ? (result.fit_level || 'Partial Match') : '';
  const recommendation = result ? (result.recommendation || 'Schedule Screening Call') : '';
  const legacyVerdict  = result ? (result.legacy_ats_verdict || 'Flagged for Review') : '';

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-950 text-slate-300 flex"
        style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
          @keyframes prog-stripe { to { background-position: 2rem 0; } }
          .prog-bar {
            background: linear-gradient(90deg, #6366f1, #22d3ee, #6366f1);
            background-size: 200% auto;
            animation: prog-stripe 1.8s linear infinite;
          }
          ::-webkit-scrollbar { width: 5px; }
          ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
        `}</style>

        {/* ═══ SIDEBAR ═══ */}
        <aside className="w-60 shrink-0 border-r border-slate-800 bg-slate-900/50 hidden md:flex flex-col">
          <div className="px-5 py-5 flex items-center gap-3 border-b border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-base font-bold text-white">Fair<span className="text-indigo-400">AI</span></div>
              <div className="text-xs text-slate-500">Compliance Layer</div>
            </div>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1">
            <NavItem icon={<Activity className="w-4 h-4" />}      label="Overview"    active={false} />
            <NavItem icon={<Users className="w-4 h-4" />}         label="Candidates"  active={true}  />
            <NavItem icon={<AlertTriangle className="w-4 h-4" />} label="Bias Audits" active={false} />
            <NavItem icon={<BarChart2 className="w-4 h-4" />}     label="Reports"     active={false} />
            <NavItem icon={<Lock className="w-4 h-4" />}          label="Compliance"  active={false} />
          </nav>
          <div className="p-3 border-t border-slate-800">
            <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-all">
              <Settings className="w-4 h-4" /> Settings
            </button>
            <div className="mx-1 mt-2 p-3 rounded-xl bg-indigo-500/8 border border-indigo-500/15">
              <div className="text-xs font-semibold text-indigo-300 mb-0.5">Enterprise Plan</div>
              <div className="text-xs text-slate-500">Gemini 2.5 Pro · Live</div>
            </div>
          </div>
        </aside>

        {/* ═══ RIGHT PANEL ═══ */}
        <div className="flex-1 flex flex-col min-h-screen">
          <div className="pointer-events-none fixed top-0 right-0 w-96 h-96 bg-indigo-600/5 blur-3xl rounded-full" />

          {/* TOPBAR */}
          <header className="h-16 shrink-0 border-b border-slate-800 bg-slate-900/40 z-20 flex items-center justify-between px-8">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-white font-semibold">Candidate Screening</span>
              {step === 'results' && result && (
                <span className="flex items-center gap-2 text-slate-500">
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span className="text-indigo-400 font-medium">Audit · {result.fit_level}</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                Gemini 2.5 Pro Live
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-xs font-bold text-white">HR</div>
                <div className="text-sm hidden sm:block">
                  <div className="font-semibold text-white">Acme Corp</div>
                  <div className="text-slate-500 text-xs">Admin</div>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto relative z-10">

            {/* ══════════════ UPLOAD ══════════════ */}
            {step === 'upload' && (
              <div className="p-8">
                <div className="mb-8">
                  <h1 className="text-2xl font-bold text-white mb-1">AI Resume Audit</h1>
                  <p className="text-slate-400 text-sm max-w-2xl">
                    Upload any resume — Gemini 2.5 Pro reads it, evaluates fit for your role,
                    exposes every bias proxy, and corrects the score. No rules you set, no criteria lists — pure AI understanding.
                  </p>
                </div>

                {/* Job Role Input */}
                <div className="mb-6 max-w-xl">
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-2">
                    Target Role
                    {detectingRole && (
                      <span className="flex items-center gap-1.5 text-indigo-400 font-normal normal-case tracking-normal">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Auto-detecting from resume...
                      </span>
                    )}
                    {!detectingRole && jobRole && selectedFile && (
                      <span className="flex items-center gap-1 text-emerald-400 font-normal normal-case tracking-normal">
                        <Check className="w-3 h-3" />
                        Auto-detected
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={jobRole}
                    onChange={function(e) { setJobRole(e.target.value); }}
                    placeholder={detectingRole ? 'Detecting role from resume...' : 'e.g. Full Stack Engineer, Data Scientist, Product Manager...'}
                    disabled={detectingRole}
                    className={'w-full bg-slate-900/60 border rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all '
                      + (detectingRole ? 'border-indigo-500/40 opacity-70 cursor-wait' : 'border-slate-700')}
                  />
                  {!detectingRole && jobRole && (
                    <p className="mt-1.5 text-xs text-slate-500">Gemini read your resume and suggested this role. You can edit it before running the audit.</p>
                  )}
                </div>

                {/* Hidden real file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,image/*,application/pdf"
                  style={{ display: 'none' }}
                  onChange={function(e) { handleFileSelect(e.target.files[0]); }}
                />

                {/* Dropzone */}
                {!selectedFile ? (
                  <div
                    onClick={function() { fileInputRef.current.click(); }}
                    onDragOver={function(e) { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={function() { setDragOver(false); }}
                    onDrop={function(e) {
                      e.preventDefault();
                      setDragOver(false);
                      handleFileSelect(e.dataTransfer.files[0]);
                    }}
                    className={'relative rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300 flex flex-col items-center justify-center py-20 group '
                      + (dragOver ? 'border-indigo-400 bg-indigo-500/10' : 'border-slate-700 bg-slate-900/40 hover:border-indigo-500/60 hover:bg-slate-800/40')}
                  >
                    <div className={'w-20 h-20 rounded-2xl flex items-center justify-center mb-5 transition-all duration-300 border '
                      + (dragOver ? 'bg-indigo-500/20 border-indigo-500/50 scale-110' : 'bg-slate-800 border-slate-700 group-hover:border-indigo-500/30 group-hover:scale-105')}>
                      <UploadCloud className={'w-9 h-9 ' + (dragOver ? 'text-indigo-300' : 'text-indigo-400')} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Drop resume here or click to browse</h3>
                    <p className="text-slate-400 text-sm mb-4">PDF · JPG · PNG · WEBP — Gemini 2.5 Pro reads it directly</p>
                    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-slate-500">
                      {['Gender Bias', 'Age Proxy', 'Name Bias', 'Institution Bias', 'Career Gap'].map(function(tag) {
                        return (
                          <span key={tag} className="flex items-center gap-1.5">
                            <Eye className="w-3 h-3 text-indigo-500" /> {tag}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* File selected state */
                  <div className="rounded-2xl border border-indigo-500/30 bg-slate-900/60 p-6 flex items-center gap-5">
                    <div className="w-14 h-14 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center">
                      <FileText className="w-7 h-7 text-indigo-400" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-white mb-0.5">{selectedFile.name}</div>
                      <div className="text-xs text-slate-400">{(selectedFile.size / 1024).toFixed(1)} KB · PDF · Ready for analysis</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={function() { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                        className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={startScan}
                        disabled={detectingRole || !jobRole}
                        className={'px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-bold text-sm hover:shadow-lg hover:shadow-indigo-500/25 transition-all active:scale-95 flex items-center gap-2 '
                          + (detectingRole || !jobRole ? 'opacity-50 cursor-not-allowed' : '')}
                      >
                        {detectingRole
                          ? <><RefreshCw className="w-4 h-4 animate-spin" /> Detecting Role...</>
                          : <><Zap className="w-4 h-4" /> Analyze with FairAI</>}
                      </button>
                    </div>
                  </div>
                )}

                {/* Feature pills */}
                <div className="mt-5 flex flex-wrap gap-3">
                  {[
                    [Cpu,       'Gemini 2.5 Pro AI'],
                    [Lock,      'SOC 2 Type II'],
                    [Shield,    'EEOC-aligned'],
                    [Target,    'Counterfactual Testing'],
                    [FileText,  'PDF + Image upload'],
                    [GitBranch, 'ATS API ready'],
                  ].map(function(item) {
                    const Icon = item[0];
                    const text = item[1];
                    return (
                      <div key={text} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
                        <Icon className="w-3.5 h-3.5 text-indigo-400" /> {text}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ══════════════ SCANNING ══════════════ */}
            {step === 'scanning' && (
              <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-8">
                <div className="relative w-28 h-28 mb-10">
                  <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping" style={{ animationDuration: '1.6s' }} />
                  <div className="absolute inset-3 rounded-full bg-indigo-500/10 animate-ping" style={{ animationDuration: '2.2s', animationDelay: '0.4s' }} />
                  <div className="relative w-full h-full bg-slate-900 border-2 border-indigo-500/50 rounded-full flex items-center justify-center">
                    <Cpu className="w-11 h-11 text-indigo-400 animate-pulse" />
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-white mb-1">Gemini AI Analyzing Resume</h2>
                <p className="text-slate-400 text-sm mb-2 text-center max-w-md">
                  Reading <span className="text-slate-300 font-medium">{selectedFile && selectedFile.name}</span> for <span className="text-indigo-400 font-semibold">{jobRole}</span>
                </p>
                <p className="text-slate-500 text-xs mb-10">This takes 10-30 seconds depending on document length</p>

                <div className="w-full max-w-lg bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm text-slate-400 font-medium">Analysis Progress</span>
                    <span className="text-lg font-bold text-indigo-400">{progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden mb-6">
                    <div className="h-full prog-bar rounded-full transition-all duration-200"
                      style={{ width: progress + '%' }} />
                  </div>
                  <div className="space-y-2.5 font-mono text-xs h-44 overflow-hidden relative">
                    {logs.map(function(log) {
                      return (
                        <div key={log.id} className={'flex items-center gap-2 ' + getLogColor(log.type)}>
                          <LogIcon type={log.type} />
                          {log.text}
                        </div>
                      );
                    })}
                    <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-slate-900/80 to-transparent pointer-events-none" />
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════ ERROR ══════════════ */}
            {step === 'error' && (
              <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-8">
                <div className="max-w-md w-full bg-rose-900/15 border border-rose-500/30 rounded-2xl p-8 text-center">
                  <XCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
                  <h2 className="text-xl font-bold text-white mb-2">Analysis Failed</h2>
                  <p className="text-rose-300 text-sm mb-6 font-mono leading-relaxed">{apiError}</p>
                  <div className="text-xs text-slate-500 mb-6 p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-left">
                    <div className="font-semibold text-slate-400 mb-1">Troubleshooting:</div>
                    <div>1. Make sure the backend is running in a separate terminal: <code className="text-indigo-400">cd d:\ai_unbiased\backend</code> then <code className="text-indigo-400">python -m uvicorn main:app --port 8000</code></div>
                    <div className="mt-1">2. File must be a PDF or image with readable text (not a blank page)</div>
                    <div className="mt-1">3. Check your internet connection — Gemini API requires access</div>
                    <div className="mt-1">4. Gemini 2.5 Pro can take 40-60 seconds — be patient on retry</div>
                  </div>
                  <button onClick={reset} className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors flex items-center gap-2 mx-auto">
                    <RefreshCw className="w-4 h-4" /> Try Again
                  </button>
                </div>
              </div>
            )}

            {/* ══════════════ RESULTS ══════════════ */}
            {step === 'results' && result && (
              <div className="p-8 pb-20 max-w-6xl">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                      <h1 className="text-2xl font-bold text-white">AI Audit Complete</h1>
                    </div>
                    <p className="text-slate-400 text-sm">
                      {biasProxies.length} bias proxies found - Role: <span className="text-indigo-400 font-medium">{jobRole}</span>
                      {' '}- Powered by Gemini 2.5 Pro
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="px-4 py-2 rounded-xl text-sm border border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-300 transition-colors flex items-center gap-2">
                      <FileText className="w-4 h-4" /> Export PDF
                    </button>
                    <button onClick={reset} className="px-4 py-2 rounded-xl text-sm bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 transition-colors flex items-center gap-2">
                      <RefreshCw className="w-4 h-4" /> New Scan
                    </button>
                  </div>
                </div>

                {/* SECTION 1: AI Summary */}
                <section className="mb-6">
                  <SectionHeading icon={<Users className="w-3.5 h-3.5" />} label="AI Evaluation Summary" />
                  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col lg:flex-row items-start gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Pill variant={getFitVariant(fitLevel)}>{fitLevel}</Pill>
                        <span className="text-xs text-slate-500">for {jobRole}</span>
                      </div>
                      <p className="text-slate-200 leading-relaxed text-sm">{result.summary}</p>
                    </div>
                    <div className="flex flex-col items-center gap-2 shrink-0">
                      <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Recommended Action</div>
                      <div className={'px-4 py-2 rounded-xl text-sm font-bold border '
                        + (recommendation === 'Advance to Technical Interview'
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                          : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20')}>
                        {recommendation}
                      </div>
                    </div>
                  </div>
                </section>

                {/* SECTION 2: Score Comparison */}
                <section className="mb-6">
                  <SectionHeading icon={<BarChart2 className="w-3.5 h-3.5" />} label="Score Comparison - Legacy ATS vs FairAI" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                    {/* Legacy ATS */}
                    <div className="bg-slate-900/60 border border-rose-500/15 rounded-2xl p-6 flex flex-col items-center text-center">
                      <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Legacy ATS Score</div>
                      <ScoreMeter value={legacyScore} color="rose" />
                      <div className="mt-4 space-y-2">
                        <Pill variant="rose"><AlertTriangle className="w-3 h-3" /> {legacyVerdict}</Pill>
                        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                          Biased model verdict — influenced by proxy variables in resume.
                        </p>
                      </div>
                    </div>

                    {/* Delta */}
                    <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6 flex flex-col items-center justify-center gap-4">
                      <div className="text-center">
                        <div className="text-xs uppercase tracking-widest text-slate-500 mb-1">Score Recovery</div>
                        <div className={'text-6xl font-black leading-none ' + (scoreDelta >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                          {scoreDelta >= 0 ? '+' : ''}{scoreDelta}
                        </div>
                        <div className="text-slate-400 text-sm mt-1">points corrected by FairAI</div>
                      </div>
                      {result.counterfactual && (
                        <div className="w-full border-t border-slate-800 pt-3">
                          <div className="text-xs text-slate-500 text-center leading-relaxed">
                            <span className="font-semibold text-rose-400">Primary bias factor: </span>
                            {result.counterfactual.primary_bias_factor}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* FairAI Score */}
                    <div className="bg-slate-900/60 border border-indigo-500/20 rounded-2xl p-6 flex flex-col items-center text-center relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none" />
                      <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">FairAI True Score</div>
                      <ScoreMeter value={fitScore} color={getScoreColor(fitScore)} />
                      <div className="mt-4 space-y-2">
                        <Pill variant={getFitVariant(fitLevel)}><Check className="w-3 h-3" /> {fitLevel}</Pill>
                        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                          Score after removing all bias proxies from evaluation pipeline.
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* SECTION 3: Radar Chart */}
                <section className="mb-6">
                  <SectionHeading icon={<Target className="w-3.5 h-3.5" />} label="Competency Radar - 6 Dimensions" />
                  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
                    <div className="flex flex-col lg:flex-row items-center gap-8">
                      <div className="shrink-0">
                        <RadarChart data={radar} />
                      </div>
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        {[
                          { key: 'technical_depth',       label: 'Technical Depth',    desc: 'Technology stack breadth and depth' },
                          { key: 'problem_solving',       label: 'Problem Solving',    desc: 'Evidence of solving complex problems' },
                          { key: 'impact_evidence',       label: 'Impact Evidence',    desc: 'Measurable outcomes demonstrated' },
                          { key: 'domain_knowledge',      label: 'Domain Knowledge',   desc: 'Relevant expertise for the role' },
                          { key: 'project_complexity',    label: 'Project Complexity', desc: 'Scale and scope of work done' },
                          { key: 'communication_clarity', label: 'Communication',      desc: 'Clarity of how work is described' },
                        ].map(function(dim) {
                          const score = radar[dim.key] || 0;
                          const good = score >= 75;
                          return (
                            <div key={dim.key} className="bg-slate-800/40 rounded-xl p-3 border border-slate-800">
                              <div className="flex justify-between items-center mb-1.5">
                                <span className="text-xs font-semibold text-slate-300">{dim.label}</span>
                                <span className={'text-sm font-black ' + (good ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-rose-400')}>{score}</span>
                              </div>
                              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden mb-1.5">
                                <div className={'h-full rounded-full '
                                  + (good ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : score >= 50 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' : 'bg-gradient-to-r from-rose-500 to-pink-400')}
                                  style={{ width: score + '%' }} />
                              </div>
                              <p className="text-xs text-slate-500">{dim.desc}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </section>

                {/* SECTION 4: Bias Proxy Highlights */}
                {biasProxies.length > 0 && (
                  <section className="mb-6">
                    <SectionHeading icon={<Eye className="w-3.5 h-3.5" />} label={'Bias Proxies Detected in Resume - ' + biasProxies.length + ' Found'} />
                    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
                      {/* Header */}
                      <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-slate-800 bg-slate-950/50">
                        <div className="col-span-3 text-xs font-bold uppercase tracking-widest text-slate-500">Proxy Text in Resume</div>
                        <div className="col-span-2 text-xs font-bold uppercase tracking-widest text-slate-500">Bias Type</div>
                        <div className="col-span-1 text-xs font-bold uppercase tracking-widest text-slate-500 text-center">Risk</div>
                        <div className="col-span-6 text-xs font-bold uppercase tracking-widest text-slate-500">Why a Biased ATS Would Use This Against Them</div>
                      </div>
                      <div className="divide-y divide-slate-800/40">
                        {biasProxies.map(function(proxy, idx) {
                          const s  = SEVERITY_STYLE[proxy.severity] || SEVERITY_STYLE.low;
                          const bt = BIAS_TYPE_LABELS[proxy.bias_type] || BIAS_TYPE_LABELS.gender;
                          return (
                            <div key={idx} className="grid grid-cols-12 gap-3 px-5 py-4 items-start hover:bg-slate-800/20 transition-colors">
                              <div className="col-span-3">
                                <code className={'text-xs px-2.5 py-1 rounded-lg border font-mono font-semibold ' + bt.bg + ' ' + bt.color + ' ' + bt.border}>
                                  "{proxy.text}"
                                </code>
                              </div>
                              <div className="col-span-2 flex items-center">
                                <span className={'text-xs font-semibold px-2 py-0.5 rounded-md border ' + bt.bg + ' ' + bt.color + ' ' + bt.border}>
                                  {bt.label}
                                </span>
                              </div>
                              <div className="col-span-1 flex justify-center pt-0.5">
                                <span className={'px-2 py-0.5 rounded-md text-xs font-bold uppercase border ' + s.bg + ' ' + s.text + ' ' + s.border}>
                                  {proxy.severity}
                                </span>
                              </div>
                              <div className="col-span-6 text-xs text-slate-400 leading-relaxed">
                                <Shield className="w-3 h-3 text-indigo-500 inline mr-1.5 shrink-0" />
                                {proxy.explanation}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </section>
                )}

                {/* SECTION 5: Strong Signals & Gaps */}
                <section className="mb-6">
                  <SectionHeading icon={<ClipboardList className="w-3.5 h-3.5" />} label="Signals and Gaps Analysis" />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                    {/* Strong Signals */}
                    <div className="bg-slate-900/60 border border-emerald-500/15 rounded-2xl p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                        <h4 className="font-semibold text-emerald-300 text-sm">Strong Signals ({strongSignals.length})</h4>
                      </div>
                      <div className="space-y-3">
                        {strongSignals.length > 0 ? strongSignals.map(function(sig, idx) {
                          return (
                            <div key={idx} className="flex items-start gap-3">
                              <div className={'w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ' + (sig.weight === 'high' ? 'bg-emerald-400' : 'bg-emerald-600')} />
                              <div>
                                <div className="text-sm font-semibold text-slate-200">{sig.signal}</div>
                                <div className="text-xs text-slate-500 leading-relaxed mt-0.5 italic">"{sig.evidence}"</div>
                              </div>
                            </div>
                          );
                        }) : <p className="text-xs text-slate-500 italic">No strong signals identified.</p>}
                      </div>
                    </div>

                    {/* Gaps */}
                    <div className="bg-slate-900/60 border border-amber-500/15 rounded-2xl p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <TrendingDown className="w-4 h-4 text-amber-400" />
                        <h4 className="font-semibold text-amber-300 text-sm">Skill Gaps ({gaps.length})</h4>
                      </div>
                      <div className="space-y-3">
                        {gaps.length > 0 ? gaps.map(function(gap, idx) {
                          return (
                            <div key={idx} className="flex items-start gap-3">
                              <div className={'w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ' + (gap.severity === 'blocking' ? 'bg-rose-400' : 'bg-amber-400')} />
                              <div>
                                <div className="text-sm font-semibold text-slate-200">{gap.gap}</div>
                                <div className={'text-xs mt-0.5 font-medium ' + (gap.severity === 'blocking' ? 'text-rose-400' : 'text-amber-400')}>
                                  {gap.severity === 'blocking' ? 'Blocking gap' : 'Minor gap'}
                                </div>
                              </div>
                            </div>
                          );
                        }) : <p className="text-xs text-slate-500 italic">No significant gaps identified.</p>}
                      </div>
                    </div>
                  </div>
                </section>

                {/* SECTION 6: Recommendation */}
                <section>
                  <SectionHeading icon={<CheckCircle className="w-3.5 h-3.5" />} label="FairAI Recommendation" />
                  <div className={'border rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5 '
                    + (fitScore >= 75 ? 'bg-emerald-500/5 border-emerald-500/20' : fitScore >= 50 ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-amber-500/5 border-amber-500/20')}>
                    <div className={'w-12 h-12 rounded-xl flex items-center justify-center shrink-0 '
                      + (fitScore >= 75 ? 'bg-emerald-500/15 border border-emerald-500/20' : 'bg-indigo-500/15 border border-indigo-500/20')}>
                      <CheckCircle className={'w-6 h-6 ' + (fitScore >= 75 ? 'text-emerald-400' : 'text-indigo-400')} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-bold text-white mb-1">{recommendation}</h3>
                      <p className="text-sm text-slate-400 leading-relaxed">{result.summary}</p>
                      {scoreDelta > 0 && (
                        <p className="text-xs text-rose-300 mt-2">
                          <AlertTriangle className="w-3 h-3 inline mr-1" />
                          Without FairAI, this candidate would have scored <span className="font-bold">{legacyScore}/100</span> and likely been {legacyVerdict.toLowerCase()}.
                        </p>
                      )}
                    </div>
                    <button className={'px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors shrink-0 '
                      + (fitScore >= 75 ? 'bg-emerald-500 hover:bg-emerald-400 text-white' : 'bg-indigo-500 hover:bg-indigo-400 text-white')}>
                      {recommendation === 'Advance to Technical Interview' ? 'Advance Candidate' : 'Take Action'}
                    </button>
                  </div>
                </section>

              </div>
            )}
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}
