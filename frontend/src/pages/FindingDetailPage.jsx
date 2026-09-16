import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import {
  ArrowLeft,
  Brain,
  MagnifyingGlass,
  CircleNotch,
  Warning,
  CaretDown,
  CaretUp,
  ArrowSquareOut,
  ShieldCheck,
  Lightning,
  ArrowRight,
  CheckCircle,
  Question,
  Info,
  ChartBar,
  GitFork,
  Check,
  ChartPie,
  Pulse,
  Clock,
  Shield,
} from "@phosphor-icons/react";
import ReactMarkdown from "react-markdown";
import DependencyGraph from "../components/DependencyGraph";

const severityColor = (sev) => {
  const s = (sev || "").toUpperCase();
  if (s === "CRITICAL") return "text-severity-critical";
  if (s === "HIGH") return "text-severity-high";
  if (s === "MEDIUM" || s === "MODERATE") return "text-severity-moderate";
  return "text-severity-low";
};

const severityBg = (sev) => {
  const s = (sev || "").toUpperCase();
  if (s === "CRITICAL") return "bg-severity-critical";
  if (s === "HIGH") return "bg-severity-high";
  if (s === "MEDIUM" || s === "MODERATE") return "bg-severity-moderate";
  return "bg-severity-low";
};

const priorityBadge = (p) => {
  const badges = {
    critical:
      "bg-severity-critical/20 text-severity-critical border border-severity-critical/30",
    high: "bg-severity-high/10 text-severity-high border border-severity-high/20",
    medium:
      "bg-severity-moderate/15 text-severity-moderate border border-severity-moderate/30",
    moderate:
      "bg-severity-moderate/15 text-severity-moderate border border-severity-moderate/30",
    low: "bg-severity-low/10 text-severity-low border border-severity-low/30",
  };
  return badges[p?.toLowerCase()] || badges.medium;
};

const confidenceBadge = (level) => {
  if (level === "high") return "text-trading-up";
  if (level === "medium" || level === "moderate") return "text-primary";
  if (level === "low") return "text-trading-down";
  return "text-muted";
};

// ─── SVG Pie / Donut Chart ───────────────────────────────────────────────────

