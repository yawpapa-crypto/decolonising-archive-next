"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { createPortal } from "react-dom";

// ─── Inline SVG Icons ────────────────────────────────────────────────────────

const PlayIcon = ({ size = 12 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size} style={{ display: "inline-block", verticalAlign: "middle" }}>
    <path d="M8 5v14l11-7z"/>
  </svg>
);

const PauseIcon = ({ size = 12 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size} style={{ display: "inline-block", verticalAlign: "middle" }}>
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
  </svg>
);

const TrashIcon = ({ size = 12 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} style={{ display: "inline-block", verticalAlign: "middle" }}>
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    <line x1="10" y1="11" x2="10" y2="17"/>
    <line x1="14" y1="11" x2="14" y2="17"/>
  </svg>
);

const EyeIcon = ({ size = 12 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} style={{ display: "inline-block", verticalAlign: "middle" }}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const CloseIcon = ({ size = 12 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} style={{ display: "inline-block", verticalAlign: "middle" }}>
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const DownloadIcon = ({ size = 12 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} style={{ display: "inline-block", verticalAlign: "middle" }}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const PlusIcon = ({ size = 12 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} style={{ display: "inline-block", verticalAlign: "middle" }}>
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const FullscreenEnterIcon = ({ size = 12 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} style={{ display: "inline-block", verticalAlign: "middle" }}>
    <path d="M8 3H5a2 2 0 0 0-2 2v3"/>
    <path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
    <path d="M3 16v3a2 2 0 0 0 2 2h3"/>
    <path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
  </svg>
);

const FullscreenExitIcon = ({ size = 12 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} style={{ display: "inline-block", verticalAlign: "middle" }}>
    <path d="M8 3v3a2 2 0 0 1-2 2H3"/>
    <path d="M21 8h-3a2 2 0 0 1-2-2V3"/>
    <path d="M3 16h3a2 2 0 0 1 2 2v3"/>
    <path d="M16 21v-3a2 2 0 0 1 2-2h3"/>
  </svg>
);

const ResetZoomIcon = ({ size = 11 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} style={{ display: "inline-block", verticalAlign: "middle" }}>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
    <path d="M3 3v5h5"/>
  </svg>
);

// ─── Types ─────────────────────────────────────────────────────────────────────

type BeyondDataMapNode = {
  id: string;
  type: string;
  label: string;
  shortLabel?: string;
  description?: string;
  ring: number;
  baseAngle: number;
  size: number;
  weight: number;
  recordIds: string[];
  source?: string;
  query?: string;
};

type BeyondDataMapEdge = {
  id: string;
  from: string;
  to: string;
  type: string;
  strength: number;
};

type BeyondDataMapDetail = {
  visualMap: {
    nodes: BeyondDataMapNode[];
    edges: BeyondDataMapEdge[];
    currentQuery?: string;
    title?: string;
    subtitle?: string;
    summary?: string;
  };
  layout: string;
  viewMode?: "radial" | "network";
  activeNodeId: string;
  hoveredNodeId?: string;
  mapVersion?: number;
};

declare global {
  interface Window {
    beyondDataMapFlow?: {
      exportAsPng?: (filename: string) => Promise<void>;
      exportAsJpeg?: (filename: string) => Promise<void>;
      exportAsSvg?: (filename: string) => Promise<void>;
      copySummary?: (summary: string) => Promise<void>;
    };
    __beyondDataFlowLastRender?: BeyondDataMapDetail;
  }
}

const HOST_ID = "beyondDataFlowHost";
const CANVAS_W = 860;
const CANVAS_H = 640;
// Orbit centre — shifted 50 px left of canvas centre so rings clear
// the right-side inspector overlay and the composition feels balanced.
const ORBIT_CX = 380;
const ORBIT_CY = 310;
// Ring radii — ~30 % larger than before; max 286 px keeps the outer
// ring inside the 860×640 canvas with comfortable edge clearance.
const RING_RADII = [0, 68, 122, 177, 231, 286];

const RING_SPEEDS = [
  0,
  (2 * Math.PI) / 80,
  (2 * Math.PI) / 120,
  (2 * Math.PI) / 160,
  -(2 * Math.PI) / 140, // reverse rotation
  (2 * Math.PI) / 200
];

// Labels shown inside each ring guide
const RING_LABELS = ["", "Source", "Records", "Keywords", "Absences", "Counter-searches"];

// ─── Network layout zones (860 × 640 canvas) ─────────────────────────────────

const NETWORK_ZONES: Record<string, {
  x0: number; y0: number; x1: number; y1: number; label: string; color: string;
}> = {
  source_position: { x0: 20,  y0: 100, x1: 205, y1: 540, label: "Source positions", color: "rgba(52,211,153,0.06)"  },
  keyword:         { x0: 655, y0: 100, x1: 840, y1: 540, label: "Keywords",         color: "rgba(52,180,252,0.06)"  },
  absence:         { x0: 205, y0: 20,  x1: 655, y1: 155, label: "Absences",         color: "rgba(248,113,113,0.06)" },
  counter_search:  { x0: 205, y0: 485, x1: 655, y1: 620, label: "Counter-searches", color: "rgba(53,211,154,0.06)"  },
};

function networkZoneKey(type: string): string | null {
  if (type === "query") return "query";
  if (type === "record") return "record";
  if (type === "keyword" || type === "tag") return "keyword";
  if (type === "source_position" || type === "visible_label" || type === "cluster") return "source_position";
  if (type === "absence") return "absence";
  if (type === "counter_search") return "counter_search";
  return null;
}

function layoutNetworkNodes(nodes: BeyondDataMapNode[]): PositionedNode[] {
  const CX = CANVAS_W / 2;
  const CY = CANVAS_H / 2;

  const byZone: Record<string, BeyondDataMapNode[]> = {};
  for (const node of nodes) {
    const zk = networkZoneKey(node.type) ?? "keyword";
    if (!byZone[zk]) byZone[zk] = [];
    byZone[zk].push(node);
  }

  const result: PositionedNode[] = [];

  // Query node at canvas centre
  for (const node of byZone["query"] ?? []) {
    result.push({ ...node, cx: CX, cy: CY, currentAngle: 0 });
  }

  // Records in an oval cluster around centre
  const recs = byZone["record"] ?? [];
  recs.forEach((node, i) => {
    const n = recs.length;
    const angle = (i / Math.max(n, 1)) * Math.PI * 2 - Math.PI / 2;
    const base = n <= 4 ? 105 : n <= 8 ? 115 : 130;
    const r = base + (i % 2) * 22;
    result.push({
      ...node,
      cx: Math.round(CX + Math.cos(angle) * r),
      cy: Math.round(CY + Math.sin(angle) * r * 0.76),
      currentAngle: 0,
    });
  });

  // Semantic zones: grid layout within bounding box
  for (const [zk, zone] of Object.entries(NETWORK_ZONES)) {
    const zoneNodes = byZone[zk] ?? [];
    if (!zoneNodes.length) continue;
    const count = zoneNodes.length;
    const zW = zone.x1 - zone.x0;
    const zH = zone.y1 - zone.y0;
    const cols = zW > zH
      ? Math.max(1, Math.ceil(count / 2))
      : Math.max(1, Math.ceil(Math.sqrt(count)));
    const rows = Math.ceil(count / cols);
    const colStep = zW / (cols + 1);
    const rowStep = zH / (rows + 1);

    zoneNodes.forEach((node, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const seed = Math.abs(node.baseAngle ?? (i * 0.731));
      const jX = ((seed * 17.3) % 1 - 0.5) * colStep * 0.28;
      const jY = ((seed * 11.7) % 1 - 0.5) * rowStep * 0.28;
      result.push({
        ...node,
        cx: Math.round(zone.x0 + (col + 1) * colStep + jX),
        cy: Math.round(zone.y0 + (row + 1) * rowStep + jY),
        currentAngle: 0,
      });
    });
  }

  return result;
}

function getDotColor(type = ""): string {
  switch (type) {
    case "query": return "#d7ff3f"; // yellow-green core
    case "record": return "#2f6bff"; // blue
    case "keyword": return "#34d8ff"; // cyan
    case "tag": return "#8a5cff"; // violet
    case "source_position": return "#9aa8ff"; // pale blue
    case "absence": return "#ff315f"; // red/magenta
    case "cluster": return "#b14dff"; // violet cluster
    case "counter_search": return "#35d39a"; // green/amber
    default: return "#9aa8ff";
  }
}

function getTypeLabel(type = ""): string {
  switch (type) {
    case "query": return "Query";
    case "record": return "Record";
    case "keyword": return "Keyword";
    case "tag": return "Tag";
    case "source_position": return "Source position";
    case "absence": return "Absence";
    case "counter_search": return "Counter-search";
    case "cluster": return "Cluster";
    default: return "Point";
  }
}

type PositionedNode = BeyondDataMapNode & {
  cx: number;
  cy: number;
  currentAngle: number;
};

type TooltipState = {
  visible: boolean;
  x: number;
  y: number;
  node: PositionedNode | null;
};

// ─── Tooltip Component ────────────────────────────────────────────────────────

function MapTooltip({ tooltip }: { tooltip: TooltipState }) {
  if (!tooltip.visible || !tooltip.node) return null;
  const node = tooltip.node;
  const color = getDotColor(node.type);

  return (
    <div
      className="bdm-radial-tooltip"
      style={{
        position: "absolute",
        left: tooltip.x + 16,
        top: tooltip.y - 48,
        pointerEvents: "none",
        zIndex: 100,
        borderLeft: `3px solid ${color}`,
        background: "rgba(10, 10, 10, 0.95)",
        padding: "8px 12px",
        borderRadius: "6px",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.7)",
      }}
    >
      <span className="bdm-radial-tooltip__type" style={{ color: "rgba(245, 245, 240, 0.5)", fontSize: "9px" }}>
        {getTypeLabel(node.type)} {node.source ? `· ${node.source}` : ""}
      </span>
      <span className="bdm-radial-tooltip__label" style={{ fontWeight: 600, fontSize: "13px", display: "block" }}>
        {node.label}
      </span>
      {node.recordIds.length > 0 && node.type !== "record" && (
        <span className="bdm-radial-tooltip__count" style={{ fontSize: "11px", color: "rgba(245, 245, 240, 0.6)" }}>
          {node.recordIds.length} connected record{node.recordIds.length !== 1 ? "s" : ""}
        </span>
      )}
      <span style={{ fontSize: "10px", color: "#d7ff3f", marginTop: "4px", display: "block", opacity: 0.85 }}>
        Click to inspect
      </span>
    </div>
  );
}

// ─── Inspector Panel ─────────────────────────────────────────────────────────

function InspectorPanel({
  node,
  onClose,
  allNodes
}: {
  node: PositionedNode;
  onClose: () => void;
  allNodes: BeyondDataMapNode[];
}) {
  const color = getDotColor(node.type);

  const triggerAction = (eventName: string, detail: any) => {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  };

  const linkedRecords = useMemo(() => {
    if (node.type === "record") return [];
    return allNodes.filter(n => n.type === "record" && node.recordIds.includes(n.id));
  }, [node, allNodes]);

  return (
    <aside 
      className="bdm-radial-inspector" 
      aria-label="Point inspector"
      style={{
        borderLeft: "1px solid rgba(245, 245, 240, 0.1)",
        background: "rgba(8, 8, 8, 0.85)",
        backdropFilter: "blur(16px)"
      }}
    >
      <button className="bdm-radial-inspector__close" onClick={onClose} aria-label="Close inspector">
        <CloseIcon size={12} />
      </button>
      
      <div className="bdm-radial-inspector__dot" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />
      <p className="bdm-radial-inspector__type" style={{ color: "rgba(245, 245, 240, 0.4)", fontWeight: 600 }}>
        {getTypeLabel(node.type)}
      </p>
      <h3 className="bdm-radial-inspector__label" style={{ fontSize: "16px", color: "#fff", fontWeight: 700 }}>
        {node.label}
      </h3>

      {node.description && (
        <p className="bdm-radial-inspector__desc" style={{ color: "rgba(245, 245, 240, 0.7)", fontSize: "12.5px" }}>
          {node.description}
        </p>
      )}

      {node.type === "record" && (
        <div style={{ fontSize: "12px", color: "rgba(245, 245, 240, 0.5)", marginTop: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
          {node.source && <div><strong>Provider / Source:</strong> {node.source}</div>}
        </div>
      )}

      {linkedRecords.length > 0 && (
        <div style={{ marginTop: "16px" }}>
          <p className="bdm-radial-inspector__meta" style={{ fontSize: "11px", color: "rgba(245,245,240,0.4)", textTransform: "uppercase" }}>
            Linked Records ({linkedRecords.length})
          </p>
          <div className="bdm-record-chip-list" style={{ display: "flex", flexDirection: "column", gap: "5px", marginTop: "6px" }}>
            {linkedRecords.slice(0, 5).map(r => (
              <button
                key={r.id}
                style={{
                  background: "rgba(245, 245, 240, 0.04)",
                  border: "1px solid rgba(245, 245, 240, 0.1)",
                  color: "#aeb5d8",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "11px",
                  textAlign: "left",
                  cursor: "pointer",
                  width: "100%",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }}
                onClick={() => triggerAction("beyond-data-flow:open-record", { recordId: r.id })}
              >
                {r.label}
              </button>
            ))}
            {linkedRecords.length > 5 && (
              <span style={{ fontSize: "10px", color: "rgba(245, 245, 240, 0.3)", paddingLeft: "4px" }}>
                + {linkedRecords.length - 5} more records
              </span>
            )}
          </div>
        </div>
      )}

      <div className="bdm-radial-inspector__actions" style={{ marginTop: "auto" }}>
        {node.type === "record" && (
          <>
            <button
              className="bdm-radial-inspector__btn"
              onClick={() => triggerAction("beyond-data-flow:open-record", { recordId: node.id })}
            >
              Read beyond the label
            </button>
            <button
              className="bdm-radial-inspector__btn bdm-radial-inspector__btn--ghost"
              onClick={() => triggerAction("beyond-data-flow:remove-record", { recordId: node.id })}
            >
              Remove from map
            </button>
          </>
        )}

        {(node.type === "keyword" || node.type === "tag") && (
          <>
            <button
              className="bdm-radial-inspector__btn"
              onClick={() => triggerAction("beyond-data-flow:search", { query: node.query || node.label })}
            >
              Search this keyword
            </button>
            <button
              className="bdm-radial-inspector__btn bdm-radial-inspector__btn--ghost"
              onClick={() => triggerAction("beyond-data-flow:hide-node", { nodeId: node.id })}
            >
              Hide point
            </button>
          </>
        )}

        {node.type === "absence" && (
          <>
            <button
              className="bdm-radial-inspector__btn"
              onClick={() => triggerAction("beyond-data-flow:search", { query: node.label })}
            >
              Search against this absence
            </button>
            <button
              className="bdm-radial-inspector__btn bdm-radial-inspector__btn--ghost"
              onClick={() => triggerAction("beyond-data-flow:hide-node", { nodeId: node.id })}
            >
              Hide point
            </button>
          </>
        )}

        {node.type === "counter_search" && (
          <>
            <button
              className="bdm-radial-inspector__btn"
              onClick={() => triggerAction("beyond-data-flow:search", { query: node.query || node.label })}
            >
              Search this query
            </button>
            <button
              className="bdm-radial-inspector__btn bdm-radial-inspector__btn--ghost"
              onClick={() => triggerAction("beyond-data-flow:hide-node", { nodeId: node.id })}
            >
              Hide point
            </button>
          </>
        )}

        {node.type === "cluster" && (
          <>
            <button
              className="bdm-radial-inspector__btn"
              onClick={() => triggerAction("beyond-data-flow:open-record", { recordId: node.recordIds[0] })}
            >
              Read this cluster
            </button>
            <button
              className="bdm-radial-inspector__btn bdm-radial-inspector__btn--ghost"
              onClick={() => triggerAction("beyond-data-flow:hide-node", { nodeId: node.id })}
            >
              Hide point
            </button>
          </>
        )}
      </div>
    </aside>
  );
}

// ─── Toolbar Component ───────────────────────────────────────────────────────

function MapToolbar({
  isPaused,
  onTogglePause,
  hiddenCount,
  onRestoreHidden,
  onClearMap,
  onNewMap,
  onExport,
  hasAnimation = true,
  isFullscreen = false,
  onFullscreen,
}: {
  isPaused: boolean;
  onTogglePause: () => void;
  hiddenCount: number;
  onRestoreHidden: () => void;
  onClearMap: () => void;
  onNewMap: () => void;
  onExport: (format: "png" | "jpeg" | "svg") => void;
  isFullscreen?: boolean;
  onFullscreen?: () => void;
  selectedNode: PositionedNode | null;
  hasAnimation?: boolean;
}) {
  return (
    <div
      className="bdm-radial-actions"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        padding: "7px 14px",
        background: "rgba(10, 10, 9, 0.55)",
        borderBottom: "1px solid rgba(245, 245, 240, 0.08)",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {hasAnimation && (
          <button
            className="bdm-radial-action-btn"
            onClick={onTogglePause}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            title={isPaused ? "Resume movement orbit" : "Pause movement orbit"}
          >
            {isPaused ? <PlayIcon size={10} /> : <PauseIcon size={10} />}
            <span>{isPaused ? "Resume motion" : "Pause motion"}</span>
          </button>
        )}

        {hiddenCount > 0 && (
          <button
            className="bdm-radial-action-btn"
            onClick={onRestoreHidden}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <EyeIcon size={10} />
            <span>Restore hidden ({hiddenCount})</span>
          </button>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <button
          className="bdm-radial-action-btn"
          onClick={onNewMap}
          style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
        >
          <PlusIcon size={10} />
          <span>New map</span>
        </button>

        <button
          className="bdm-radial-action-btn"
          onClick={onClearMap}
          style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
        >
          <TrashIcon size={10} />
          <span>Clear map</span>
        </button>

        <div style={{ display: "flex", gap: "4px", marginLeft: "4px" }}>
          <button
            className="bdm-radial-action-btn"
            onClick={() => onExport("png")}
            style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
          >
            <DownloadIcon size={10} />
            <span>PNG</span>
          </button>
          <button
            className="bdm-radial-action-btn"
            onClick={() => onExport("jpeg")}
            style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
          >
            <span>JPG</span>
          </button>
        </div>

        {onFullscreen && (
          <button
            className="bdm-radial-action-btn bdm-radial-action-btn--fullscreen"
            onClick={onFullscreen}
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            style={{ display: "inline-flex", alignItems: "center", gap: "5px", marginLeft: "6px" }}
          >
            {isFullscreen ? <FullscreenExitIcon size={11} /> : <FullscreenEnterIcon size={11} />}
            <span>{isFullscreen ? "Exit" : "Fullscreen"}</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Radial Canvas ───────────────────────────────────────────────────────────

function RadialMapCanvas({
  nodes,
  edges,
  activeId,
  hoveredNodeId,
  selectedNodeId,
  shouldAnimate,
  onNodeClick,
  onNodeHoverEnter,
  onNodeHoverLeave,
  onBackgroundClick,
}: {
  nodes: BeyondDataMapNode[];
  edges: BeyondDataMapEdge[];
  activeId: string;
  hoveredNodeId: string | null;
  selectedNodeId: string | null;
  shouldAnimate: boolean;
  onNodeClick: (node: PositionedNode) => void;
  onNodeHoverEnter: (node: PositionedNode) => void;
  onNodeHoverLeave: () => void;
  onBackgroundClick: () => void;
}) {
  // ── Pan / zoom state (viewBox manipulation) ───────────────────────────────
  const [vb, setVb] = useState({ x: 0, y: 0, w: CANVAS_W, h: CANVAS_H });
  const dragRef = useRef<{ startX: number; startY: number; vb0x: number; vb0y: number; moved: boolean } | null>(null);

  // ── Animation (time) ──────────────────────────────────────────────────────
  // `time` advances only while shouldAnimate is true.
  // A ref mirror lets the rAF callback check shouldAnimate synchronously on
  // the same frame that hover/click fires, preventing any drift.
  const [time, setTime] = useState(0);
  const previousTimeRef = useRef<number | null>(null);
  const requestRef = useRef<number | null>(null);
  const shouldAnimateRef = useRef(shouldAnimate);
  shouldAnimateRef.current = shouldAnimate;

  useEffect(() => {
    if (!shouldAnimate) {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
      previousTimeRef.current = null;
      return;
    }

    const animate = (timestamp: number) => {
      // Ref check means this frame is skipped immediately when interaction begins,
      // even before the useEffect cleanup runs.
      if (!shouldAnimateRef.current) {
        previousTimeRef.current = null;
        return;
      }
      if (previousTimeRef.current !== null) {
        const delta = timestamp - previousTimeRef.current;
        setTime((prev) => prev + delta * 0.001);
      }
      previousTimeRef.current = timestamp;
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [shouldAnimate]);

  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, node: null });

  // ── Wheel zoom ────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      // Mouse position in current viewBox user-units
      const mouseVBx = vb.x + (e.clientX - rect.left) / rect.width * vb.w;
      const mouseVBy = vb.y + (e.clientY - rect.top) / rect.height * vb.h;
      const factor = e.deltaY < 0 ? 0.82 : 1.22;
      const newW = Math.min(Math.max(vb.w * factor, 240), CANVAS_W * 2.8);
      const newH = newW * (CANVAS_H / CANVAS_W);
      // Keep point under cursor fixed in viewBox
      const newX = mouseVBx - (e.clientX - rect.left) / rect.width * newW;
      const newY = mouseVBy - (e.clientY - rect.top) / rect.height * newH;
      setVb({ x: newX, y: newY, w: newW, h: newH });
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [vb]);

  // ── Drag-to-pan (pointer events) ─────────────────────────────────────────
  const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, vb0x: vb.x, vb0y: vb.y, moved: false };
  }, [vb]);

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 4) return;
    drag.moved = true;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaleX = vb.w / rect.width;
    const scaleY = vb.h / rect.height;
    setVb(prev => ({ ...prev, x: drag.vb0x - dx * scaleX, y: drag.vb0y - dy * scaleY }));
  }, [vb]);

  const handlePointerUp = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag?.moved) {
      // Suppress the click that fires after a drag
      e.stopPropagation();
    }
  }, []);

  const handleResetZoom = useCallback(() => {
    setVb({ x: 0, y: 0, w: CANVAS_W, h: CANVAS_H });
  }, []);

  // Tooltip position: convert SVG user-units to DOM pixels, accounting for viewBox
  const svgTooltipPos = useCallback((cx: number, cy: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: cx, y: cy };
    const scaleX = rect.width / vb.w;
    const scaleY = rect.height / vb.h;
    return { x: (cx - vb.x) * scaleX, y: (cy - vb.y) * scaleY };
  }, [vb]);

  const focusId = hoveredNodeId || selectedNodeId || activeId;

  const connectedNodeIds = useMemo(() => {
    const ids = new Set<string>();
    if (!focusId) return ids;
    edges.forEach((edge) => {
      if (edge.from === focusId) ids.add(edge.to);
      if (edge.to === focusId) ids.add(edge.from);
    });
    return ids;
  }, [edges, focusId]);

  // Deduplicate by ID defensively — the data pipeline should prevent this, but
  // slugify collisions (e.g. "Griot" vs "griot") can still slip through.
  const uniqueNodes = useMemo(() => {
    const seen = new Set<string>();
    return nodes.filter(n => n?.id && !seen.has(n.id) && seen.add(n.id));
  }, [nodes]);

  // Layout is derived from nodes + time only. No selectedNode in deps.
  const positionedNodes = useMemo<PositionedNode[]>(() => {
    return uniqueNodes.map((node) => {
      if (node.ring === 0) {
        return { ...node, cx: ORBIT_CX, cy: ORBIT_CY, currentAngle: 0 };
      }
      const ringRadius = RING_RADII[node.ring] ?? 177;
      const speed = RING_SPEEDS[node.ring] ?? 0;
      // When shouldAnimate is false, time is frozen, so currentAngle is stable.
      const currentAngle = node.baseAngle + speed * time;
      return {
        ...node,
        cx: ORBIT_CX + Math.cos(currentAngle) * ringRadius,
        cy: ORBIT_CY + Math.sin(currentAngle) * ringRadius,
        currentAngle,
      };
    });
  }, [nodes, time]);

  const posMap = useMemo(() => {
    const map = new Map<string, PositionedNode>();
    positionedNodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [positionedNodes]);

  const cxCenter = ORBIT_CX;
  const cyCenter = ORBIT_CY;
  const isZoomed = vb.w !== CANVAS_W || vb.x !== 0 || vb.y !== 0;

  const queryNode = nodes.find(n => n.type === "query") || { label: "Decolonial Canon", recordIds: [] };
  const mappedRecordCount = nodes.filter(n => n.type === "record").length;

  return (
    <div className="bdm-radial-wrap" style={{ position: "relative", width: "100%", height: "100%" }}>

      {/* Zoom controls overlay */}
      {isZoomed && (
        <button
          onClick={handleResetZoom}
          title="Reset zoom"
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            zIndex: 20,
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "4px 10px",
            fontSize: "11px",
            background: "rgba(215,255,63,0.12)",
            border: "1px solid rgba(215,255,63,0.38)",
            borderRadius: "20px",
            color: "#d7ff3f",
            cursor: "pointer",
            pointerEvents: "auto",
          }}
        >
          <ResetZoomIcon size={10} />
          Reset zoom
        </button>
      )}

      {/* Centre label — position tracks orbit centre through viewBox transform */}
      <div
        className="bdm-radial-centre"
        style={{
          position: "absolute",
          left: `${((ORBIT_CX - vb.x) / vb.w) * 100}%`,
          top: `${((ORBIT_CY - vb.y) / vb.h) * 100}%`,
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "148px",
          height: "148px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(215, 255, 63, 0.065) 0%, rgba(5, 5, 5, 0.4) 75%)",
          border: "1px solid rgba(215, 255, 63, 0.15)",
          boxShadow: "0 0 32px rgba(215, 255, 63, 0.05)",
          textAlign: "center",
          padding: "12px",
          color: "#fff",
        }}
      >
        <span style={{ fontSize: "24px", fontWeight: 800, color: "#d7ff3f", textShadow: "0 0 10px rgba(215,255,63,0.3)", lineHeight: 1 }}>
          {mappedRecordCount}
        </span>
        <span style={{ fontSize: "10px", color: "rgba(245,245,240,0.5)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "2px" }}>
          records mapped
        </span>
        <span style={{ fontSize: "11px", fontWeight: 560, color: "#f5f5f0", marginTop: "6px", maxHeight: "36px", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", lineHeight: 1.2 }}>
          {queryNode.label}
        </span>
      </div>

      <svg
        ref={svgRef}
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        className="bdm-radial-svg"
        style={{ width: "100%", height: "100%", display: "block", cursor: dragRef.current?.moved ? "grabbing" : "default", touchAction: "none" }}
        aria-label="Beyond the Data Map — relational radial map"
        role="img"
        onClick={onBackgroundClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Ring guides — visible structural scaffold, not background decoration */}
        {RING_RADII.filter((r) => r > 0).map((r, i) => {
          const ringIndex = i + 1; // 1-based ring number
          const isInner = ringIndex === 1;
          return (
            <g key={`ring-${ringIndex}`}>
              <circle
                cx={cxCenter}
                cy={cyCenter}
                r={r}
                fill="none"
                stroke={isInner ? "rgba(245,245,240,0.60)" : "rgba(245,245,240,0.38)"}
                strokeWidth={isInner ? "4.5" : "3"}
                strokeDasharray={isInner ? "none" : "6 10"}
              />
              {/* Ring label at top of each ring */}
              {RING_LABELS[ringIndex] && (
                <text
                  x={cxCenter}
                  y={cyCenter - r - 8}
                  textAnchor="middle"
                  fill="rgba(245,245,240,0.45)"
                  fontSize="10"
                  fontFamily="inherit"
                  letterSpacing="0.10em"
                  fontWeight="600"
                  style={{ userSelect: "none", pointerEvents: "none", textTransform: "uppercase" }}
                >
                  {RING_LABELS[ringIndex].toUpperCase()}
                </text>
              )}
            </g>
          );
        })}

        {/* Edges */}
        {edges.map((edge) => {
          const src = posMap.get(edge.from);
          const tgt = posMap.get(edge.to);
          if (!src || !tgt) return null;

          const isHighlighted = focusId && (edge.from === focusId || edge.to === focusId);
          const isKeyword = src.type === "keyword" || src.type === "tag" || tgt.type === "keyword" || tgt.type === "tag";

          // Only render keyword edges when they're highlighted; other edges always render
          if (!isHighlighted && isKeyword) return null;

          const strokeColor = isHighlighted
            ? getDotColor(tgt.type !== "record" ? tgt.type : src.type)
            : "rgba(245,245,240,0.11)";

          return (
            <line
              key={edge.id}
              x1={src.cx} y1={src.cy}
              x2={tgt.cx} y2={tgt.cy}
              stroke={strokeColor}
              strokeWidth={isHighlighted ? 1.8 : 0.8}
              opacity={isHighlighted ? 0.9 : 0.45}
              style={{ transition: "stroke 0.2s, opacity 0.2s" }}
            />
          );
        })}

        {/* Dots */}
        {positionedNodes.map((node) => {
          if (node.ring === 0) return null;

          const isSelected = node.id === selectedNodeId;
          const isActive = node.id === activeId;
          const isHovered = node.id === hoveredNodeId;
          const isConnected = connectedNodeIds.has(node.id);

          const color = getDotColor(node.type);
          const r = node.size || 8;

          return (
            <g
              key={node.id}
              className="bdm-radial-dot-group"
              role="button"
              aria-label={`${getTypeLabel(node.type)}: ${node.label}`}
              tabIndex={0}
              style={{ cursor: "pointer", outline: "none" }}
              onClick={(e) => { e.stopPropagation(); onNodeClick(node); }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); onNodeClick(node); }
              }}
              onMouseEnter={() => {
                const pos = svgTooltipPos(node.cx, node.cy);
                setTooltip({ visible: true, x: pos.x, y: pos.y, node });
                onNodeHoverEnter(node);
              }}
              onMouseLeave={() => {
                setTooltip((t) => ({ ...t, visible: false }));
                onNodeHoverLeave();
              }}
              onFocus={() => {
                // Only update local state on focus — do NOT dispatch custom events
                // here. Dispatching during focus/blur causes app.js to mutate the
                // DOM mid-transition, which crashes with a NotFoundError.
                setTooltip({ visible: false, x: 0, y: 0, node: null });
              }}
              onBlur={() => {
                setTooltip((t) => ({ ...t, visible: false }));
              }}
            >
              {/* Outer halo — shown for selected, active, hovered, connected */}
              {(isSelected || isActive || isHovered || isConnected) && (
                <circle
                  cx={node.cx} cy={node.cy}
                  r={r + 5}
                  fill="none"
                  stroke={isSelected || isActive ? "#d7ff3f" : color}
                  strokeWidth={isSelected || isActive ? "1.5" : "1"}
                  opacity={isSelected ? 0.95 : isActive ? 0.85 : isHovered ? 0.7 : 0.35}
                />
              )}
              {/* Second ring for selected/active only */}
              {(isSelected || isActive) && (
                <circle
                  cx={node.cx} cy={node.cy}
                  r={r + 11}
                  fill="none"
                  stroke="rgba(215,255,63,0.2)"
                  strokeWidth="0.75"
                />
              )}
              {/* Main dot */}
              <circle
                cx={node.cx} cy={node.cy}
                r={isSelected || isHovered ? r + 1 : r}
                fill={color}
                opacity={isSelected || isActive || isHovered ? 1.0 : isConnected ? 0.92 : 0.74}
                style={{
                  transition: "r 0.1s, opacity 0.15s",
                  filter: (isSelected || isActive || isHovered)
                    ? `drop-shadow(0 0 7px ${color})`
                    : isConnected
                    ? `drop-shadow(0 0 3px ${color})`
                    : "none",
                }}
              />
            </g>
          );
        })}
      </svg>

      <MapTooltip tooltip={tooltip} />
    </div>
  );
}

