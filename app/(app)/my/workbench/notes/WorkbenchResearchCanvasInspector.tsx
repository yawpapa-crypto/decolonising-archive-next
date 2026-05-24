"use client";

import type { CSSProperties } from "react";
import {
  ChevronLeft,
  LayoutTemplate,
  PanelRightClose,
  Sparkles,
  Wand2,
} from "lucide-react";
import type { CanvasObject } from "./workbench-canvas-types";
import { CANVAS_TYPE_LABELS } from "./workbench-canvas-type-labels";
import { CANVAS_FILL_SWATCHES, STICKY_SWATCHES } from "./workbench-canvas-palette";
import { CANVAS_TEMPLATES, type CanvasTemplateId } from "./workbench-canvas-templates";
import { isLineLikeObject } from "./workbench-canvas-geometry";
import type { CanvasPanelTab } from "./workbench-canvas-panel-types";
import { WorkbenchCanvasSendToDocumentButton } from "./WorkbenchCanvasSendToDocumentButton";

function normalizeHexColor(raw: string, fallback = "#ffffff"): string {
  const trimmed = raw.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const [, r, g, b] = trimmed;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return fallback;
}

function CanvasColorControl({
  id,
  label,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (hex: string) => void;
}) {
  const hex = value.startsWith("#") ? normalizeHexColor(value) : "#ffffff";

  return (
    <div className="workbench-research-canvas-field workbench-canvas-field">
      <label className="workbench-research-canvas-field-label workbench-canvas-label" htmlFor={id}>
        {label}
      </label>
      <div className="workbench-canvas-color-control">
        <label
          className="workbench-canvas-color-control__swatch-btn"
          htmlFor={id}
          aria-label={`${label} colour`}
        >
          <span
            className="workbench-canvas-color-control__swatch"
            style={{ "--swatch-color": hex } as CSSProperties}
            aria-hidden
          />
        </label>
        <input
          type="text"
          className="workbench-canvas-input workbench-canvas-color-control__hex"
          value={hex}
          disabled={disabled}
          spellCheck={false}
          aria-label={`${label} hex value`}
          onChange={(e) => {
            const next = normalizeHexColor(e.target.value, hex);
            if (next !== hex || e.target.value.trim().startsWith("#")) {
              onChange(next);
            }
          }}
          onBlur={(e) => onChange(normalizeHexColor(e.target.value, hex))}
        />
        <input
          id={id}
          type="color"
          className="workbench-canvas-color-control__picker"
          value={hex}
          disabled={disabled}
          tabIndex={-1}
          onChange={(e) => onChange(normalizeHexColor(e.target.value, hex))}
        />
      </div>
    </div>
  );
}

function CanvasRangeField({
  id,
  label,
  valueLabel,
  min,
  max,
  step,
  value,
  disabled,
  variant = "default",
  onChange,
}: {
  id: string;
  label: string;
  valueLabel: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  disabled?: boolean;
  variant?: "default" | "opacity";
  onChange: (value: number) => void;
}) {
  return (
    <div className="workbench-research-canvas-field workbench-canvas-field">
      <div className="workbench-canvas-field-label-row">
        <label className="workbench-research-canvas-field-label workbench-canvas-label" htmlFor={id}>
          {label}
        </label>
        <span className="workbench-canvas-value-pill">{valueLabel}</span>
      </div>
      <div
        className={`workbench-canvas-range-wrap${
          variant === "opacity" ? " is-opacity" : ""
        }`}
      >
        <input
          id={id}
          type="range"
          className="workbench-canvas-range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
    </div>
  );
}

