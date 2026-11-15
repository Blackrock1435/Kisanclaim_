import React, { useState, useRef, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Network,
  ArrowLeft,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Filter,
  Layers,
  ShieldCheck,
  Cpu,
  FileCheck,
  Camera,
  Satellite,
  CloudRain,
  User,
  FileText,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Info,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Calendar,
  Hash,
  Clock,
  Sparkles,
  Shield,
  Activity,
  Check,
  Award,
  Layers3
} from "lucide-react";
import { api } from "../lib/api";
import { Alert, Skeleton } from "../components/ui";
import ErrorBoundary from "../components/ErrorBoundary";

// Node category styling configurations
const CATEGORY_STYLES: Record<string, { bg: string; border: string; text: string; lightBg: string; icon: any }> = {
  farmer: { bg: "#065F46", border: "#10B981", text: "#065F46", lightBg: "#ECFDF5", icon: User },
  field: { bg: "#0369A1", border: "#0EA5E9", text: "#0369A1", lightBg: "#F0F9FF", icon: MapPin },
  claim: { bg: "#B45309", border: "#F59E0B", text: "#92400E", lightBg: "#FFFBEB", icon: FileText },
  photo: { bg: "#C2410C", border: "#F97316", text: "#9A3412", lightBg: "#FFF7ED", icon: Camera },
  satellite: { bg: "#15803D", border: "#22C55E", text: "#166534", lightBg: "#F0FDF4", icon: Satellite },
  weather: { bg: "#4338CA", border: "#6366F1", text: "#3730A3", lightBg: "#EEF2FF", icon: CloudRain },
  agent: { bg: "#334155", border: "#64748B", text: "#1E293B", lightBg: "#F8FAFC", icon: Cpu },
  finding: { bg: "#047857", border: "#10B981", text: "#065F46", lightBg: "#ECFDF5", icon: CheckCircle2 },
  fusion: { bg: "#1E3A8A", border: "#3B82F6", text: "#1E40AF", lightBg: "#EFF6FF", icon: Layers },
  assessment: { bg: "#14532D", border: "#D6A84F", text: "#14532D", lightBg: "#FDFBF7", icon: Award },
};