// ─── Map Legend ──────────────────────────────────────────────────────────────

function MapLegend() {
  const legendItems = [
    { type: "record", label: "Record" },
    { type: "keyword", label: "Keyword" },
    { type: "tag", label: "Tag" },
    { type: "source_position", label: "Source position" },
    { type: "absence", label: "Absence" },
    { type: "counter_search", label: "Counter-search" }
  ];

  return (
    <div
      className="bdm-radial-legend"
      aria-label="Map legend"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "20px",
        flexWrap: "wrap",
        width: "100%",
        padding: "7px 16px",
        background: "rgba(10, 10, 9, 0.55)",
        borderTop: "1px solid rgba(245, 245, 240, 0.08)",
        flexShrink: 0,
      }}
    >
      {legendItems.map((item) => (
        <span key={item.type} className="bdm-radial-legend-item" style={{ gap: "8px", fontSize: "11.5px" }}>
          <span
            className="bdm-radial-legend-dot"
            style={{ 
              background: getDotColor(item.type),
              width: "8px",
              height: "8px",
              boxShadow: `0 0 5px ${getDotColor(item.type)}`
            }}
            aria-hidden="true"
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

// ─── Network Map Canvas ───────────────────────────────────────────────────────

function NetworkMapCanvas({
  nodes,
  edges,
  activeId,
  hoveredNodeId,
  selectedNodeId,
  onNodeClick,
  onNodeHoverEnter,
  onNodeHoverLeave,
  onBackgroundClick,
}: {
  nodes: BeyondDataMapNode[];
  edges: BeyondDataMapEdge[];
  activeId: string;
  hoveredNodeId: string | null;
  selectedNodeId: string | null;
  onNodeClick: (node: PositionedNode) => void;
  onNodeHoverEnter: (node: PositionedNode) => void;
  onNodeHoverLeave: () => void;
  onBackgroundClick: () => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, node: null });
  const [vb, setVb] = useState({ x: 0, y: 0, w: CANVAS_W, h: CANVAS_H });
  const dragRef = useRef<{ startX: number; startY: number; vb0x: number; vb0y: number; moved: boolean } | null>(null);

  const uniqueNodes = useMemo(() => {
    const seen = new Set<string>();
    return nodes.filter(n => n?.id && !seen.has(n.id) && seen.add(n.id));
  }, [nodes]);

  const positionedNodes = useMemo(() => layoutNetworkNodes(uniqueNodes), [uniqueNodes]);
  const posMap = useMemo(
    () => new Map(positionedNodes.map(n => [n.id, n])),
    [positionedNodes]
  );

  const focusId = selectedNodeId ?? hoveredNodeId ?? activeId;

  const connectedIds = useMemo(() => {
    if (!focusId) return null;
    const ids = new Set<string>([focusId]);
    for (const e of edges) {
      if (e.from === focusId) ids.add(e.to);
      else if (e.to === focusId) ids.add(e.from);
    }
    return ids;
  }, [focusId, edges]);

  // Wheel zoom
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mouseVBx = vb.x + (e.clientX - rect.left) / rect.width * vb.w;
      const mouseVBy = vb.y + (e.clientY - rect.top) / rect.height * vb.h;
      const factor = e.deltaY < 0 ? 0.82 : 1.22;
      const newW = Math.min(Math.max(vb.w * factor, 240), CANVAS_W * 2.8);
      const newH = newW * (CANVAS_H / CANVAS_W);
      const newX = mouseVBx - (e.clientX - rect.left) / rect.width * newW;
      const newY = mouseVBy - (e.clientY - rect.top) / rect.height * newH;
      setVb({ x: newX, y: newY, w: newW, h: newH });
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [vb]);

  const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, vb0x: vb.x, vb0y: vb.y, moved: false };
  }, [vb]);

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 4) return;
    drag.moved = true;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    setVb(prev => ({
      ...prev,
      x: drag.vb0x - dx * (vb.w / rect.width),
      y: drag.vb0y - dy * (vb.h / rect.height),
    }));
  }, [vb]);

  const handlePointerUp = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    dragRef.current = null;
  }, []);

  const svgTooltipPos = useCallback((cx: number, cy: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: cx, y: cy };
    return {
      x: (cx - vb.x) / vb.w * rect.width,
      y: (cy - vb.y) / vb.h * rect.height,
    };
  }, [vb]);

  const isZoomed = vb.w !== CANVAS_W || vb.x !== 0 || vb.y !== 0;

  const handleMouseEnter = (node: PositionedNode) => {
    onNodeHoverEnter(node);
    const pos = svgTooltipPos(node.cx, node.cy);
    setTooltip({ visible: true, x: pos.x, y: pos.y, node });
  };

  return (
    <div
      className="bdm-radial-wrap"
      style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}
    >
      {isZoomed && (
        <button
          onClick={() => setVb({ x: 0, y: 0, w: CANVAS_W, h: CANVAS_H })}
          title="Reset zoom"
          style={{
            position: "absolute", top: 10, left: 10, zIndex: 20,
            display: "inline-flex", alignItems: "center", gap: "5px",
            padding: "4px 10px", fontSize: "11px",
            background: "rgba(215,255,63,0.12)",
            border: "1px solid rgba(215,255,63,0.38)",
            borderRadius: "20px", color: "#d7ff3f", cursor: "pointer",
          }}
        >
          <ResetZoomIcon size={10} />
          Reset zoom
        </button>
      )}
      <svg
        ref={svgRef}
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        className="bdm-network-svg"
        style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }}
        aria-label="Beyond the Data — network diagram"
        role="img"
        onClick={onBackgroundClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Zone background panels */}
        {Object.entries(NETWORK_ZONES).map(([zk, zone]) => (
          <g key={zk}>
            <rect
              x={zone.x0} y={zone.y0}
              width={zone.x1 - zone.x0}
              height={zone.y1 - zone.y0}
              rx="12" ry="12"
              fill={zone.color}
              stroke="rgba(245,245,240,0.055)"
              strokeWidth="1"
            />
            <text
              x={(zone.x0 + zone.x1) / 2}
              y={zone.y0 + 18}
              textAnchor="middle"
              fill="rgba(245,245,240,0.22)"
              fontSize="8.5"
              letterSpacing="0.12em"
              fontWeight="700"
              style={{ userSelect: "none", pointerEvents: "none" }}
            >
              {zone.label.toUpperCase()}
            </text>
          </g>
        ))}

        {/* Records oval */}
        <ellipse
          cx={CANVAS_W / 2} cy={CANVAS_H / 2}
          rx="178" ry="136"
          fill="rgba(47,107,255,0.04)"
          stroke="rgba(47,107,255,0.10)"
          strokeWidth="1"
          strokeDasharray="5 8"
        />
        <text
          x={CANVAS_W / 2} y={CANVAS_H / 2 - 144}
          textAnchor="middle"
          fill="rgba(47,107,255,0.30)"
          fontSize="8.5"
          letterSpacing="0.12em"
          fontWeight="700"
          style={{ userSelect: "none", pointerEvents: "none" }}
        >
          RECORDS
        </text>

        {/* Edges */}
        {edges.map(edge => {
          const src = posMap.get(edge.from);
          const tgt = posMap.get(edge.to);
          if (!src || !tgt) return null;
          const isHighlighted = !!(focusId && (edge.from === focusId || edge.to === focusId));
          const mx = (src.cx + tgt.cx) / 2;
          const my = (src.cy + tgt.cy) / 2;
          const qx = mx + (CANVAS_W / 2 - mx) * 0.25;
          const qy = my + (CANVAS_H / 2 - my) * 0.25;
          const colorType = src.type !== "record" ? src.type : tgt.type;
          const strokeColor = isHighlighted
            ? getDotColor(colorType)
            : "rgba(245,245,240,0.07)";
          return (
            <path
              key={edge.id}
              d={`M ${src.cx} ${src.cy} Q ${qx} ${qy} ${tgt.cx} ${tgt.cy}`}
              fill="none"
              stroke={strokeColor}
              strokeWidth={isHighlighted ? "1.5" : "0.85"}
              opacity={isHighlighted ? 0.75 : 1}
            />
          );
        })}

        {/* Nodes */}
        {positionedNodes.map(node => {
          const isQuery = node.type === "query";
          const isSelected = node.id === selectedNodeId;
          const isHovered = node.id === hoveredNodeId;
          const isFocused = isSelected || isHovered;
          const isConnected = !connectedIds || connectedIds.has(node.id);
          const color = getDotColor(node.type);
          const baseR = isQuery
            ? 14
            : node.type === "record"
              ? Math.max(5, Math.min(10, 3 + node.size * 1.1))
              : 5.5;
          const displayR = isFocused ? baseR + 1.5 : baseR;

          return (
            <g
              key={node.id}
              role="button"
              tabIndex={0}
              aria-label={`${getTypeLabel(node.type)}: ${node.label}`}
              aria-pressed={isSelected}
              className="bdm-radial-dot-group"
              onClick={e => { e.stopPropagation(); onNodeClick(node); }}
              onMouseEnter={() => handleMouseEnter(node)}
              onMouseLeave={() => {
                onNodeHoverLeave();
                setTooltip(t => ({ ...t, visible: false }));
              }}
              style={{ cursor: "pointer" }}
            >
              {/* Selection ring */}
              {(isSelected || (isQuery && !selectedNodeId)) && (
                <circle
                  cx={node.cx} cy={node.cy}
                  r={baseR + 6}
                  fill="none"
                  stroke={color}
                  strokeWidth="1.5"
                  opacity={0.38}
                />
              )}
              {/* Glow halo */}
              {isFocused && (
                <circle
                  cx={node.cx} cy={node.cy}
                  r={baseR + 3}
                  fill={color}
                  opacity={0.14}
                />
              )}
              {/* Dot */}
              <circle
                cx={node.cx} cy={node.cy}
                r={displayR}
                fill={color}
                opacity={isConnected ? 0.9 : 0.18}
                style={{
                  filter: isFocused
                    ? `drop-shadow(0 0 7px ${color})`
                    : isQuery
                      ? `drop-shadow(0 0 5px ${color}88)`
                      : "none",
                  transition: "opacity 0.15s",
                }}
              />
              {/* Query label */}
              {isQuery && (
                <text
                  x={node.cx} y={node.cy + baseR + 14}
                  textAnchor="middle"
                  fill={color}
                  fontSize="9"
                  fontWeight="700"
                  letterSpacing="0.08em"
                  style={{ userSelect: "none", pointerEvents: "none" }}
                >
                  {(node.label ?? "").slice(0, 18).toUpperCase()}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <MapTooltip tooltip={tooltip} />
    </div>
  );
}

// ─── Main Map View ───────────────────────────────────────────────────────────

function RadialMapView({ mapDetail }: { mapDetail: BeyondDataMapDetail }) {
  // ── Motion state ──────────────────────────────────────────────────────────
  // isMotionPaused: user has explicitly paused, or a click froze the map.
  // isUserInteracting: true while a node is hovered/focused — freezes motion
  //   independently so hover always snaps the map without touching isPaused.
  // shouldAnimate: single derived truth fed to RadialMapCanvas.
  const [isMotionPaused, setIsMotionPaused] = useState(false);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const [selectedNode, setSelectedNode] = useState<PositionedNode | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const media = window.matchMedia("(prefers-reduced-motion: reduce)");
      setPrefersReducedMotion(media.matches);
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    }
  }, []);

  // Fullscreen sync
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const handleFullscreen = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {
        // Fallback: toggle CSS-based fullscreen class
        el.classList.toggle("bdm-radial-root--fs");
        setIsFullscreen(el.classList.contains("bdm-radial-root--fs"));
      });
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  // Motion halts the instant any interaction state is true.
  const shouldAnimate = !prefersReducedMotion && !isMotionPaused && !isUserInteracting;

  const { nodes: rawNodes, edges } = mapDetail.visualMap;
  const activeNodeId = mapDetail.activeNodeId;

  const nodesMap = useMemo(() => {
    const map = new Map<string, BeyondDataMapNode>();
    rawNodes.forEach(n => map.set(n.id, n));
    return map;
  }, [rawNodes]);

  // Sync external activeNodeId (from app.js) → selectedNode
  useEffect(() => {
    if (activeNodeId && activeNodeId !== "query") {
      const node = nodesMap.get(activeNodeId);
      if (node) {
        setSelectedNode({ ...node, cx: 0, cy: 0, currentAngle: 0 });
        setIsUserInteracting(true);
        setIsMotionPaused(true);
      } else {
        setSelectedNode(null);
      }
    } else {
      setSelectedNode(null);
    }
  }, [activeNodeId, nodesMap]);

  // ── Node interaction handlers ─────────────────────────────────────────────

  const handleNodeClick = useCallback((node: PositionedNode) => {
    const isDeselecting = selectedNode?.id === node.id;
    if (isDeselecting) {
      setSelectedNode(null);
      // Hover may still be active; if not, clear interaction lock.
      // Keep isMotionPaused: user must press Resume to start motion again.
      if (!hoveredNodeId) setIsUserInteracting(false);
    } else {
      setSelectedNode(node);
      setIsUserInteracting(true);
      setIsMotionPaused(true);
    }
    window.dispatchEvent(
      new CustomEvent("beyond-data-flow:node-click", {
        detail: { nodeId: isDeselecting ? null : node.id },
      })
    );
  }, [selectedNode, hoveredNodeId]);

  const handleNodeHoverEnter = useCallback((node: PositionedNode) => {
    setHoveredNodeId(node.id);
    setIsUserInteracting(true);
    window.dispatchEvent(
      new CustomEvent("beyond-data-flow:hover-change", { detail: { hoveredNodeId: node.id } })
    );
  }, []);

  const handleNodeHoverLeave = useCallback(() => {
    setHoveredNodeId(null);
    // Only release the interaction lock if nothing is selected either.
    if (!selectedNode) setIsUserInteracting(false);
    window.dispatchEvent(
      new CustomEvent("beyond-data-flow:hover-change", { detail: { hoveredNodeId: "" } })
    );
  }, [selectedNode]);

  const handleBackgroundClick = useCallback(() => {
    if (!selectedNode) return;
    setSelectedNode(null);
    if (!hoveredNodeId) setIsUserInteracting(false);
    window.dispatchEvent(
      new CustomEvent("beyond-data-flow:node-click", { detail: { nodeId: null } })
    );
  }, [selectedNode, hoveredNodeId]);

  // Resume motion clears ALL locks so the map starts moving again.
  const handleTogglePause = useCallback(() => {
    const nextPaused = !isMotionPaused;
    setIsMotionPaused(nextPaused);
    if (!nextPaused) {
      setIsUserInteracting(false);
      setSelectedNode(null);
      setHoveredNodeId(null);
    }
  }, [isMotionPaused]);

  const handleRestoreHidden = () => window.dispatchEvent(new CustomEvent("beyond-data-flow:restore-hidden"));
  const handleClearMap = () => window.dispatchEvent(new CustomEvent("beyond-data-flow:clear-map"));
  const handleNewMap = () => window.dispatchEvent(new CustomEvent("beyond-data-flow:new-map"));

  const triggerExport = (format: "png" | "jpeg" | "svg") => {
    const prevInteracting = isUserInteracting;
    setIsUserInteracting(true); // freeze for snapshot
    setTimeout(() => {
      const flowExport = window.beyondDataMapFlow || {};
      const restore = () => setIsUserInteracting(prevInteracting);
      if (format === "png" && flowExport.exportAsPng) {
        flowExport.exportAsPng("beyond-data-map.png").finally(restore);
      } else if (format === "jpeg" && flowExport.exportAsJpeg) {
        flowExport.exportAsJpeg("beyond-data-map.jpg").finally(restore);
      } else {
        restore();
      }
    }, 150);
  };

  const visibleNodes = rawNodes;
  const nodeCount = visibleNodes.length;

  let hiddenCount = 0;
  if (typeof window !== "undefined" && (window as any).beyondDataMapState) {
    const state = (window as any).beyondDataMapState;
    hiddenCount = (state.removedNodeIds || []).length + (state.removedRecordIds || []).length;
  }

  // Toolbar shows "Paused" whenever the map is frozen for any reason.
  const isEffectivelyPaused = isMotionPaused || isUserInteracting;
  const isNetwork = mapDetail.viewMode === "network";

  return (
    <div ref={rootRef} className="bdm-radial-root" style={{ width: "100%", height: "100%" }}>
      <MapToolbar
        isPaused={isEffectivelyPaused}
        onTogglePause={handleTogglePause}
        hiddenCount={hiddenCount}
        onRestoreHidden={handleRestoreHidden}
        onClearMap={handleClearMap}
        onNewMap={handleNewMap}
        onExport={triggerExport}
        selectedNode={selectedNode}
        hasAnimation={!isNetwork}
        isFullscreen={isFullscreen}
        onFullscreen={handleFullscreen}
      />

      <div className="bdm-radial-layout" style={{ position: "relative" }}>
        <div className="bdm-radial-canvas-wrap">
          {nodeCount <= 1 ? (
            <div className="bdm-radial-empty">
              No visible records. Choose and add records in the library to construct the map.
            </div>
          ) : isNetwork ? (
            <NetworkMapCanvas
              nodes={visibleNodes}
              edges={edges}
              activeId={activeNodeId}
              hoveredNodeId={hoveredNodeId}
              selectedNodeId={selectedNode?.id ?? null}
              onNodeClick={handleNodeClick}
              onNodeHoverEnter={handleNodeHoverEnter}
              onNodeHoverLeave={handleNodeHoverLeave}
              onBackgroundClick={handleBackgroundClick}
            />
          ) : (
            <RadialMapCanvas
              nodes={visibleNodes}
              edges={edges}
              activeId={activeNodeId}
              hoveredNodeId={hoveredNodeId}
              selectedNodeId={selectedNode?.id ?? null}
              shouldAnimate={shouldAnimate}
              onNodeClick={handleNodeClick}
              onNodeHoverEnter={handleNodeHoverEnter}
              onNodeHoverLeave={handleNodeHoverLeave}
              onBackgroundClick={handleBackgroundClick}
            />
          )}
        </div>

        {selectedNode && (
          <InspectorPanel
            node={selectedNode}
            onClose={() => {
              setSelectedNode(null);
              if (!hoveredNodeId) setIsUserInteracting(false);
            }}
            allNodes={rawNodes}
          />
        )}
      </div>

      <MapLegend />
    </div>
  );
}