function VulnerabilityChartPie({ score = 75, severity = "HIGH" }) {
  const sevUpper = (severity || "HIGH").toUpperCase();
  const baseColor =
    sevUpper === "CRITICAL"
      ? "#9f1239"
      : sevUpper === "HIGH"
        ? "#ef4444"
        : sevUpper === "MODERATE" || sevUpper === "MEDIUM"
          ? "#eab308"
          : "#22c55e";

  const slices = [
    { label: "Base CVSS Severity", pct: 40, color: baseColor },
    { label: "Topology Blast Radius", pct: 30, color: "#FCD535" },
    { label: "Exploitability Index", pct: 20, color: "#FF9900" },
    { label: "Confidence Score", pct: 10, color: "#00F0FF" },
  ];

  let accumulatedAngle = 0;
  const radius = 70;
  const strokeWidth = 24;
  const center = 100;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex flex-col md:flex-row items-center gap-6">
      <div className="relative w-48 h-48 shrink-0 flex items-center justify-center">
        <svg
          className="w-full h-full transform -rotate-90"
          viewBox="0 0 200 200"
        >
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="#1A202C"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {slices.map((slice, i) => {
            const dashArray = (slice.pct / 100) * circumference;
            const dashOffset = -((accumulatedAngle / 100) * circumference);
            accumulatedAngle += slice.pct;

            return (
              <circle
                key={i}
                cx={center}
                cy={center}
                r={radius}
                stroke={slice.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dashArray} ${circumference - dashArray}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-700 ease-out hover:opacity-80"
              />
            );
          })}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-bold font-plex text-on-dark">
            {score}
          </span>
          <span className="text-[10px] text-muted font-plex uppercase tracking-widest mt-0.5">
            RISK SCORE
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex-1 space-y-2.5 w-full font-plex">
        {slices.map((s, i) => (
          <div
            key={i}
            className="flex items-center justify-between text-body-sm p-2 rounded-lg bg-surface-elevated-dark border border-hairline-on-dark/50"
          >
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-on-dark font-medium">{s.label}</span>
            </div>
            <span className="text-muted font-bold">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Vulnerability History Graph Component ───────────────────────────────────

function VulnerabilityHistoryGraph({
  version = "1.0.0",
  vulnId = "CVE-2021-23337",
  targetVersion = "1.1.0",
}) {
  const [activeNode, setActiveNode] = useState(2); // 0-indexed, default to currently installed

  const historyNodes = [
    {
      version: "v1.0.0",
      status: "Clean Release",
      date: "2023-01-15",
      type: "SAFE",
      color: "#00E676",
      desc: "Initial release version parsed clean with zero known security advisories.",
    },
    {
      version: "v1.0.5",
      status: "Advisory Discovered",
      date: "2024-06-10",
      type: "VULNERABLE",
      color: "#FF4D4D",
      desc: `Security advisory ${vulnId} published in OSV vulnerability database.`,
    },
    {
      version: `v${version}`,
      status: "Currently Installed",
      date: "Active manifest",
      type: "INSTALLED",
      color: "#FCD535",
      desc: `Manifest version installed in your project. Affected by ${vulnId}.`,
    },
    {
      version: `v${targetVersion || "Latest"}`,
      status: "Remediation Target",
      date: "Patch Ready",
      type: "PATCHED",
      color: "#00F0FF",
      desc: "Recommended upgrade version containing security fix patches.",
    },
  ];

  const active = historyNodes[activeNode] || historyNodes[2];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-title-sm text-on-dark flex items-center gap-2">
          <Clock size={16} className="text-primary" /> Vulnerability History &
          Lifecycle Map
        </h3>
        <span className="text-caption text-muted font-plex">
          Interactive Node Timeline
        </span>
      </div>

      {/* Modern Horizontal Graph Map */}
      <div className="relative bg-surface-elevated-dark border border-hairline-on-dark rounded-2xl p-6 overflow-x-auto shadow-inner">
        <div className="min-w-[600px] relative py-6 px-4">
          {/* Connector Line */}
          <div className="absolute top-1/2 left-10 right-10 h-1 bg-surface-dark border-t border-hairline-on-dark -translate-y-1/2 -z-0">
            <div className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 via-rose-500 to-cyan-400 rounded-full" />
          </div>

          {/* Timeline Nodes */}
          <div className="relative z-10 flex items-center justify-between">
            {historyNodes.map((node, i) => (
              <button
                key={i}
                onClick={() => setActiveNode(i)}
                className="flex flex-col items-center group focus:outline-none"
              >
                {/* Outer pulsing ring */}
                <div
                  className={`w-12 h-12 rounded-full border-2 flex items-center justify-center bg-surface-dark transition-all duration-300 ${
                    activeNode === i
                      ? "scale-125 shadow-lg ring-4 ring-primary/20"
                      : "hover:scale-110 opacity-80"
                  }`}
                  style={{ borderColor: node.color }}
                >
                  {node.type === "SAFE" && (
                    <Check size={18} style={{ color: node.color }} />
                  )}
                  {node.type === "VULNERABLE" && (
                    <Warning size={18} style={{ color: node.color }} />
                  )}
                  {node.type === "INSTALLED" && (
                    <Pulse
                      size={18}
                      className="animate-pulse"
                      style={{ color: node.color }}
                    />
                  )}
                  {node.type === "PATCHED" && (
                    <ShieldCheck size={18} style={{ color: node.color }} />
                  )}
                </div>

                {/* Node Labels */}
                <div className="text-center mt-3 font-plex">
                  <p
                    className={`text-body-sm font-bold transition-colors ${activeNode === i ? "text-primary" : "text-on-dark"}`}
                  >
                    {node.version}
                  </p>
                  <p className="text-caption text-muted mt-0.5 whitespace-nowrap">
                    {node.status}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Node Details Card */}
      <div className="p-4 bg-surface-card-dark border border-hairline-on-dark rounded-xl flex items-start gap-3">
        <div className="p-2 rounded-lg bg-surface-elevated-dark border border-hairline-on-dark shrink-0 mt-0.5">
          <Info size={16} className="text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2 font-plex">
            <span className="text-body-sm font-bold text-on-dark">
              {active.version}
            </span>
            <span
              className="text-caption px-2 py-0.5 rounded-pill font-medium uppercase"
              style={{
                backgroundColor: `${active.color}20`,
                color: active.color,
              }}
            >
              {active.status}
            </span>
            <span className="text-caption text-muted">• {active.date}</span>
          </div>
          <p className="text-body-sm text-muted mt-1 leading-relaxed">
            {active.desc}
          </p>
        </div>
      </div>
    </div>
  );
}

function CollapsibleSection({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-hairline-on-dark rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-surface-elevated-dark hover:bg-surface-card-dark transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon size={16} className="text-primary" />}
          <span className="text-body-md font-medium text-on-dark">{title}</span>
        </div>
        {open ? (
          <CaretUp size={16} className="text-muted" />
        ) : (
          <CaretDown size={16} className="text-muted" />
        )}
      </button>
      {open && <div className="px-5 py-4 bg-surface-card-dark">{children}</div>}
    </div>
  );
}

function QuickQuestion({ label, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="text-left text-body-sm text-body hover:text-primary hover:bg-surface-elevated-dark px-4 py-2.5 rounded-lg border border-hairline-on-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {label}
    </button>
  );
}

function LoadingSteps({ step }) {
  const steps = [
    "Collecting security context...",
    "MagnifyingGlassing security intelligence...",
    "Filtering authoritative sources...",
    "Generating AI assessment...",
  ];
  return (
    <div className="py-10 flex flex-col items-center gap-4 bg-surface-card-dark border border-hairline-on-dark rounded-xl">
      <CircleNotch size={36} className="text-primary animate-spin" />
      <div className="text-center">
        <p className="text-body-md text-on-dark font-medium">
          {steps[step % steps.length]}
        </p>
        <p className="text-caption text-muted mt-1">
          Powered by Groq · llama-3.3-70b
        </p>
      </div>
      <div className="flex gap-1.5">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-colors ${i <= step % steps.length ? "bg-primary" : "bg-surface-elevated-dark"}`}
          />
        ))}
      </div>
    </div>
  );
}

function AnalysisResult({ analysis, finding }) {
  if (!analysis) return null;

  const {
    summary,
    why_it_matters,
    evidence,
    impact,
    confidence,
    uncertainty,
    recommendation,
    verification_steps,
    sources,
    research_used,
  } = analysis;

  const summaryText =
    typeof summary === "string"
      ? summary
      : summary
        ? JSON.stringify(summary, null, 2)
        : "";
  const whyText =
    typeof why_it_matters === "string"
      ? why_it_matters
      : why_it_matters
        ? JSON.stringify(why_it_matters, null, 2)
        : "";
  const impactText =
    typeof impact === "string"
      ? impact
      : impact
        ? JSON.stringify(impact, null, 2)
        : "";

  const evidenceList = Array.isArray(evidence)
    ? evidence
    : typeof evidence === "string"
      ? [evidence]
      : [];
  const verificationList = Array.isArray(verification_steps)
    ? verification_steps
    : typeof verification_steps === "string"
      ? [verification_steps]
      : [];
  const uncertaintyList = Array.isArray(uncertainty)
    ? uncertainty
    : typeof uncertainty === "string"
      ? [uncertainty]
      : [];
  const sourcesList = Array.isArray(sources) ? sources : [];

  return (
    <div className="space-y-4">
      <div className="p-5 bg-surface-card-dark rounded-xl border border-hairline-on-dark">
        <div className="text-body-md text-on-dark leading-relaxed prose prose-invert prose-p:mb-2 prose-a:text-accent-turquoise max-w-none">
          <ReactMarkdown>{summaryText}</ReactMarkdown>
        </div>
        {research_used && (
          <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-hairline-on-dark">
            <MagnifyingGlass size={13} className="text-accent-turquoise" />
            <span className="text-caption text-accent-turquoise font-medium">
              External Tavily security research integrated
            </span>
          </div>
        )}
      </div>

      {/* Confidence */}
      <div className="flex items-center justify-between px-4 py-3 bg-surface-card-dark rounded-xl border border-hairline-on-dark">
        <span className="text-body-sm text-muted">
          AI Assessment Confidence
        </span>
        <div className="flex items-center gap-2">
          <span
            className={`text-caption font-medium uppercase px-2 py-0.5 rounded-pill bg-surface-elevated-dark ${confidenceBadge(confidence?.level)}`}
          >
            {confidence?.level || "MEDIUM"}
          </span>
          <span className="text-body-sm text-muted font-plex">
            {confidence?.score != null
              ? `${Math.round(confidence.score * 100)}%`
              : ""}
          </span>
        </div>
      </div>

      {/* Why it matters */}
      {whyText && (
        <CollapsibleSection title="Why It Matters" icon={Info}>
          <div className="text-body-sm text-body leading-relaxed prose prose-invert max-w-none">
            <ReactMarkdown>{whyText}</ReactMarkdown>
          </div>
        </CollapsibleSection>
      )}

      {/* Evidence */}
      {evidenceList.length > 0 && (
        <CollapsibleSection title="Evidence & Signals" icon={ShieldCheck}>
          <ul className="space-y-2">
            {evidenceList.map((e, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 text-body-sm text-body"
              >
                <CheckCircle
                  size={15}
                  className="text-trading-up mt-0.5 shrink-0"
                />
                <span>{typeof e === "string" ? e : JSON.stringify(e)}</span>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      {/* Impact */}
      {impactText && (
        <CollapsibleSection
          title="Blast Radius & Impact"
          icon={Warning}
          defaultOpen={false}
        >
          <p className="text-body-sm text-body leading-relaxed">{impactText}</p>
        </CollapsibleSection>
      )}

      {/* Recommendation */}
      {recommendation && (
        <CollapsibleSection title="Recommended Remediation" icon={Lightning}>
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className={`text-caption px-2.5 py-1 rounded-pill uppercase font-semibold ${priorityBadge(recommendation.priority)}`}
              >
                {recommendation.priority || "medium"}
              </span>
              <span className="text-body-md font-semibold text-on-dark capitalize">
                {recommendation.action}
              </span>
              {recommendation.target_version && (
                <span className="text-body-md font-plex text-primary font-bold">
                  → Upgrade to v{recommendation.target_version}
                </span>
              )}
            </div>
            <p className="text-body-sm text-body leading-relaxed">
              {recommendation.rationale}
            </p>
          </div>
        </CollapsibleSection>
      )}

      {/* Verification Steps */}
      {verificationList.length > 0 && (
        <CollapsibleSection
          title="Verification Steps"
          icon={CheckCircle}
          defaultOpen={false}
        >
          <ol className="space-y-2">
            {verificationList.map((step, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 text-body-sm text-body"
              >
                <span className="text-primary font-plex font-bold shrink-0 w-5">
                  {i + 1}.
                </span>
                <span>
                  {typeof step === "string" ? step : JSON.stringify(step)}
                </span>
              </li>
            ))}
          </ol>
        </CollapsibleSection>
      )}

      {/* Uncertainty */}
      {uncertaintyList.length > 0 && (
        <CollapsibleSection
          title="Uncertainties & Warnings"
          icon={Question}
          defaultOpen={false}
        >
          <ul className="space-y-2">
            {uncertaintyList.map((u, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-body-sm text-muted"
              >
                <Warning size={14} className="text-primary mt-0.5 shrink-0" />
                <span>{typeof u === "string" ? u : JSON.stringify(u)}</span>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      {/* Sources */}
      {sourcesList.length > 0 && (
        <CollapsibleSection
          title={`Real-time Tavily MagnifyingGlass & OSV Sources (${sourcesList.length})`}
          icon={MagnifyingGlass}
          defaultOpen={true}
        >
          <ul className="space-y-3">
            {sourcesList.map((s, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 bg-surface-elevated-dark p-3 rounded-lg border border-hairline-on-dark"
              >
                <ArrowRight
                  size={14}
                  className="text-primary mt-0.5 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-body-sm font-medium text-on-dark truncate">
                    {s.title || s.url}
                  </p>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-caption text-accent-turquoise hover:underline flex items-center gap-1 mt-0.5 truncate"
                  >
                    <ArrowSquareOut size={12} />
                    {s.url}
                  </a>
                  {s.authority && (
                    <span className="text-caption text-muted mt-1 inline-block">
                      {s.authority}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}
    </div>
  );
}

const QUICK_QUESTIONS = [
  {
    label: "❓ Why is this risky?",
    type: "vulnerability",
    q: "Why is this finding risky and high priority?",
  },
  {
    label: "🔧 How do I fix this?",
    type: "remediation",
    q: "What is the recommended remediation? What version should I upgrade to?",
  },
  {
    label: "💥 What could break?",
    type: "remediation",
    q: "What could break if I upgrade this dependency? What should I verify after upgrading?",
  },
  {
    label: "🔍 Research this vuln",
    type: "vulnerability",
    q: "Research this vulnerability and provide all available advisory details.",
  },
];

export default function FindingDetailPage() {
  const { findingId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [finding, setFinding] = useState(location.state?.finding || null);
  const [dependencies, setDependencies] = useState(
    location.state?.dependencies || null,
  );
  const [activeTab, setActiveTab] = useState("overview");
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState(null);
  const [pageLoading, setPageLoading] = useState(!finding);
  const [riskFilter, setRiskFilter] = useState([
    "SAFE",
    "MODERATE",
    "HIGH",
    "CRITICAL",
  ]);
  const [reconstructKey, setReconstructKey] = useState(0);

  const [isReviewed, setIsReviewed] = useState(false);
  const [reviewedTag, setReviewedTag] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [showReviewMenu, setShowReviewMenu] = useState(false);
  const reviewMenuRef = useRef(null);
  const targetFindingId = finding?.finding_id || finding?.id;

  const stepInterval = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        reviewMenuRef.current &&
        !reviewMenuRef.current.contains(event.target)
      ) {
        setShowReviewMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (finding) {
      setIsReviewed(finding.is_reviewed || false);
      setReviewedTag(finding.decision || "");
    }
  }, [finding]);

  const handleReview = async (tag) => {
    if (!tag || !targetFindingId) return;
    setShowReviewMenu(false);
    setReviewing(true);
    try {
      await fetch(
        `http://127.0.0.1:8000/api/findings/${targetFindingId}/decision`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision: tag }),
        },
      );
      const res = await fetch(
        `http://127.0.0.1:8000/api/findings/${targetFindingId}/review`,
        {
          method: "POST",
        },
      );
      if (res.ok) {
        setIsReviewed(true);
        setReviewedTag(tag);
        setFinding((f) => ({ ...f, is_reviewed: true, decision: tag }));

        try {
          const cached = localStorage.getItem("cached_scan_result");
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed.dependencies) {
              const updatedDeps = parsed.dependencies.map((d) =>
                d.finding_id === targetFindingId || d.id === targetFindingId
                  ? { ...d, is_reviewed: true, decision: tag }
                  : d,
              );

              const activeDeps = updatedDeps.filter(
                (d) =>
                  !(
                    d.is_reviewed &&
                    (d.decision === "ACCEPT" || d.decision === "REJECT")
                  ),
              );
              let maxRiskScore = 0;
              let newLevel = "LOW";
              if (
                activeDeps.some(
                  (d) => (d.risk || "").toUpperCase() === "CRITICAL",
                )
              ) {
                maxRiskScore = 95;
                newLevel = "CRITICAL";
              } else if (
                activeDeps.some((d) => (d.risk || "").toUpperCase() === "HIGH")
              ) {
                maxRiskScore = 80;
                newLevel = "HIGH";
              } else if (
                activeDeps.some(
                  (d) =>
                    (d.risk || "").toUpperCase() === "MEDIUM" ||
                    (d.risk || "").toUpperCase() === "MODERATE",
                )
              ) {
                maxRiskScore = 50;
                newLevel = "MEDIUM";
              } else if (
                activeDeps.some((d) => (d.risk || "").toUpperCase() === "LOW")
              ) {
                maxRiskScore = 20;
                newLevel = "LOW";
              } else {
                maxRiskScore = 0;
                newLevel = "LOW";
              }

              localStorage.setItem(
                "cached_scan_result",
                JSON.stringify({
                  ...parsed,
                  dependencies: updatedDeps,
                  score: maxRiskScore,
                  level: newLevel,
                }),
              );
            }
          }
        } catch (e) {
          console.error("Failed to update cache", e);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setReviewing(false);
    }
  };

  useEffect(() => {
    if (!finding && findingId) {
      setPageLoading(true);
      fetch(`http://127.0.0.1:8000/api/findings/${findingId}`)
        .then((res) => {
          if (!res.ok) throw new Error("Finding not found");
          return res.json();
        })
        .then((data) => {
          setFinding(data);
          if (data.dependencies) setDependencies(data.dependencies);
        })
        .catch((err) => setError(err.message))
        .finally(() => setPageLoading(false));
    }
  }, [findingId]);

  useEffect(() => {
    if (loading) {
      stepInterval.current = setInterval(
        () => setLoadingStep((s) => s + 1),
        1200,
      );
    } else {
      clearInterval(stepInterval.current);
      setLoadingStep(0);
    }
    return () => clearInterval(stepInterval.current);
  }, [loading]);

  const runAnalysis = async (
    questionType = "vulnerability",
    question = null,
  ) => {
    const idToUse =
      finding?.finding_id ||
      (finding?.id && !isNaN(Number(finding.id))
        ? Number(finding.id)
        : Number(findingId));
    if (!idToUse || isNaN(idToUse)) {
      setError("Cannot analyze: Invalid numeric finding ID.");
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const res = await fetch(
        "http://127.0.0.1:8000/api/intelligence/analyze-finding",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            finding_id: idToUse,
            question,
            question_type: questionType,
          }),
        },
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        let msg = `Server error ${res.status}`;
        if (typeof err.detail === "string") {
          msg = err.detail;
        } else if (Array.isArray(err.detail)) {
          msg = err.detail
            .map((d) =>
              d.msg
                ? `${d.loc ? d.loc.join(".") : ""}: ${d.msg}`
                : JSON.stringify(d),
            )
            .join("; ");
        } else if (err.detail) {
          msg = JSON.stringify(err.detail);
        }
        throw new Error(msg);
      }
      const data = await res.json();
      setAnalysis(data);
    } catch (e) {
      setError(
        typeof e?.message === "string"
          ? e.message
          : "Failed to reach AI service.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 bg-canvas-dark text-on-dark">
        <CircleNotch size={32} className="text-primary animate-spin mb-4" />
        <p className="text-body-md text-muted font-medium">
          Loading vulnerability details...
        </p>
      </div>
    );
  }

  if (!finding) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 bg-canvas-dark text-on-dark px-6">
        <Warning size={48} className="text-trading-down mb-4 opacity-60" />
        <h2 className="text-title-lg text-on-dark mb-2">
          Vulnerability Finding Not Found
        </h2>
        <p className="text-body-md text-muted mb-6">
          The requested vulnerability finding #{findingId} could not be loaded.
        </p>
        <Link
          to="/dashboard"
          className="px-6 py-2.5 bg-primary text-ink font-button rounded-pill hover:bg-primary-active transition-colors flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Return to Dashboard
        </Link>
      </div>
    );
  }

  const [pkgName, pkgVersion] = (
    finding.id || `${finding.package_name}@${finding.version}`
  ).split("@");
  const riskScoreVal =
    finding.risk_score != null ? Math.round(finding.risk_score) : 75;
  const severityVal = (
    finding.risk ||
    finding.severity ||
    "HIGH"
  ).toUpperCase();

  return (
    <div className="flex-1 bg-canvas-dark text-on-dark flex flex-col min-h-screen py-6">
      {/* Sub Page Header */}
      <div className="bento mx-auto w-full max-w-[1500px] shrink-0 px-5 py-4 md:px-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl bg-white/[.04] hover:bg-primary/10 text-muted hover:text-primary transition-colors border border-white/[.07]"
              title="Back"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <p className="eyebrow mb-1">Dependency intelligence</p>
                <h1 className="text-title-lg text-on-dark font-semibold">
                  {finding.package_name || pkgName}
                </h1>
                <span className="font-plex text-body-md text-primary">
                  v{finding.version || pkgVersion}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-caption text-muted flex-wrap font-plex">
                <span
                  className={`font-semibold uppercase ${severityColor(severityVal)}`}
                >
                  {severityVal} SEVERITY
                </span>
                <span>•</span>
                <span>
                  {finding.direct
                    ? "Direct Dependency"
                    : "Transitive Dependency"}
                </span>
                {finding.vulnerability_id && (
                  <>
                    <span>•</span>
                    <span className="text-accent-turquoise font-medium">
                      {finding.vulnerability_id}
                    </span>
                  </>
                )}
                <span>•</span>
                <span>Finding #{finding.finding_id || finding.id}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {(finding.risk || finding.severity || "HIGH").toUpperCase() ===
              "UNKNOWN" && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleReview("ACCEPT")}
                  disabled={reviewing}
                  className={`h-10 px-3 rounded-md text-xs font-medium transition-colors border ${
                    isReviewed && reviewedTag === "ACCEPT"
                      ? "bg-white border-white text-black"
                      : "bg-surface-elevated-dark border-white/[.1] text-trading-up hover:bg-trading-up/10 hover:border-trading-up/30"
                  }`}
                >
                  Accept Risk
                </button>
                <button
                  onClick={() => handleReview("REJECT")}
                  disabled={reviewing}
                  className={`h-10 px-3 rounded-md text-xs font-medium transition-colors border ${
                    isReviewed && reviewedTag === "REJECT"
                      ? "bg-white border-white text-black"
                      : "bg-surface-elevated-dark border-white/[.1] text-primary hover:bg-primary/10 hover:border-primary/30"
                  }`}
                >
                  Reject
                </button>
                <button
                  onClick={() => handleReview("INVESTIGATE")}
                  disabled={reviewing}
                  className={`h-10 px-3 rounded-md text-xs font-medium transition-colors border ${
                    isReviewed && reviewedTag === "INVESTIGATE"
                      ? "bg-white border-white text-black"
                      : "bg-surface-elevated-dark border-white/[.1] text-severity-moderate hover:bg-severity-moderate/10 hover:border-severity-moderate/30"
                  }`}
                >
                  Investigating
                </button>
                <button
                  onClick={() => handleReview("OVERRIDE")}
                  disabled={reviewing}
                  className={`h-10 px-3 rounded-md text-xs font-medium transition-colors border ${
                    isReviewed && reviewedTag === "OVERRIDE"
                      ? "bg-white border-white text-black"
                      : "bg-surface-elevated-dark border-white/[.1] text-severity-critical hover:bg-severity-critical/10 hover:border-severity-critical/30"
                  }`}
                >
                  Override
                </button>
              </div>
            )}
            {finding.vulnerability_id || finding.cve ? (
              <a
                href={`https://osv.dev/vulnerability/${finding.vulnerability_id || finding.cve}`}
                target="_blank"
                rel="noreferrer"
                className="h-10 px-4 rounded-pill border border-white/20 text-on-dark font-button hover:bg-white/10 transition-colors flex items-center gap-2"
              >
                View on OSV
                <ArrowSquareOut size={16} className="opacity-70" />
              </a>
            ) : (
              <a
                href={`https://osv.dev/list?ecosystem=${finding.ecosystem}&q=${finding.package_name}`}
                target="_blank"
                rel="noreferrer"
                className="h-10 px-4 rounded-pill border border-white/20 text-on-dark font-button hover:bg-white/10 transition-colors flex items-center gap-2"
              >
                Search OSV
                <ArrowSquareOut size={16} className="opacity-70" />
              </a>
            )}
            <button
              onClick={() => runAnalysis("vulnerability")}
              disabled={loading}
              className="h-10 px-6 rounded-pill bg-primary hover:bg-primary-active disabled:bg-primary-disabled disabled:text-muted text-ink font-button transition-colors flex items-center gap-2"
            >
              <Brain size={16} />
              {analysis ? "Re-analyze with AI" : "Run AI Security Scan"}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mx-auto mt-3 flex w-full max-w-[1500px] gap-2 rounded-xl border border-white/[.06] bg-white/[.025] p-1.5">
        <div className="flex gap-1">
          <button
            className={`rounded-lg px-4 py-2.5 text-body-md font-medium transition-colors flex items-center gap-2 ${activeTab === "overview" ? "bg-primary/10 text-primary" : "text-muted hover:text-on-dark"}`}
            onClick={() => setActiveTab("overview")}
          >
            <ChartBar size={16} /> Overview & Remediation
          </button>
          <button
            className={`rounded-lg px-4 py-2.5 text-body-md font-medium transition-colors flex items-center gap-2 ${activeTab === "tree" ? "bg-primary/10 text-primary" : "text-muted hover:text-on-dark"}`}
            onClick={() => setActiveTab("tree")}
          >
            <GitFork size={16} /> Dependency Node Tree Graph
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="max-w-[1500px] mx-auto w-full py-6 flex-1">
        {activeTab === "tree" && (
          <div className="space-y-4 h-full flex flex-col">
            <div className="bento flex items-center justify-between gap-4 p-5">
              <div>
                <p className="eyebrow mb-1">Topology explorer</p>
                <h2 className="text-title-md text-on-dark mb-1">
                  Dependency Topological Node Tree
                </h2>
                <p className="text-body-sm text-muted">
                  Visualizing how{" "}
                  <strong className="text-on-dark">
                    {finding.package_name || pkgName}
                  </strong>{" "}
                  connects into your project tree.
                </p>
              </div>
              <button
                onClick={() => setReconstructKey((k) => k + 1)}
                className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-ink hover:bg-primary-active"
              >
                Reconstruct graph
              </button>
            </div>
            <div className="bento grid-noise h-[600px] overflow-hidden p-2 relative">
              {dependencies ? (
                <DependencyGraph
                  dependencies={dependencies}
                  riskFilter={riskFilter}
                  reconstructKey={reconstructKey}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-muted">
                    No dependency graph available for this scan.
                  </p>
                </div>
              )}
            </div>
            <div className="bento flex flex-wrap items-center gap-3 p-4">
              <span className="eyebrow mr-2">Show nodes</span>
              {[
                [
                  "Safe",
                  "SAFE",
                  "bg-severity-low",
                  "text-severity-low",
                  "border-severity-low/40",
                ],
                [
                  "Moderate",
                  "MODERATE",
                  "bg-severity-moderate",
                  "text-severity-moderate",
                  "border-severity-moderate/40",
                ],
                [
                  "High",
                  "HIGH",
                  "bg-severity-high",
                  "text-severity-high",
                  "border-severity-high/40",
                ],
                [
                  "Critical",
                  "CRITICAL",
                  "bg-severity-critical",
                  "text-severity-critical",
                  "border-severity-critical/40",
                ],
              ].map(([label, level, color, textColor, activeBorder]) => {
                const active = riskFilter.includes(level);
                return (
                  <button
                    key={label}
                    onClick={() =>
                      setRiskFilter((prev) =>
                        prev.includes(level)
                          ? prev.filter((x) => x !== level)
                          : [...prev, level],
                      )
                    }
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${active ? `${activeBorder} ${textColor} bg-white/[.04]` : "border-white/[.07] bg-white/[.025] text-muted opacity-50 hover:opacity-80"}`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${color} ${active ? "" : "opacity-40"}`}
                    />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Risk Score, Pie Chart, History Map & Quick Qs */}
            <div className="lg:col-span-8 lg:order-2 space-y-6">
              {/* Vulnerability Pie Chart Breakdown */}
              <div className="bento p-6">
                <h3 className="text-title-sm text-on-dark mb-4 flex items-center gap-2">
                  <ChartPie size={16} className="text-primary" /> Risk Component
                  Pie Distribution
                </h3>
                <VulnerabilityChartPie
                  score={riskScoreVal}
                  severity={severityVal}
                />
              </div>

              {/* Vulnerability History Map & Lifecycle Graph */}
              <div className="bento p-6">
                <VulnerabilityHistoryGraph
                  version={finding.version || pkgVersion}
                  vulnId={finding.vulnerability_id || "CVE-2021-23337"}
                  targetVersion={analysis?.recommendation?.target_version}
                />
              </div>
            </div>

            {/* Right Column: AI Security Assessment & Real-time Intelligence */}
            <div className="lg:col-span-4 lg:order-1 space-y-6">
              <aside className="bento overflow-hidden p-5">
                <p className="eyebrow">Exposure score</p>
                <div className="my-4 flex items-end gap-3">
                  <span
                    className={`text-6xl font-semibold tracking-tighter ${severityColor(severityVal)}`}
                  >
                    {riskScoreVal}
                  </span>
                  <span className="mb-2 text-sm text-muted">/ 100</span>
                </div>
                <div
                  className={`mb-5 flex items-center gap-2 rounded-xl border px-3 py-2.5 ${severityVal === "CRITICAL" ? "border-severity-critical/40 bg-severity-critical/10 text-severity-critical" : severityVal === "HIGH" ? "border-severity-high/30 bg-severity-high/10 text-severity-high" : severityVal === "MEDIUM" || severityVal === "MODERATE" ? "border-severity-moderate/30 bg-severity-moderate/10 text-severity-moderate" : "border-severity-low/30 bg-severity-low/10 text-severity-low"}`}
                >
                  <span className="h-2 w-2 rounded-full bg-current" />
                  <span className="text-xs font-semibold uppercase tracking-[.12em]">
                    {severityVal} seriousness
                  </span>
                </div>
                <div className="border-t border-white/[.07] pt-4">
                  <p className="eyebrow mb-3">Quick security questions</p>
                  <div className="space-y-2">
                    {QUICK_QUESTIONS.map((qq, i) => (
                      <QuickQuestion
                        key={i}
                        label={qq.label}
                        disabled={loading}
                        onClick={() => runAnalysis(qq.type, qq.q)}
                      />
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => navigate("/investigator")}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-xs font-semibold text-ink hover:bg-primary-active"
                >
                  <Brain size={16} /> Open AI chat
                </button>
                <button
                  onClick={() => runAnalysis("vulnerability")}
                  disabled={loading}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-white/[.1] bg-white/[.03] py-3 text-xs font-semibold text-body hover:border-primary/40 hover:text-primary"
                >
                  <Lightning size={16} /> Research again
                </button>
              </aside>
              {loading && <LoadingSteps step={loadingStep} />}

              {error && !loading && (
                <div className="p-5 bg-trading-down/10 border border-trading-down/30 rounded-2xl">
                  <div className="flex items-start gap-3">
                    <Warning
                      size={20}
                      className="text-trading-down mt-0.5 shrink-0"
                    />
                    <div>
                      <p className="text-body-md font-semibold text-trading-down">
                        AI Assessment Error
                      </p>
                      <p className="text-body-sm text-muted mt-1">
                        {String(error)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {analysis && !loading && (
                <AnalysisResult analysis={analysis} finding={finding} />
              )}

              {!analysis && !loading && !error && (
                <div className="bento p-8 text-center">
                  <Brain
                    size={48}
                    className="text-primary mx-auto mb-4 opacity-40 animate-pulse"
                  />
                  <h3 className="text-title-md text-on-dark font-semibold mb-2">
                    Deep AI Security Analysis
                  </h3>
                  <p className="text-body-sm text-muted max-w-md mx-auto mb-6">
                    Click any quick security question or press "Run AI Security
                    Scan" to generate an authoritative patch analysis powered by
                    Groq and Tavily real-time research.
                  </p>
                  <button
                    onClick={() => runAnalysis("vulnerability")}
                    className="h-10 px-8 rounded-pill bg-primary hover:bg-primary-active text-ink font-button transition-colors inline-flex items-center gap-2"
                  >
                    <Lightning size={16} /> Start AI Security Assessment
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