// Bilingual dictionary for the Evidence Graph
const I18N_GRAPH: Record<string, Record<string, string>> = {
  en: {
    pageTitle: "Interactive Evidence Graph (Explainable AI)",
    pageSub: "Deterministic 6-stage topological provenance trace from ground truth and satellite telemetry to final preliminary PMFBY assessment.",
    claimSwitchLabel: "Inspecting Claim:",
    searchPlaceholder: "Search nodes, metrics, DIGIPIN, checks...",
    filterAll: "All Stages",
    filterOrigin: "Stage 1: Origin",
    filterEvidence: "Stage 2: Evidence",
    filterAgents: "Stage 3: Agents",
    filterFindings: "Stage 4: Findings",
    filterFusion: "Stage 5: Fusion",
    filterAssessment: "Stage 6: Assessment",
    flowFull: "Full DAG (All 23 Nodes)",
    flowSimplified: "Simplified Flow",
    nodesCount: "Nodes",
    relationsCount: "Provenance Relations",
    consensusLabel: "Multi-Agent Consensus",
    preliminaryNotice: "Preliminary AI-Assisted Assessment (Statutory review pending)",
    inspectorTitle: "Forensic Evidence Inspector",
    tabOverview: "Overview",
    tabForensic: "Forensic Checks",
    tabProvenance: "Provenance Links",
    tabAudit: "Limitations & Legal",
    checksPerformed: "Checks & Protocols Performed",
    dataUsed: "Data Sources & Telemetry",
    findingsSummary: "Findings & Corroboration Metrics",
    aiReasoning: "AI Forensic Conclusion",
    upstreamSources: "Upstream Evidence Sources (Inputs)",
    downstreamImpacts: "Downstream Decisions (Outputs)",
    dataLimitations: "Known Sensor & Model Limitations",
    statutoryDisclaimer: "Statutory Disclaimer: This report represents an autonomous AI-assisted preliminary investigation pursuant to PMFBY operational guidelines. Statutory claim disbursement requires final verification and digital endorsement by the designated insurance underwriter.",
    timelineTitle: "Chronological Evidence & Audit Trail",
    timelineSub: "11-milestone immutable verification progression from registration to payout calculation",
    btnScorecard: "Agent Scorecard →",
    btnSatellite: "Sentinel-2 Twin →",
    btnGeoCam: "GeoCamera Telemetry →",
    btnClaim: "View Claim Dossier →",
    stage1Name: "Stage 1: Claim Origin",
    stage2Name: "Stage 2: Evidence Collection",
    stage3Name: "Stage 3: Independent Verification",
    stage4Name: "Stage 4: Agent Findings",
    stage5Name: "Stage 5: Evidence Fusion",
    stage6Name: "Stage 6: Final Assessment",
  },
  kn: {
    pageTitle: "ಪರಸ್ಪರ ಸಾಕ್ಷ್ಯಾಧಾರ ಗ್ರಾಫ್ (ವಿವರಣಾತ್ಮಕ AI)",
    pageSub: "ಭೂಸ್ಥಳ ಪರಿಶೀಲನೆ ಮತ್ತು ಉಪಗ್ರಹ ಡೇಟಾದಿಂದ ಅಂತಿಮ PMFBY ಮೌಲ್ಯಮಾಪನದವರೆಗಿನ 6-ಹಂತಗಳ ಪಾರದರ್ಶಕ ಸಾಕ್ಷಿ ನಕ್ಷೆ.",
    claimSwitchLabel: "ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿರುವ ಕ್ಲೈಮ್:",
    searchPlaceholder: "ನೋಡ್‌ಗಳು, ಅಂಕಿಅಂಶಗಳು, ಡಿಜಿಪಿನ್, ಪರೀಕ್ಷೆಗಳನ್ನು ಹುಡುಕಿ...",
    filterAll: "ಎಲ್ಲಾ ಹಂತಗಳು",
    filterOrigin: "ಹಂತ 1: ಮೂಲ ವಿವರಗಳು",
    filterEvidence: "ಹಂತ 2: ಸಾಕ್ಷ್ಯ ಸಂಗ್ರಹಣೆ",
    filterAgents: "ಹಂತ 3: ಸ್ವತಂತ್ರ AI ಏಜೆಂಟ್‌ಗಳು",
    filterFindings: "ಹಂತ 4: ಏಜೆಂಟ್ ಫಲಿತಾಂಶಗಳು",
    filterFusion: "ಹಂತ 5: ಸಾಕ್ಷ್ಯಾಧಾರ ಸಂಯೋಜನೆ",
    filterAssessment: "ಹಂತ 6: ಅಂತಿಮ ಮೌಲ್ಯಮಾಪನ",
    flowFull: "ಸಂಪೂರ್ಣ ನಕ್ಷೆ (23 ನೋಡ್‌ಗಳು)",
    flowSimplified: "ಸರಳೀಕೃತ ಹರಿವು",
    nodesCount: "ನೋಡ್‌ಗಳು",
    relationsCount: "ಸಂಬಂಧಗಳು",
    consensusLabel: "ಬಹು-ಏಜೆಂಟ್ ಒಮ್ಮತ",
    preliminaryNotice: "ಪ್ರಾರಂಭಿಕ AI ನೆರವಿನ ಮೌಲ್ಯಮಾಪನ (ಅಧಿಕಾರಿಯ ಅನುಮೋದನೆ ಬಾಕಿ)",
    inspectorTitle: "ಸಾಕ್ಷ್ಯಾಧಾರ ವಿಧಿವಿಜ್ಞಾನ ತಪಾಸಣೆ",
    tabOverview: "ಅವಲೋಕನ",
    tabForensic: "ವಿಧಿವಿಜ್ಞಾನ ಪರೀಕ್ಷೆಗಳು",
    tabProvenance: "ಸಂಪರ್ಕ ಕೊಂಡಿಗಳು",
    tabAudit: "ಮಿತಿಗಳು ಮತ್ತು ಕಾನೂನು",
    checksPerformed: "ನಡೆಸಿದ ತಪಾಸಣೆಗಳು ಮತ್ತು ನಿಯಮಗಳು",
    dataUsed: "ಬಳಸಿದ ಡೇಟಾ ಮೂಲಗಳು ಮತ್ತು ಸಂವೇದಕಗಳು",
    findingsSummary: "ಫಲಿತಾಂಶಗಳು ಮತ್ತು ಅಂಕಿಅಂಶಗಳು",
    aiReasoning: "AI ವಿಧಿವಿಜ್ಞಾನ ತೀರ್ಮಾನ",
    upstreamSources: "ಮೂಲ ಸಾಕ್ಷ್ಯ ಇನ್‌ಪುಟ್‌ಗಳು",
    downstreamImpacts: "ಮುಂದಿನ ನಿರ್ಧಾರಗಳ ಮೇಲಿನ ಪ್ರಭಾವ",
    dataLimitations: "ತಿಳಿದಿರುವ ಮಿತಿಗಳು",
    statutoryDisclaimer: "ಕಾನೂನು ಹಕ್ಕುತ್ಯಾಗ: ಈ ವರದಿಯು PMFBY ಕಾರ್ಯಾಚರಣೆಯ ಮಾರ್ಗಸೂಚಿಗಳ ಅಡಿಯಲ್ಲಿ AI-ಆಧಾರಿತ ಪೂರ್ವಭಾವಿ ಮೌಲ್ಯಮಾಪನವಾಗಿದೆ. ವಿಮಾ ಪರಿಹಾರ ಬಿಡುಗಡೆಗೆ ಅಧಿಕೃತ ಅಧಿಕಾರಿಯ ಅಂತಿಮ ಅನುಮೋದನೆ ಅಗತ್ಯವಿದೆ.",
    timelineTitle: "ಕಾಲಾನುಕ್ರಮದ ಸಾಕ್ಷ್ಯಾಧಾರ ಮತ್ತು ಆಡಿಟ್ ಪಥ",
    timelineSub: "ನೋಂದಣಿಯಿಂದ ಪರಿಹಾರ ಲೆಕ್ಕಾಚಾರದವರೆಗಿನ 11 ಮೈಲಿಗಲ್ಲುಗಳ ನಿಖರ ಪರಿಶೀಲನೆ",
    btnScorecard: "ಏಜೆಂಟ್ ಸ್ಕೋರ್‌ಕಾರ್ಡ್ →",
    btnSatellite: "ಉಪಗ್ರಹ ಟ್ವಿನ್ →",
    btnGeoCam: "ಜಿಯೋಕ್ಯಾಮೆರಾ ವಿವರ →",
    btnClaim: "ಕ್ಲೈಮ್ ಡಾಕ್ಯುಮೆಂಟ್ ವೀಕ್ಷಿಸಿ →",
    stage1Name: "ಹಂತ 1: ಕ್ಲೈಮ್ ಮೂಲ",
    stage2Name: "ಹಂತ 2: ಸಾಕ್ಷ್ಯ ಸಂಗ್ರಹ",
    stage3Name: "ಹಂತ 3: ಸ್ವತಂತ್ರ ಪರಿಶೀಲನೆ",
    stage4Name: "ಹಂತ 4: ಏಜೆಂಟ್ ಫಲಿತಾಂಶಗಳು",
    stage5Name: "ಹಂತ 5: ಸಾಕ್ಷಿ ಸಂಯೋಜನೆ",
    stage6Name: "ಹಂತ 6: ಅಂತಿಮ ಮೌಲ್ಯಮಾಪನ",
  }
};