// ─── Entry Point component ───────────────────────────────────────────────────

export default function BeyondDataMapFlow() {
  const [mapDetail, setMapDetail] = useState<BeyondDataMapDetail | null>(
    () => (typeof window !== "undefined" ? window.__beyondDataFlowLastRender ?? null : null)
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);

  const mountMap = useCallback(() => {
    const host = document.getElementById(HOST_ID);
    if (!host) return window.setTimeout(mountMap, 50);
    // Hide the static loading placeholder so it doesn't stack above the portal
    const loading = host.querySelector<HTMLElement>(".bdm-flow-loading");
    if (loading) loading.style.display = "none";
    let inner = host.querySelector<HTMLDivElement>(".bdm-react-root");
    if (!inner) {
      inner = document.createElement("div");
      inner.className = "bdm-react-root";
      host.appendChild(inner);
    }
    setPortalHost(inner);
  }, []);

  const unmountMap = useCallback(() => {
    // Restore the loading placeholder for the next mount cycle
    const host = document.getElementById(HOST_ID);
    if (host) {
      const loading = host.querySelector<HTMLElement>(".bdm-flow-loading");
      if (loading) loading.style.display = "";
    }
    setPortalHost(null);
  }, []);

  useEffect(() => {
    const handleRender = (event: Event) => {
      const custom = event as CustomEvent<BeyondDataMapDetail>;
      const detail = custom.detail;
      if (detail && detail.visualMap) setMapDetail(detail);
    };
    const handleUnmount = () => setMapDetail(null);
    window.addEventListener("beyond-data-flow:render", handleRender);
    window.addEventListener("beyond-data-flow:unmount", handleUnmount);
    return () => {
      window.removeEventListener("beyond-data-flow:render", handleRender);
      window.removeEventListener("beyond-data-flow:unmount", handleUnmount);
    };
  }, []);

  useEffect(() => {
    if (mapDetail) return;
    let mounted = true;
    const check = () => {
      if (!mounted) return;
      try {
        const payload = (window as any).__beyondDataFlowLastRender;
        const hostExists = !!document.getElementById(HOST_ID);
        if (payload && hostExists) setMapDetail(payload);
      } catch {
        // swallow
      }
    };
    check();
    const interval = window.setInterval(check, 100);
    const stopper = window.setTimeout(() => {
      mounted = false;
      window.clearInterval(interval);
    }, 2000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
      window.clearTimeout(stopper);
    };
  }, [mapDetail]);

  useEffect(() => {
    if (portalHost && !portalHost.isConnected) {
      setPortalHost(null);
    }
  }, [portalHost]);

  useEffect(() => {
    if (!mapDetail) { unmountMap(); return; }
    if (!portalHost || !portalHost.isConnected) mountMap();
  }, [mapDetail, mountMap, unmountMap, portalHost]);

  useEffect(() => {
    window.beyondDataMapFlow = {
      exportAsPng: async (filename: string) => {
        const host = document.getElementById(HOST_ID);
        if (!host) return;
        const { toPng } = await import("html-to-image");
        try {
          const dataUrl = await toPng(host, { cacheBust: true, backgroundColor: "#050505" });
          const link = document.createElement("a");
          link.href = dataUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } catch (error) {
          console.warn("BeyondDataMapFlow PNG export error", error);
        }
      },
      exportAsJpeg: async (filename: string) => {
        const host = document.getElementById(HOST_ID);
        if (!host) return;
        const { toJpeg } = await import("html-to-image");
        try {
          const dataUrl = await toJpeg(host, { quality: 0.95, backgroundColor: "#050505" });
          const link = document.createElement("a");
          link.href = dataUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } catch (error) {
          console.warn("BeyondDataMapFlow JPEG export error", error);
        }
      }
    };
    return () => {
      delete window.beyondDataMapFlow;
    };
  }, []);

  return (
    <>
      {portalHost && mapDetail
        ? createPortal(
            <RadialMapView key={mapDetail.mapVersion ?? 0} mapDetail={mapDetail} />,
            portalHost,
          )
        : null}
      <div ref={containerRef} style={{ display: "none" }} />
    </>
  );
}
