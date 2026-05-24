"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CanvasPanelState, CanvasPanelTab } from "./workbench-canvas-panel-types";
import type { CanvasSettings } from "./workbench-canvas-state";

const SETTINGS_PERSIST_MS = 400;

export type WorkbenchCanvasChromeState = {
  focusMode: boolean;
  addMenuOpen: boolean;
  archiveMenuOpen: boolean;
  rightPanelState: CanvasPanelState;
  rightPanelTab: CanvasPanelTab;
  panelExpanded: boolean;
  panelCollapsed: boolean;
  panelHidden: boolean;
  showLargeChrome: boolean;
  setAddMenuOpen: (open: boolean) => void;
  setArchiveMenuOpen: (open: boolean) => void;
  setRightPanelTab: (tab: CanvasPanelTab) => void;
  restoreControls: () => void;
  enterFocusMode: () => void;
  openPanel: (tab?: CanvasPanelTab) => void;
  togglePanelVisibility: () => void;
  collapsePanel: () => void;
  toggleFocusMode: () => void;
  cyclePanel: () => void;
};

export type UseWorkbenchCanvasChromeOptions = {
  initialSettings?: CanvasSettings;
  onSettingsChange?: (patch: Partial<CanvasSettings>) => void;
};

export function useWorkbenchCanvasChrome(
  selectedId: string | null,
  options?: UseWorkbenchCanvasChromeOptions,
): WorkbenchCanvasChromeState {
  const { onSettingsChange } = options ?? {};
  const [focusMode, setFocusMode] = useState(false);
  const [rightPanelState, setRightPanelState] = useState<CanvasPanelState>(
    () => options?.initialSettings?.rightPanelState ?? "expanded",
  );
  const [rightPanelTab, setRightPanelTab] = useState<CanvasPanelTab>(
    () => options?.initialSettings?.rightPanelTab ?? "templates",
  );
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [archiveMenuOpen, setArchiveMenuOpen] = useState(false);
  const panelBeforeFocusRef = useRef<CanvasPanelState>("expanded");
  const onSettingsChangeRef = useRef(onSettingsChange);
  const skipSettingsPersistRef = useRef(true);
  const settingsPersistRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  onSettingsChangeRef.current = onSettingsChange;

  const showLargeChrome = !focusMode;
  const panelExpanded = showLargeChrome && rightPanelState === "expanded";
  const panelCollapsed = showLargeChrome && rightPanelState === "collapsed";
  const panelHidden = !showLargeChrome || rightPanelState === "hidden";

  useEffect(() => {
    if (!onSettingsChangeRef.current) return;
    if (skipSettingsPersistRef.current) {
      skipSettingsPersistRef.current = false;
      return;
    }
    if (settingsPersistRef.current) clearTimeout(settingsPersistRef.current);
    settingsPersistRef.current = setTimeout(() => {
      settingsPersistRef.current = null;
      onSettingsChangeRef.current?.({
        rightPanelState,
        rightPanelTab,
        controlsVisible: showLargeChrome,
      });
    }, SETTINGS_PERSIST_MS);
    return () => {
      if (settingsPersistRef.current) clearTimeout(settingsPersistRef.current);
    };
  }, [rightPanelState, rightPanelTab, showLargeChrome]);

  const restoreControls = useCallback(() => {
    setFocusMode(false);
    setAddMenuOpen(false);
    setArchiveMenuOpen(false);
    setRightPanelState((current) => {
      if (current !== "hidden") return current;
      const restore = panelBeforeFocusRef.current;
      return restore === "hidden" ? "expanded" : restore;
    });
  }, []);

  const enterFocusMode = useCallback(() => {
    panelBeforeFocusRef.current = rightPanelState;
    setFocusMode(true);
    setAddMenuOpen(false);
    setArchiveMenuOpen(false);
  }, [rightPanelState]);

  const openPanel = useCallback((tab: CanvasPanelTab = rightPanelTab) => {
    setRightPanelTab(tab);
    setRightPanelState("expanded");
    setFocusMode(false);
  }, [rightPanelTab]);

  const togglePanelVisibility = useCallback(() => {
    setRightPanelState((current) => {
      if (current === "hidden") {
        const restore = panelBeforeFocusRef.current;
        return restore === "hidden" ? "expanded" : restore;
      }
      panelBeforeFocusRef.current = current;
      return "hidden";
    });
  }, []);

  const collapsePanel = useCallback(() => {
    setRightPanelState("collapsed");
  }, []);

  const toggleFocusMode = useCallback(() => {
    if (focusMode) restoreControls();
    else enterFocusMode();
  }, [enterFocusMode, focusMode, restoreControls]);

  const cyclePanel = useCallback(() => {
    setRightPanelState((current) => {
      if (current === "expanded") return "collapsed";
      if (current === "collapsed") return "expanded";
      return panelBeforeFocusRef.current === "hidden" ? "expanded" : panelBeforeFocusRef.current;
    });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setRightPanelTab("inspect");
    setRightPanelState((current) => {
      if (current !== "hidden" || focusMode) return current;
      const restore = panelBeforeFocusRef.current;
      return restore === "hidden" ? "expanded" : restore;
    });
  }, [focusMode, selectedId]);

  return {
    focusMode,
    addMenuOpen,
    archiveMenuOpen,
    rightPanelState,
    rightPanelTab,
    panelExpanded,
    panelCollapsed,
    panelHidden,
    showLargeChrome,
    setAddMenuOpen,
    setArchiveMenuOpen,
    setRightPanelTab,
    restoreControls,
    enterFocusMode,
    openPanel,
    togglePanelVisibility,
    collapsePanel,
    toggleFocusMode,
    cyclePanel,
  };
}