function CanvasFieldSelect<T extends string>({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  disabled?: boolean;
  onChange: (value: T) => void;
}) {
  return (
    <div className="workbench-research-canvas-field workbench-canvas-field">
      <span className="workbench-research-canvas-field-label workbench-canvas-label">{label}</span>
      <div
        className="workbench-research-canvas-segmented workbench-canvas-segmented"
        role="group"
        aria-label={label}
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`workbench-research-canvas-segmented-btn workbench-canvas-segmented-btn${
              value === option.value ? " is-active" : ""
            }`}
            disabled={disabled}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const PANEL_TABS: { id: CanvasPanelTab; label: string }[] = [
  { id: "templates", label: "Templates" },
  { id: "inspect", label: "Inspect" },
  { id: "theme", label: "Theme" },
  { id: "smart", label: "Smart" },
];

export type WorkbenchResearchCanvasInspectorProps = {
  selected: CanvasObject | null;
  canEdit: boolean;
  mobileOpen: boolean;
  activeTab: CanvasPanelTab;
  onTabChange: (tab: CanvasPanelTab) => void;
  onCollapsePanel: () => void;
  onHidePanel: () => void;
  linkableCount: number;
  objectCount: number;
  onUpdate: (id: string, patch: Partial<CanvasObject>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onLayerForward: () => void;
  onLayerBackward: () => void;
  onLayerFront: () => void;
  onLayerBack: () => void;
  onSendToDocument: (html: string) => void;
  onOpenRecord?: (recordId: string) => void;
  onCiteRecord?: (recordId: string) => void;
  onReplaceImage?: () => void;
  onRemoveImage?: () => void;
  onApplyTemplate: (id: CanvasTemplateId) => void;
  onSmartOrganise?: () => void;
  canvasObjectToDocumentHtml: (obj: CanvasObject) => string;
};

export function WorkbenchResearchCanvasInspector({
  selected,
  canEdit,
  mobileOpen,
  activeTab,
  onTabChange,
  onCollapsePanel,
  onHidePanel,
  linkableCount,
  objectCount,
  onUpdate,
  onDuplicate,
  onDelete,
  onLayerForward,
  onLayerBackward,
  onLayerFront,
  onLayerBack,
  onSendToDocument,
  onOpenRecord,
  onCiteRecord,
  onReplaceImage,
  onRemoveImage,
  onApplyTemplate,
  onSmartOrganise,
  canvasObjectToDocumentHtml,
}: WorkbenchResearchCanvasInspectorProps) {
  const swatches = selected?.type === "sticky" ? STICKY_SWATCHES : CANVAS_FILL_SWATCHES;
  const showInspect = activeTab === "inspect" && selected;
  const showInspectEmpty = activeTab === "inspect" && !selected;

  return (
    <aside
      className={`workbench-research-canvas-inspector workbench-canvas-inspector is-expanded${
        mobileOpen ? " is-mobile-open" : ""
      }`}
      aria-label="Canvas side panel"
    >
      <div className="workbench-research-canvas-inspector-head">
        <div className="workbench-research-canvas-inspector-tabs" role="tablist">
          {PANEL_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              className={`workbench-research-canvas-inspector-tab${
                activeTab === tab.id ? " is-active" : ""
              }${tab.id === "inspect" && selected ? " has-selection" : ""}`}
              aria-selected={activeTab === tab.id}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="workbench-research-canvas-inspector-head-actions">
          <button
            type="button"
            className="workbench-research-canvas-inspector-icon-btn"
            aria-label="Collapse panel"
            onClick={onCollapsePanel}
          >
            <ChevronLeft size={16} aria-hidden />
          </button>
          <button
            type="button"
            className="workbench-research-canvas-inspector-icon-btn"
            aria-label="Hide panel"
            onClick={onHidePanel}
          >
            <PanelRightClose size={16} aria-hidden />
          </button>
        </div>
      </div>

      <div className="workbench-research-canvas-inspector-scroll workbench-canvas-panel-body">
        {activeTab === "templates" ? (
          <>
            <p className="workbench-research-canvas-inspector-lead">
              Starter boards for research planning, mapping, and visual direction.
            </p>
            <ul className="workbench-research-canvas-inspector-template-list">
              {CANVAS_TEMPLATES.map((template) => (
                <li key={template.id}>
                  <button
                    type="button"
                    className="workbench-research-canvas-inspector-template-btn workbench-research-canvas-template-item"
                    disabled={!canEdit}
                    onClick={() => onApplyTemplate(template.id)}
                  >
                    <span
                      className="workbench-research-canvas-template-item__accent"
                      style={{ background: template.accentColor }}
                      aria-hidden
                    />
                    <span className="workbench-research-canvas-template-item__body">
                      <span className="workbench-research-canvas-template-item__row">
                        <strong>{template.label}</strong>
                        <span className="workbench-research-canvas-template-item__chip">
                          {template.category}
                        </span>
                      </span>
                      <span className="workbench-research-canvas-template-item__desc">
                        {template.description}
                      </span>
                      {template.previewSwatches.length > 0 ? (
                        <span className="workbench-research-canvas-template-item__swatches" aria-hidden>
                          {template.previewSwatches.map((color) => (
                            <span
                              key={`${template.id}-${color}`}
                              className="workbench-research-canvas-template-item__swatch"
                              style={{ background: color }}
                            />
                          ))}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {activeTab === "theme" ? (
          <div className="workbench-research-canvas-inspector-section">
            <p className="workbench-research-canvas-inspector-section-label">
              <Sparkles size={14} aria-hidden />
              Archive canvas theme
            </p>
            <p className="workbench-research-canvas-inspector-hint">
              Warm paper workspace, white cards, charcoal typography, and archive lemon for active
              tools and selection.
            </p>
            <ul className="workbench-research-canvas-inspector-theme-swatches">
              <li>
                <span className="is-paper" /> Paper
              </li>
              <li>
                <span className="is-canvas" /> Canvas
              </li>
              <li>
                <span className="is-lemon" /> Lemon active
              </li>
            </ul>
          </div>
        ) : null}

        {activeTab === "smart" ? (
          <div className="workbench-research-canvas-inspector-section">
            <p className="workbench-research-canvas-inspector-lead">
              Arrange {objectCount} object{objectCount === 1 ? "" : "s"} into a readable grid
              without changing content.
            </p>
            <button
              type="button"
              className="workbench-research-canvas-btn workbench-research-canvas-btn--primary"
              disabled={!canEdit || !onSmartOrganise || objectCount < 2}
              onClick={onSmartOrganise}
            >
              <Wand2 size={14} aria-hidden />
              Smart organise
            </button>
            <p className="workbench-research-canvas-inspector-section-label">Archive materials</p>
            {linkableCount > 0 ? (
              <p className="workbench-research-canvas-inspector-hint">
                {linkableCount} linked record{linkableCount === 1 ? "" : "s"} — use Add from archive
                in the top bar or plus menu.
              </p>
            ) : (
              <p className="workbench-research-canvas-inspector-hint is-warning">
                No saved records available for this note.
              </p>
            )}
          </div>
        ) : null}

        {showInspectEmpty ? (
          <p className="workbench-research-canvas-inspector-hint">
            Select an object on the canvas to edit its properties here.
          </p>
        ) : null}

        {showInspect && selected ? (
          <>
            <div className="workbench-research-canvas-inspector-selection-card">
              <p className="workbench-research-canvas-inspector-type">
                {CANVAS_TYPE_LABELS[selected.type] ?? selected.type}
              </p>
              <p className="workbench-research-canvas-inspector-selection-hint">
                Use the ··· menu or right-click the card for duplicate, layers, and delete.
              </p>
            </div>

            <section className="workbench-research-canvas-inspector-section">
              <h3 className="workbench-research-canvas-inspector-section-title">Content</h3>
              <div className="workbench-research-canvas-field">
                <label className="workbench-research-canvas-field-label" htmlFor="wrc-inspector-title">
                  Title
                </label>
                <input
                  id="wrc-inspector-title"
                  value={selected.title}
                  disabled={!canEdit}
                  onChange={(e) => onUpdate(selected.id, { title: e.target.value })}
                />
              </div>
              <div className="workbench-research-canvas-field">
                <label className="workbench-research-canvas-field-label" htmlFor="wrc-inspector-body">
                  Body
                </label>
                <textarea
                  id="wrc-inspector-body"
                  rows={3}
                  value={selected.body}
                  disabled={!canEdit}
                  onChange={(e) => onUpdate(selected.id, { body: e.target.value })}
                />
              </div>
            </section>

            <section className="workbench-research-canvas-inspector-section">
              <h3 className="workbench-research-canvas-inspector-section-title">Appearance</h3>
              <div className="workbench-research-canvas-field workbench-canvas-field">
                <span className="workbench-research-canvas-field-label workbench-canvas-label">
                  Fill swatches
                </span>
                <div className="workbench-research-canvas-swatches workbench-canvas-swatches">
                  {swatches.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`workbench-research-canvas-swatch workbench-canvas-swatch${
                        selected.fill === color ? " is-active" : ""
                      }`}
                      style={{ background: color }}
                      aria-label={`Fill ${color}`}
                      disabled={!canEdit}
                      onClick={() => onUpdate(selected.id, { fill: color })}
                    />
                  ))}
                </div>
              </div>
              <CanvasColorControl
                id="wrc-fill"
                label="Fill"
                value={selected.fill}
                disabled={!canEdit}
                onChange={(hex) => onUpdate(selected.id, { fill: hex })}
              />
              <CanvasColorControl
                id="wrc-stroke"
                label="Stroke"
                value={
                  selected.stroke.startsWith("#")
                    ? selected.stroke
                    : "#2f2d38"
                }
                disabled={!canEdit}
                onChange={(hex) => onUpdate(selected.id, { stroke: hex })}
              />
              <CanvasRangeField
                id="wrc-stroke-width"
                label="Stroke width"
                valueLabel={`${selected.strokeWidth}px`}
                min={1}
                max={8}
                step={1}
                value={selected.strokeWidth}
                disabled={!canEdit}
                onChange={(strokeWidth) => onUpdate(selected.id, { strokeWidth })}
              />
              <CanvasRangeField
                id="wrc-opacity"
                label="Opacity"
                valueLabel={`${Math.round(selected.opacity * 100)}%`}
                min={0.2}
                max={1}
                step={0.05}
                value={selected.opacity}
                disabled={!canEdit}
                variant="opacity"
                onChange={(opacity) => onUpdate(selected.id, { opacity })}
              />
              <div className="workbench-research-canvas-field workbench-canvas-field">
                <label
                  className="workbench-research-canvas-field-label workbench-canvas-label"
                  htmlFor="wrc-text-size"
                >
                  Text size
                </label>
                <input
                  id="wrc-text-size"
                  type="number"
                  className="workbench-canvas-input"
                  min={10}
                  max={36}
                  value={selected.textSize}
                  disabled={!canEdit}
                  onChange={(e) => onUpdate(selected.id, { textSize: Number(e.target.value) })}
                />
              </div>
              <CanvasFieldSelect
                label="Align"
                value={selected.textAlign}
                disabled={!canEdit}
                options={[
                  { value: "left", label: "Left" },
                  { value: "center", label: "Centre" },
                  { value: "right", label: "Right" },
                ]}
                onChange={(value) => onUpdate(selected.id, { textAlign: value })}
              />
              {!isLineLikeObject(selected) ? (
                <>
                  <div className="workbench-research-canvas-field workbench-canvas-field">
                    <label
                      className="workbench-research-canvas-field-label workbench-canvas-label"
                      htmlFor="wrc-width"
                    >
                      Width
                    </label>
                    <input
                      id="wrc-width"
                      type="number"
                      className="workbench-canvas-input"
                      min={48}
                      max={1200}
                      value={Math.round(selected.width)}
                      disabled={!canEdit}
                      onChange={(e) => onUpdate(selected.id, { width: Number(e.target.value) })}
                    />
                  </div>
                  <div className="workbench-research-canvas-field workbench-canvas-field">
                    <label
                      className="workbench-research-canvas-field-label workbench-canvas-label"
                      htmlFor="wrc-height"
                    >
                      Height
                    </label>
                    <input
                      id="wrc-height"
                      type="number"
                      className="workbench-canvas-input"
                      min={32}
                      max={900}
                      value={Math.round(selected.height)}
                      disabled={!canEdit}
                      onChange={(e) => onUpdate(selected.id, { height: Number(e.target.value) })}
                    />
                  </div>
                  <div className="workbench-research-canvas-field workbench-canvas-field">
                    <label
                      className="workbench-research-canvas-field-label workbench-canvas-label"
                      htmlFor="wrc-radius"
                    >
                      Corner radius
                    </label>
                    <input
                      id="wrc-radius"
                      type="number"
                      className="workbench-canvas-input"
                      min={0}
                      max={48}
                      value={selected.cornerRadius}
                      disabled={!canEdit}
                      onChange={(e) =>
                        onUpdate(selected.id, { cornerRadius: Number(e.target.value) })
                      }
                    />
                  </div>
                </>
              ) : null}
            </section>

            {isLineLikeObject(selected) ? (
              <section className="workbench-research-canvas-inspector-section">
                <h3 className="workbench-research-canvas-inspector-section-title">Line</h3>
                <CanvasFieldSelect
                  label="Line style"
                  value={selected.lineStyle || "solid"}
                  disabled={!canEdit}
                  options={[
                    { value: "solid", label: "Solid" },
                    { value: "dashed", label: "Dash" },
                    { value: "dotted", label: "Dot" },
                  ]}
                  onChange={(value) => onUpdate(selected.id, { lineStyle: value })}
                />
                <div className="workbench-research-canvas-field workbench-canvas-field">
                  <label
                    className="workbench-research-canvas-field-label workbench-canvas-label"
                    htmlFor="wrc-line-label"
                  >
                    Label
                  </label>
                  <input
                    id="wrc-line-label"
                    className="workbench-canvas-input"
                    value={selected.label || ""}
                    disabled={!canEdit}
                    onChange={(e) => onUpdate(selected.id, { label: e.target.value })}
                  />
                </div>
              </section>
            ) : null}

            {selected.type === "source" && selected.linkedRecordId ? (
              <section className="workbench-research-canvas-inspector-section workbench-research-canvas-inspector-actions">
                <h3 className="workbench-research-canvas-inspector-section-title">Archive</h3>
                <button
                  type="button"
                  className="workbench-research-canvas-btn"
                  onClick={() => onOpenRecord?.(selected.linkedRecordId!)}
                >
                  Open record
                </button>
                <button
                  type="button"
                  className="workbench-research-canvas-btn"
                  onClick={() => onCiteRecord?.(selected.linkedRecordId!)}
                >
                  Cite
                </button>
              </section>
            ) : null}

            {selected.type === "image" ? (
              <section className="workbench-research-canvas-inspector-section">
                <h3 className="workbench-research-canvas-inspector-section-title">Image</h3>
                <CanvasFieldSelect
                  label="Image fit"
                  value={selected.imageFit || "cover"}
                  disabled={!canEdit}
                  options={[
                    { value: "cover", label: "Cover" },
                    { value: "contain", label: "Contain" },
                  ]}
                  onChange={(value) => onUpdate(selected.id, { imageFit: value })}
                />
                <div className="workbench-research-canvas-field workbench-canvas-field">
                  <label
                    className="workbench-research-canvas-field-label workbench-canvas-label"
                    htmlFor="wrc-alt"
                  >
                    Alt text
                  </label>
                  <input
                    id="wrc-alt"
                    className="workbench-canvas-input"
                    value={selected.imageAlt || ""}
                    disabled={!canEdit}
                    onChange={(e) => onUpdate(selected.id, { imageAlt: e.target.value })}
                  />
                </div>
                {!selected.imageAlt?.trim() ? (
                  <p className="workbench-research-canvas-inspector-hint is-warning">
                    Missing alt text for accessibility.
                  </p>
                ) : null}
                <button
                  type="button"
                  className="workbench-research-canvas-btn"
                  disabled={!canEdit}
                  onClick={onReplaceImage}
                >
                  Replace image
                </button>
                <button
                  type="button"
                  className="workbench-research-canvas-btn"
                  disabled={!canEdit}
                  onClick={onRemoveImage}
                >
                  Remove image
                </button>
              </section>
            ) : null}

            {!isLineLikeObject(selected) ? (
              <section className="workbench-research-canvas-inspector-section">
                <h3 className="workbench-research-canvas-inspector-section-title">Layers</h3>
                <div className="workbench-research-canvas-layer-row workbench-canvas-layer-actions">
                  <button
                    type="button"
                    className="workbench-research-canvas-btn"
                    disabled={!canEdit}
                    onClick={onLayerForward}
                  >
                    Forward
                  </button>
                  <button
                    type="button"
                    className="workbench-research-canvas-btn"
                    disabled={!canEdit}
                    onClick={onLayerBackward}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="workbench-research-canvas-btn"
                    disabled={!canEdit}
                    onClick={onLayerFront}
                  >
                    Front
                  </button>
                  <button
                    type="button"
                    className="workbench-research-canvas-btn"
                    disabled={!canEdit}
                    onClick={onLayerBack}
                  >
                    Rear
                  </button>
                </div>
              </section>
            ) : null}
          </>
        ) : null}
      </div>

      {showInspect && selected ? (
        <footer className="workbench-research-canvas-inspector-footer">
          <WorkbenchCanvasSendToDocumentButton
            variant="inspector"
            onSend={() => onSendToDocument(canvasObjectToDocumentHtml(selected))}
          />
          <div className="workbench-research-canvas-inspector-footer-row">
            <button
              type="button"
              className="workbench-research-canvas-btn"
              disabled={!canEdit}
              onClick={onDuplicate}
            >
              Duplicate
            </button>
            <button
              type="button"
              className="workbench-research-canvas-btn"
              disabled={!canEdit}
              onClick={() => onUpdate(selected.id, { locked: !selected.locked })}
            >
              {selected.locked ? "Unlock" : "Lock"}
            </button>
          </div>
          <button
            type="button"
            className="workbench-research-canvas-btn workbench-research-canvas-btn--danger"
            disabled={!canEdit}
            onClick={onDelete}
          >
            Delete card
          </button>
        </footer>
      ) : null}
    </aside>
  );
}