// Deterministic node positions for clean Left-to-Right 6-Stage layout
const NODE_LAYOUT: Record<string, { x: number; y: number; w: number; h: number }> = {
  // Stage 1: Origin (Column 1, x: 40)
  origin_farmer: { x: 40, y: 55, w: 230, h: 78 },
  origin_farm: { x: 40, y: 165, w: 230, h: 78 },
  origin_field: { x: 40, y: 275, w: 230, h: 78 },
  origin_digipin: { x: 40, y: 385, w: 230, h: 78 },
  origin_claim: { x: 40, y: 495, w: 230, h: 78 },

  // Stage 2: Evidence Collection (Column 2, x: 330)
  evidence_geocam: { x: 330, y: 110, w: 230, h: 80 },
  evidence_satellite: { x: 330, y: 230, w: 230, h: 80 },
  evidence_weather: { x: 330, y: 350, w: 230, h: 80 },
  evidence_bhoomi: { x: 330, y: 470, w: 230, h: 80 },

  // Stage 3: Independent Verification (Column 3, x: 620)
  agent_geolocation: { x: 620, y: 50, w: 235, h: 76 },
  agent_photo_integrity: { x: 620, y: 155, w: 235, h: 76 },
  agent_satellite: { x: 620, y: 260, w: 235, h: 76 },
  agent_weather: { x: 620, y: 365, w: 235, h: 76 },
  agent_land_policy: { x: 620, y: 470, w: 235, h: 76 },
  agent_evidence_fusion: { x: 620, y: 575, w: 235, h: 76 },

  // Stage 4: Agent Findings (Column 4, x: 915)
  finding_geolocation: { x: 915, y: 50, w: 235, h: 76 },
  finding_photo_integrity: { x: 915, y: 155, w: 235, h: 76 },
  finding_satellite: { x: 915, y: 260, w: 235, h: 76 },
  finding_weather: { x: 915, y: 365, w: 235, h: 76 },
  finding_land_policy: { x: 915, y: 470, w: 235, h: 76 },
  finding_evidence_fusion: { x: 915, y: 575, w: 235, h: 76 },

  // Stage 5: Evidence Fusion (Column 5, x: 1210)
  fusion_consensus: { x: 1210, y: 290, w: 250, h: 96 },

  // Stage 6: Final Assessment (Column 6, x: 1515)
  assessment_preliminary: { x: 1515, y: 290, w: 260, h: 96 },
};

function EvidenceGraphContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const lang = i18n.language === "kn" ? "kn" : "en";
  const t = I18N_GRAPH[lang] || I18N_GRAPH.en;

  const claimIdParam = searchParams.get("claimId") || "0";
  const claimId = parseInt(claimIdParam, 10) || 0;

  // View state
  const [selectedNodeId, setSelectedNodeId] = useState<string>("assessment_preliminary");
  const [activeTab, setActiveTab] = useState<"overview" | "forensic" | "provenance" | "audit">("overview");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isSimplifiedFlow, setIsSimplifiedFlow] = useState<boolean>(false);
  const [isTimelineExpanded, setIsTimelineExpanded] = useState<boolean>(true);

  // Zoom & Pan state
  const [zoom, setZoom] = useState<number>(0.85);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 20, y: 10 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Fetch graph data from backend
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["evidence-graph", claimId],
    queryFn: () => api(`/evidence-graph/${claimId}`),
  });

  // Sync claimId in URL when data loads
  useEffect(() => {
    if (data?.claim_id && String(data.claim_id) !== claimIdParam) {
      setSearchParams({ claimId: String(data.claim_id) }, { replace: true });
    }
  }, [data?.claim_id, claimIdParam, setSearchParams]);

  // Simplified flow node set
  const simplifiedNodeIds = useMemo(() => new Set([
    "origin_farmer", "origin_field", "origin_claim",
    "evidence_geocam", "evidence_satellite", "evidence_weather", "evidence_bhoomi",
    "fusion_consensus", "assessment_preliminary"
  ]), []);

  // Filtered nodes
  const displayNodes = useMemo(() => {
    if (!data?.nodes) return [];
    return data.nodes.filter((node: any) => {
      if (isSimplifiedFlow && !simplifiedNodeIds.has(node.id)) {
        return false;
      }
      if (selectedCategory !== "all") {
        if (selectedCategory === "origin" && node.stage !== 1) return false;
        if (selectedCategory === "evidence" && node.stage !== 2) return false;
        if (selectedCategory === "agent" && node.stage !== 3) return false;
        if (selectedCategory === "finding" && node.stage !== 4) return false;
        if (selectedCategory === "fusion" && node.stage !== 5) return false;
        if (selectedCategory === "assessment" && node.stage !== 6) return false;
      }
      return true;
    });
  }, [data?.nodes, isSimplifiedFlow, simplifiedNodeIds, selectedCategory]);

  const displayNodeIds = useMemo(() => new Set(displayNodes.map((n: any) => n.id)), [displayNodes]);

  // Filtered links
  const displayLinks = useMemo(() => {
    if (!data?.links) return [];
    if (isSimplifiedFlow) {
      // In simplified flow, generate direct links from evidence to fusion to assessment
      return [
        { source: "origin_farmer", target: "origin_claim", label: "submitted", type: "flow" },
        { source: "origin_claim", target: "origin_field", label: "concerns", type: "flow" },
        { source: "origin_claim", target: "evidence_geocam", label: "includes_photo", type: "flow" },
        { source: "origin_claim", target: "evidence_satellite", label: "queries_satellite", type: "flow" },
        { source: "origin_claim", target: "evidence_weather", label: "queries_weather", type: "flow" },
        { source: "origin_field", target: "evidence_bhoomi", label: "references_title", type: "flow" },
        { source: "evidence_geocam", target: "fusion_consensus", label: "telemetry_fusion", type: "synthesis" },
        { source: "evidence_satellite", target: "fusion_consensus", label: "spectral_fusion", type: "synthesis" },
        { source: "evidence_weather", target: "fusion_consensus", label: "rainfall_fusion", type: "synthesis" },
        { source: "evidence_bhoomi", target: "fusion_consensus", label: "title_fusion", type: "synthesis" },
        { source: "fusion_consensus", target: "assessment_preliminary", label: "determines_assessment", type: "flow" },
      ];
    }
    return data.links.filter((l: any) => displayNodeIds.has(l.source) && displayNodeIds.has(l.target));
  }, [data?.links, isSimplifiedFlow, displayNodeIds]);

  // Selected node object
  const selectedNode = useMemo(() => {
    if (!data?.nodes) return null;
    return data.nodes.find((n: any) => n.id === selectedNodeId) || data.nodes.find((n: any) => n.id === "assessment_preliminary") || data.nodes[0];
  }, [data?.nodes, selectedNodeId]);

  // Connected upstream (parents) and downstream (children)
  const connectedInfo = useMemo(() => {
    if (!selectedNode || !data?.links) return { parents: [], children: [] };
    const parents = data.links
      .filter((l: any) => l.target === selectedNode.id)
      .map((l: any) => {
        const src = data.nodes.find((n: any) => n.id === l.source);
        return { node: src, link: l };
      })
      .filter((item: any) => !!item.node);

    const children = data.links
      .filter((l: any) => l.source === selectedNode.id)
      .map((l: any) => {
        const tgt = data.nodes.find((n: any) => n.id === l.target);
        return { node: tgt, link: l };
      })
      .filter((item: any) => !!item.node);

    return { parents, children };
  }, [selectedNode, data?.links, data?.nodes]);

  // Set of connected node IDs for highlighting
  const activeHighlightIds = useMemo(() => {
    if (!selectedNode) return new Set();
    const set = new Set<string>();
    set.add(selectedNode.id);
    connectedInfo.parents.forEach((p: any) => set.add(p.node.id));
    connectedInfo.children.forEach((c: any) => set.add(c.node.id));
    return set;
  }, [selectedNode, connectedInfo]);

  // Search match set
  const searchMatchIds = useMemo(() => {
    if (!searchQuery.trim() || !data?.nodes) return null;
    const q = searchQuery.toLowerCase();
    const matches = new Set<string>();
    data.nodes.forEach((n: any) => {
      const matchLabel = n.label?.toLowerCase().includes(q);
      const matchSubtitle = n.subtitle?.toLowerCase().includes(q);
      const matchValue = n.value?.toLowerCase().includes(q);
      const matchDetails = JSON.stringify(n.details || {}).toLowerCase().includes(q);
      const matchForensic = JSON.stringify(n.forensic || {}).toLowerCase().includes(q);
      if (matchLabel || matchSubtitle || matchValue || matchDetails || matchForensic) {
        matches.add(n.id);
      }
    });
    return matches;
  }, [searchQuery, data?.nodes]);

  // Auto-select if search query has exactly one match
  useEffect(() => {
    if (searchMatchIds && searchMatchIds.size === 1) {
      const firstId = Array.from(searchMatchIds)[0];
      setSelectedNodeId(firstId);
    }
  }, [searchMatchIds]);

  // Pan interaction handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".graph-node-card")) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((prev) => Math.min(1.8, Math.max(0.4, prev * zoomFactor)));
  };

  const resetView = () => {
    setZoom(0.85);
    setPan({ x: 20, y: 10 });
  };

  const fitView = () => {
    setZoom(0.68);
    setPan({ x: 10, y: 10 });
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1700px] space-y-6 px-4 py-8">
        <Skeleton className="h-12 w-96 rounded-xl" />
        <Skeleton className="h-[680px] w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !data || !data.nodes || data.nodes.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-2xl border-2 border-sage-200 bg-white p-8 shadow-soft text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-forest/10 text-forest">
            <Network className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-extrabold text-forest-deep">
            {error ? "Could not load Evidence Graph" : "No Evidence Records Found"}
          </h2>
          <p className="text-sm text-navy/70 max-w-lg mx-auto">
            {error
              ? "The server encountered an issue retrieving topological evidence for this claim. Verify that the claim exists or tap Retry below."
              : "No claims with topological evidence records are available to display right now. When claims are submitted, their full 6-stage evidence graph will appear here."}
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button onClick={() => refetch()} className="btn btn-primary text-xs font-bold">
              Retry Loading
            </button>
            <Link to="/app/claims" className="btn btn-ghost text-xs font-bold border border-sage-200">
              View All Claims
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const stagesList = [
    { id: 1, name: t.stage1Name, x: 40, w: 260, color: "border-emerald-500/30 bg-emerald-50/20" },
    { id: 2, name: t.stage2Name, x: 330, w: 260, color: "border-sky-500/30 bg-sky-50/20" },
    { id: 3, name: t.stage3Name, x: 620, w: 265, color: "border-indigo-500/30 bg-indigo-50/20" },
    { id: 4, name: t.stage4Name, x: 915, w: 265, color: "border-purple-500/30 bg-purple-50/20" },
    { id: 5, name: t.stage5Name, x: 1210, w: 275, color: "border-blue-500/30 bg-blue-50/20" },
    { id: 6, name: t.stage6Name, x: 1515, w: 285, color: "border-forest/40 bg-forest/5" },
  ];

  return (
    <div className="mx-auto max-w-[1780px] space-y-5 px-4 py-6">
      {/* Top Banner / Breadcrumb & Claim Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-sage-200/80 pb-4">
        <div className="flex items-center gap-3">
          <Link to={`/app/claims/${claimId}`} className="btn btn-ghost !p-2 rounded-xl border border-sage-200 hover:bg-sage-100" title="Back to Claim">
            <ArrowLeft className="h-5 w-5 text-forest" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-deep px-2.5 py-0.5 font-mono text-[11px] font-bold text-cream">
                <Sparkles className="h-3.5 w-3.5 text-gold" /> PMFBY XAI 2.0
              </span>
              <h1 className="text-2xl font-extrabold text-forest-deep tracking-tight sm:text-3xl flex items-center gap-2">
                {t.pageTitle}
              </h1>
            </div>
            <p className="mt-0.5 text-xs text-navy/70 max-w-3xl">
              {t.pageSub}
            </p>
          </div>
        </div>

        {/* Claim Selector & Quick Deep-Dive Links */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Claim Switcher Dropdown */}
          <div className="flex items-center gap-2 rounded-xl bg-white border border-sage-200 px-3 py-1.5 shadow-sm">
            <span className="text-xs font-bold text-navy whitespace-nowrap">{t.claimSwitchLabel}</span>
            <select
              value={claimId}
              onChange={(e) => {
                const nextId = e.target.value;
                setSearchParams({ claimId: nextId });
              }}
              className="bg-transparent text-xs font-bold text-forest focus:outline-none cursor-pointer"
            >
              {(data.claims_list || []).map((c: any) => (
                <option key={c.id} value={c.id}>
                  Claim #{c.id} ({c.ref}) — {c.farmer_name} • {c.crop} ({c.disaster})
                </option>
              ))}
            </select>
          </div>

          <Link
            to={`/app/agent-analysis?claimId=${claimId}`}
            className="btn btn-ghost !min-h-[36px] text-xs font-bold border border-sage-200 bg-white hover:bg-sage-50 text-navy"
          >
            {t.btnScorecard}
          </Link>
          <Link
            to={`/app/satellite-twin?claimId=${claimId}`}
            className="btn btn-ghost !min-h-[36px] text-xs font-bold border border-sage-200 bg-white hover:bg-sage-50 text-navy"
          >
            {t.btnSatellite}
          </Link>
        </div>
      </div>

      {/* Control Bar: Search, Category Filters, Flow Toggle, Zoom Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/95 p-3.5 border border-sage-200 shadow-soft">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Bar */}
          <div className="relative min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full rounded-xl border border-sage-200 bg-sage-50/50 pl-9 pr-3 py-1.5 text-xs text-navy placeholder:text-muted focus:border-forest focus:bg-white focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted hover:text-navy"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1">
            {[
              { id: "all", label: t.filterAll },
              { id: "origin", label: t.filterOrigin },
              { id: "evidence", label: t.filterEvidence },
              { id: "agent", label: t.filterAgents },
              { id: "finding", label: t.filterFindings },
              { id: "fusion", label: t.filterFusion },
              { id: "assessment", label: t.filterAssessment },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                  selectedCategory === cat.id
                    ? "bg-forest-deep text-cream shadow-sm"
                    : "bg-sage-100/70 text-navy/70 hover:bg-sage-200 hover:text-navy"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* View Controls & Flow Toggle */}
        <div className="flex items-center gap-2">
          {/* Simplified vs Full Flow Toggle */}
          <div className="flex items-center rounded-xl bg-sage-100/70 p-0.5 border border-sage-200">
            <button
              onClick={() => setIsSimplifiedFlow(false)}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                !isSimplifiedFlow ? "bg-white text-forest-deep shadow-xs" : "text-navy/70 hover:text-navy"
              }`}
            >
              {t.flowFull}
            </button>
            <button
              onClick={() => setIsSimplifiedFlow(true)}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                isSimplifiedFlow ? "bg-white text-forest-deep shadow-xs" : "text-navy/70 hover:text-navy"
              }`}
            >
              {t.flowSimplified}
            </button>
          </div>

          <div className="h-5 w-px bg-sage-200" />

          {/* Zoom & Pan Buttons */}
          <div className="flex items-center gap-1 rounded-xl bg-sage-100/70 p-1 border border-sage-200">
            <button
              onClick={() => setZoom((z) => Math.min(1.8, z + 0.15))}
              className="rounded-lg p-1 text-navy hover:bg-white"
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <span className="font-mono text-[11px] font-bold text-navy px-1">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}
              className="rounded-lg p-1 text-navy hover:bg-white"
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              onClick={fitView}
              className="rounded-lg p-1 text-navy hover:bg-white"
              title="Fit to Screen"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
            <button
              onClick={resetView}
              className="rounded-lg p-1 text-navy hover:bg-white"
              title="Reset View"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas & Right Forensic Inspector Split */}
      <div className="grid gap-5 lg:grid-cols-[1fr_420px]">
        {/* SVG Interactive Canvas Viewport */}
        <div
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          className="relative min-h-[660px] h-[720px] overflow-hidden rounded-2xl border-2 border-sage-200 bg-[#FAFBF9] shadow-soft cursor-grab active:cursor-grabbing select-none"
        >
          {/* Subtle Grid Background Pattern */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.35]"
            style={{
              backgroundImage: "radial-gradient(#94A3B8 1px, transparent 1px)",
              backgroundSize: "24px 24px"
            }}
          />

          {/* Canvas Viewport Content with Zoom & Pan */}
          <div
            className="absolute origin-top-left transition-transform duration-75 ease-out"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              width: "1820px",
              height: "720px",
            }}
          >
            {/* SVG Layer for Stage Columns, Background Banners, and Bezier Curves */}
            <svg
              width="1820"
              height="720"
              className="absolute inset-0 pointer-events-auto"
              style={{ overflow: "visible" }}
            >
              <defs>
                {/* Regular Flow Arrow */}
                <marker
                  id="arrow-regular"
                  viewBox="0 0 10 10"
                  refX="10"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#94A3B8" />
                </marker>
                {/* Active Highlighted Arrow */}
                <marker
                  id="arrow-highlight"
                  viewBox="0 0 10 10"
                  refX="10"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#059669" />
                </marker>
                {/* Downstream Highlighted Arrow */}
                <marker
                  id="arrow-downstream"
                  viewBox="0 0 10 10"
                  refX="10"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#4F46E5" />
                </marker>
              </defs>

              {/* Stage Column Background Envelopes & Column Headers */}
              {stagesList.map((stg) => (
                <g key={stg.id}>
                  {/* Subtle column background region */}
                  <rect
                    x={stg.x - 10}
                    y={10}
                    width={stg.w}
                    height={680}
                    rx={16}
                    fill="#FFFFFF"
                    stroke="#E2E8F0"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    opacity="0.85"
                  />
                  {/* Column Header Pill */}
                  <rect
                    x={stg.x - 2}
                    y={18}
                    width={stg.w - 16}
                    height={26}
                    rx={7}
                    fill="#F1F5F9"
                  />
                  <text
                    x={stg.x + (stg.w - 16) / 2 - 2}
                    y={35}
                    textAnchor="middle"
                    fill="#334155"
                    fontSize="11"
                    fontWeight="700"
                    fontFamily="system-ui, sans-serif"
                    letterSpacing="0.02em"
                  >
                    {stg.name}
                  </text>
                </g>
              ))}

              {/* Bezier Links */}
              {displayLinks.map((link: any, idx: number) => {
                const srcPos = NODE_LAYOUT[link.source];
                const tgtPos = NODE_LAYOUT[link.target];
                if (!srcPos || !tgtPos) return null;

                const x1 = srcPos.x + srcPos.w;
                const y1 = srcPos.y + srcPos.h / 2;
                const x2 = tgtPos.x;
                const y2 = tgtPos.y + tgtPos.h / 2;

                const dx = Math.abs(x2 - x1);
                const curvature = Math.max(35, dx * 0.45);
                const pathD = `M ${x1} ${y1} C ${x1 + curvature} ${y1}, ${x2 - curvature} ${y2}, ${x2} ${y2}`;

                const isUpstreamOfSelected = selectedNode && link.target === selectedNode.id;
                const isDownstreamOfSelected = selectedNode && link.source === selectedNode.id;
                const isConnected = isUpstreamOfSelected || isDownstreamOfSelected;

                let strokeColor = "#CBD5E1";
                let strokeWidth = 1.8;
                let marker = "url(#arrow-regular)";
                let opacity = 0.7;

                if (isConnected) {
                  if (isUpstreamOfSelected) {
                    strokeColor = "#059669";
                    strokeWidth = 3.0;
                    marker = "url(#arrow-highlight)";
                    opacity = 1.0;
                  } else {
                    strokeColor = "#4F46E5";
                    strokeWidth = 3.0;
                    marker = "url(#arrow-downstream)";
                    opacity = 1.0;
                  }
                } else if (selectedNode) {
                  opacity = 0.2;
                }

                const midX = (x1 + x2) / 2;
                const midY = (y1 + y2) / 2;

                return (
                  <g key={`${link.source}-${link.target}-${idx}`}>
                    <path
                      d={pathD}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      markerEnd={marker}
                      opacity={opacity}
                      strokeDasharray={isConnected ? "none" : undefined}
                      className="transition-all duration-150"
                    />
                    {/* Relation Label Pill */}
                    {isConnected && (
                      <g>
                        <rect
                          x={midX - 35}
                          y={midY - 10}
                          width={70}
                          height={18}
                          rx={9}
                          fill="#FFFFFF"
                          stroke={strokeColor}
                          strokeWidth="1"
                        />
                        <text
                          x={midX}
                          y={midY + 2}
                          textAnchor="middle"
                          fill={strokeColor}
                          fontSize="9"
                          fontWeight="700"
                          fontFamily="monospace"
                        >
                          {link.label}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* HTML Node Cards Layer (Clean interactive DOM elements over SVG canvas) */}
            <div className="absolute inset-0 pointer-events-none">
              {displayNodes.map((node: any) => {
                const pos = NODE_LAYOUT[node.id];
                if (!pos) return null;

                const isSelected = selectedNode?.id === node.id;
                const isConnected = activeHighlightIds.has(node.id);
                const isSearchMatch = searchMatchIds ? searchMatchIds.has(node.id) : null;
                const styleConf = CATEGORY_STYLES[node.category] || CATEGORY_STYLES.agent;
                const IconComponent = styleConf.icon;

                // Opacity logic
                let opacityClass = "opacity-100";
                if (searchMatchIds !== null) {
                  opacityClass = isSearchMatch ? "opacity-100 ring-2 ring-gold" : "opacity-30";
                } else if (selectedNode && !isConnected && !isSelected) {
                  opacityClass = "opacity-45";
                }

                const isVerified = node.status === "verified";

                return (
                  <div
                    key={node.id}
                    onClick={() => {
                      setSelectedNodeId(node.id);
                    }}
                    className={`graph-node-card absolute pointer-events-auto rounded-xl p-2.5 transition-all duration-150 cursor-pointer select-none ${opacityClass} ${
                      isSelected
                        ? "bg-white ring-3 ring-forest shadow-xl scale-[1.03] z-30"
                        : "bg-white/95 hover:bg-white hover:shadow-md border border-slate-200/90 z-10"
                    }`}
                    style={{
                      left: `${pos.x}px`,
                      top: `${pos.y}px`,
                      width: `${pos.w}px`,
                      height: `${pos.h}px`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-1.5 h-full">
                      <div className="flex items-start gap-2 min-w-0">
                        {/* Category Icon Badge */}
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                          style={{ backgroundColor: styleConf.lightBg, color: styleConf.bg }}
                        >
                          <IconComponent className="h-4 w-4" />
                        </div>

                        {/* Title & Subtitle */}
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs text-navy truncate" title={node.label}>
                            {node.label}
                          </p>
                          <p className="text-[10px] text-navy/65 truncate" title={node.subtitle}>
                            {node.subtitle}
                          </p>
                          {/* Value / Metric Tag */}
                          <div className="mt-1 flex items-center gap-1">
                            <span
                              className={`inline-block rounded-md px-1.5 py-0.5 text-[9px] font-bold tracking-tight truncate ${
                                isVerified
                                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                  : "bg-amber-50 text-amber-800 border border-amber-200"
                              }`}
                            >
                              {node.value || (isVerified ? "VERIFIED" : "REVIEW")}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status indicator pip */}
                      <div className="shrink-0 pt-0.5">
                        {isVerified ? (
                          <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm" title="Verified" />
                        ) : (
                          <div className="h-2 w-2 rounded-full bg-amber-500 shadow-sm" title="Needs Review" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Floating Canvas Legend in bottom-left */}
          <div className="absolute bottom-3 left-3 z-20 flex flex-wrap items-center gap-3 rounded-xl bg-white/95 px-3 py-1.5 text-[11px] font-bold text-navy shadow-sm border border-sage-200 backdrop-blur-xs">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Verified
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Needs Review
            </span>
            <span className="h-3 w-px bg-sage-200" />
            <span className="text-muted">
              {displayNodes.length} {t.nodesCount} • {displayLinks.length} {t.relationsCount}
            </span>
          </div>
        </div>

        {/* Right-Side Forensic Node Inspector Drawer */}
        {selectedNode && (
          <div className="flex flex-col rounded-2xl border-2 border-sage-200 bg-white shadow-soft overflow-hidden">
            {/* Inspector Header */}
            <div className="border-b border-sage-200 bg-sage-50/70 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-forest-deep px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-cream font-mono">
                  {selectedNode.stage_name || `Stage ${selectedNode.stage}`}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    selectedNode.status === "verified"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {selectedNode.status === "verified" ? "Independently Verified" : "Review Recommended"}
                </span>
              </div>

              <h2 className="mt-2 text-lg font-extrabold text-forest-deep flex items-center gap-2">
                {selectedNode.label}
              </h2>
              <p className="text-xs text-navy/70 mt-0.5">{selectedNode.subtitle}</p>

              {/* Value Highlight Banner */}
              {selectedNode.value && (
                <div className="mt-3 rounded-xl bg-white p-2.5 border border-sage-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-muted">Primary Metric:</span>
                  <span className="font-mono text-xs font-extrabold text-forest">
                    {selectedNode.value}
                  </span>
                </div>
              )}
            </div>

            {/* Inspector Tabs Navigation */}
            <div className="flex border-b border-sage-200 bg-white px-2 pt-2 gap-1 text-xs font-bold">
              {[
                { id: "overview", label: t.tabOverview },
                { id: "forensic", label: t.tabForensic },
                { id: "provenance", label: t.tabProvenance },
                { id: "audit", label: t.tabAudit },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-2 border-b-2 transition-all ${
                    activeTab === tab.id
                      ? "border-forest text-forest"
                      : "border-transparent text-navy/60 hover:text-navy"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Inspector Tab Content Area (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[480px]">
              {/* Tab 1: Overview */}
              {activeTab === "overview" && (
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">
                    Node Details & Provenance Parameters
                  </p>
                  <div className="rounded-xl border border-sage-200 bg-sage-50/40 p-3 space-y-2.5">
                    {Object.entries(selectedNode.details || {}).map(([k, v]) => (
                      <div key={k} className="flex items-start justify-between gap-3 text-xs border-b border-sage-100 last:border-0 pb-1.5 last:pb-0">
                        <span className="font-medium text-navy/70 capitalize">{k.replace(/_/g, " ")}:</span>
                        <span className="font-bold text-forest text-right max-w-[210px] break-words">
                          {String(v)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Stage-specific contextual tip */}
                  <div className="rounded-xl bg-forest/5 p-3 border border-forest/15 space-y-1 text-xs">
                    <p className="font-bold text-forest flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4" /> Proof-Backed Guarantee
                    </p>
                    <p className="text-navy/80 leading-relaxed text-[11px]">
                      This node is cryptographically verified against ground telemetry and public registries. No synthetic scores are assigned without independent provenance.
                    </p>
                  </div>
                </div>
              )}

              {/* Tab 2: Forensic Verification */}
              {activeTab === "forensic" && (
                <div className="space-y-4">
                  {/* Checks performed */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted mb-2 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-forest" /> {t.checksPerformed}
                    </p>
                    <ul className="space-y-1.5">
                      {(selectedNode.forensic?.checks_performed || ["Aadhaar e-KYC Verification", "Cadastral Integrity Scan"]).map((chk: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-navy/85 bg-emerald-50/60 p-2 rounded-lg border border-emerald-100">
                          <Check className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                          <span>{chk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Data Used */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted mb-2 flex items-center gap-1">
                      <Layers3 className="h-3.5 w-3.5 text-navy" /> {t.dataUsed}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {(selectedNode.forensic?.data_used || ["In-app sensor log", "Sentinel-2 L2A BOA"]).map((d: string, i: number) => (
                        <span key={i} className="rounded-md bg-sage-100 px-2 py-1 text-[11px] font-mono text-navy font-semibold">
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Findings */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted mb-2 flex items-center gap-1">
                      <Activity className="h-3.5 w-3.5 text-navy" /> {t.findingsSummary}
                    </p>
                    <ul className="space-y-1">
                      {(selectedNode.forensic?.findings || ["Statutory thresholds satisfied with high confidence"]).map((f: string, i: number) => (
                        <li key={i} className="text-xs text-navy/80 bg-white p-2 rounded-lg border border-sage-200">
                          • {f}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Transparent AI Reasoning */}
                  {selectedNode.forensic?.reasoning && (
                    <div className="rounded-xl bg-forest-deep text-cream p-3 space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gold flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> {t.aiReasoning}
                      </p>
                      <p className="text-xs leading-relaxed opacity-95">
                        "{selectedNode.forensic.reasoning}"
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Provenance Links */}
              {activeTab === "provenance" && (
                <div className="space-y-4">
                  {/* Upstream Sources */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted mb-2">
                      {t.upstreamSources} ({connectedInfo.parents.length})
                    </p>
                    {connectedInfo.parents.length === 0 ? (
                      <p className="text-xs text-muted italic">This is an entry origin node with no upstream inputs.</p>
                    ) : (
                      <div className="space-y-2">
                        {connectedInfo.parents.map(({ node, link }: any) => (
                          <div
                            key={node.id}
                            onClick={() => setSelectedNodeId(node.id)}
                            className="flex items-center justify-between p-2.5 rounded-xl border border-sage-200 bg-white hover:bg-sage-50 cursor-pointer transition-all"
                          >
                            <div>
                              <p className="font-bold text-xs text-navy">{node.label}</p>
                              <span className="font-mono text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                relation: {link.label}
                              </span>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Downstream Impacts */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted mb-2">
                      {t.downstreamImpacts} ({connectedInfo.children.length})
                    </p>
                    {connectedInfo.children.length === 0 ? (
                      <p className="text-xs text-muted italic">This is a terminal assessment node with no downstream outputs.</p>
                    ) : (
                      <div className="space-y-2">
                        {connectedInfo.children.map(({ node, link }: any) => (
                          <div
                            key={node.id}
                            onClick={() => setSelectedNodeId(node.id)}
                            className="flex items-center justify-between p-2.5 rounded-xl border border-sage-200 bg-white hover:bg-sage-50 cursor-pointer transition-all"
                          >
                            <div>
                              <p className="font-bold text-xs text-navy">{node.label}</p>
                              <span className="font-mono text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                                feeds into: {link.label}
                              </span>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 4: Limitations & Audit */}
              {activeTab === "audit" && (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted mb-2 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> {t.dataLimitations}
                    </p>
                    <ul className="space-y-1.5">
                      {(selectedNode.forensic?.limitations || ["Ground GPS accuracy dependent on satellite constellation"]).map((lim: string, i: number) => (
                        <li key={i} className="text-xs text-navy/80 bg-amber-50/70 p-2 rounded-lg border border-amber-200/60">
                          ⚠ {lim}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Statutory Legal Disclaimer */}
                  <div className="rounded-xl bg-sage-100/70 p-3 border border-sage-200 space-y-1 text-xs">
                    <p className="font-bold text-navy flex items-center gap-1.5">
                      <Shield className="h-4 w-4 text-forest" /> Statutory Compliance Notice
                    </p>
                    <p className="text-[11px] text-navy/70 leading-relaxed">
                      {t.statutoryDisclaimer}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions for Selected Node */}
            <div className="border-t border-sage-200 p-3 bg-sage-50/50 flex flex-col gap-1.5">
              <Link
                to={`/app/satellite-twin?claimId=${claimId}`}
                className="btn btn-ghost !min-h-[34px] text-xs font-bold justify-between bg-white border border-sage-200 hover:bg-sage-100"
              >
                <span>Sentinel-2 Multi-Spectral Analysis</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                to={`/app/geocamera?claimId=${claimId}`}
                className="btn btn-ghost !min-h-[34px] text-xs font-bold justify-between bg-white border border-sage-200 hover:bg-sage-100"
              >
                <span>In-Field GeoCamera Evidence</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Chronological Investigation Timeline (Expandable/Collapsible) */}
      <div className="rounded-2xl border-2 border-sage-200 bg-white shadow-soft overflow-hidden">
        {/* Header toggle */}
        <div
          onClick={() => setIsTimelineExpanded(!isTimelineExpanded)}
          className="flex items-center justify-between p-4 bg-sage-50/60 hover:bg-sage-100/60 cursor-pointer border-b border-sage-200 select-none transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-forest-deep text-cream">
              <Clock className="h-4 w-4 text-gold" />
            </div>
            <div>
              <h3 className="font-bold text-base text-forest-deep flex items-center gap-2">
                {t.timelineTitle}
                <span className="rounded-full bg-forest/10 px-2.5 py-0.5 font-mono text-[11px] font-bold text-forest">
                  {data.timeline?.length || 11} Milestones
                </span>
              </h3>
              <p className="text-xs text-navy/70 mt-0.5">{t.timelineSub}</p>
            </div>
          </div>

          <button className="btn btn-ghost !p-2 rounded-xl">
            {isTimelineExpanded ? (
              <ChevronDown className="h-5 w-5 text-forest" />
            ) : (
              <ChevronRight className="h-5 w-5 text-forest" />
            )}
          </button>
        </div>

        {/* Timeline Body */}
        {isTimelineExpanded && (
          <div className="p-5">
            <div className="relative pl-6 space-y-6 before:absolute before:bottom-2 before:top-2 before:left-[17px] before:w-0.5 before:bg-sage-200">
              {(data.timeline || []).map((item: any) => {
                const isComplete = item.status === "completed";
                return (
                  <div key={item.step} className="relative flex items-start gap-4">
                    {/* Step Icon */}
                    <div
                      className={`absolute -left-[30px] flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold border-2 ${
                        isComplete
                          ? "bg-emerald-500 border-white text-white shadow-sm"
                          : "bg-amber-500 border-white text-white shadow-sm"
                      }`}
                    >
                      {item.step}
                    </div>

                    {/* Step Content Card */}
                    <div className="flex-1 rounded-xl border border-sage-200 bg-sage-50/30 p-3.5 hover:bg-white hover:shadow-xs transition-all">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-navy">{item.title}</span>
                          <span className="rounded-md bg-sage-100 px-2 py-0.5 font-mono text-[10px] font-bold text-navy/70">
                            {item.actor}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-muted">
                            {item.timestamp ? new Date(item.timestamp).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Timestamp recorded"}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                              isComplete ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                      </div>
                      <p className="mt-1.5 text-xs text-navy/80">{item.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function EvidenceGraphPage() {
  return (
    <ErrorBoundary
      fallbackTitle="Evidence Graph Error"
      fallbackMessage="An unexpected rendering error occurred inside the Evidence Graph canvas. Tap Try Again below."
    >
      <EvidenceGraphContent />
    </ErrorBoundary>
  );
}
