"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ArchiveGuideMode, ArchiveGuideState, ArchiveGuideStructuredContext } from "@/src/lib/archive-guide-types";
import { useArchiveGuide } from "./useArchiveGuide";
import { useArchiveGuideContext } from "./useArchiveGuideContext";

type ArchiveGuidePrompt =
  | "expand"
  | "questions"
  | "compare"
  | "missing"
  | "path"
  | "care"
  | "reflect";

type ArchiveGuideSurface = "library" | "workbench-board" | "none";

type ArchiveGuideSnapshot = {
  surface: ArchiveGuideSurface;
  isLibrary: boolean;
  isWorkbenchBoard: boolean;
  query: string;
  resultCount: number;
  hasNoResults: boolean;
  isLoading: boolean;
};

const HIDDEN_KEY = "decolonisingArchive:archiveGuideHidden";
const MUTED_KEY = "decolonisingArchive:archiveGuideMuted";
const SEARCH_SETTLE_DELAY = 950;
const RETURN_IDLE_DELAY = 7200;

const idleMessage = "Need help turning this into a better question?";
const boardIdleMessage = "Need help turning this board into a clearer research path?";
const noResultsMessage =
  "No results yet. That is still useful. Want to try a broader term, a region, a material, or a related concept?";
const culturalCareMessage =
  "Let's slow down. Who is speaking here, and who might need to be protected or acknowledged?";

const promptModes: Record<ArchiveGuidePrompt, ArchiveGuideMode> = {
  expand: "expand_search",
  questions: "ask_better_questions",
  compare: "compare_sources",
  missing: "what_am_i_missing",
  path: "build_reading_path",
  care: "cultural_care_check",
  reflect: "reflect_on_process",
};

function emptySnapshot(): ArchiveGuideSnapshot {
  return {
    surface: "none",
    isLibrary: false,
    isWorkbenchBoard: false,
    query: "",
    resultCount: 0,
    hasNoResults: false,
    isLoading: false,
  };
}

function readArchiveGuideSnapshot(): ArchiveGuideSnapshot {
  if (typeof document === "undefined") {
    return emptySnapshot();
  }

  const app = document.getElementById("app");
  const input = document.getElementById("mainSearch") as HTMLInputElement | null;
  const resultRoot = app?.querySelector(".library-results-stack");
  const resultCards = resultRoot?.querySelectorAll(
    ".record-card[data-id], .result-card[data-id], .card[data-id]",
  );
  const loader = app?.querySelector(".library-results-loader, [data-library-loader], .search-loader");

  const isLibrary = Boolean(app?.querySelector(".library-layout") && input);
  if (isLibrary) {
    return {
      surface: "library",
      isLibrary: true,
      isWorkbenchBoard: false,
      query: input?.value.trim() ?? "",
      resultCount: resultCards?.length ?? 0,
      hasNoResults: Boolean(app?.querySelector(".search-empty")),
      isLoading: Boolean(loader && !loader.classList.contains("hidden")),
    };
  }

  const board = document.querySelector(".workbench-note-board-immersive");
  const boardSearch = board?.querySelector(".workbench-note-board-floating-search input") as HTMLInputElement | null;
  if (board) {
    return {
      surface: "workbench-board",
      isLibrary: false,
      isWorkbenchBoard: true,
      query: boardSearch?.value.trim() ?? "",
      resultCount: board.querySelectorAll(".workbench-board-card-immersive, .workbench-note-board-card").length,
      hasNoResults: false,
      isLoading: false,
    };
  }

  return emptySnapshot();
}

export function useArchiveGuideState() {
  const aiGuide = useArchiveGuide();
  // Destructure stable refs so runPrompt/MutationObserver effects don't
  // re-fire every time isAsking/response/error changes on the aiGuide object.
  const { ask: aiAsk, reset: aiReset, response: guideResponse, error: guideError, isAsking: isAskingGuide } = aiGuide;
  const { buildContext } = useArchiveGuideContext();
  const [state, setState] = useState<ArchiveGuideState>("idle");
  const [message, setMessage] = useState(idleMessage);
  const [panelView, setPanelView] = useState<"bubble" | "open">("open");
  const [activeMode, setActiveMode] = useState<ArchiveGuideMode | null>(null);
  const [isHidden, setIsHidden] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [snapshot, setSnapshot] = useState<ArchiveGuideSnapshot>(() => emptySnapshot());
  const [currentContext, setCurrentContext] = useState<ArchiveGuideStructuredContext | null>(null);

  const settleTimerRef = useRef<number | null>(null);
  const idleTimerRef = useRef<number | null>(null);
  const hasSearchedRef = useRef(false);
  const hasAutoCollapsedBoardGuideRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
    if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    settleTimerRef.current = null;
    idleTimerRef.current = null;
  }, []);

  const speak = useCallback(
    (nextState: ArchiveGuideState, nextMessage: string, returnToIdle = true) => {
      if (isMuted) return;
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      setState(nextState);
      setMessage(nextMessage);
      if (returnToIdle) {
        idleTimerRef.current = window.setTimeout(() => {
          setState("idle");
          setMessage(idleMessage);
        }, RETURN_IDLE_DELAY);
      }
    },
    [isMuted],
  );

  const refreshSnapshot = useCallback(() => {
    const next = readArchiveGuideSnapshot();
    setSnapshot(next);
    return next;
  }, []);

  const completeSearchReflection = useCallback(() => {
    const next = refreshSnapshot();
    if (next.surface === "none") return;

    if (next.isWorkbenchBoard) {
      speak(
        "curious",
        next.query
          ? `This board search gives you a path to sort. What belongs together, and what needs a new frame?`
          : "Your board is a thinking space. Try one source, one question, and one next action.",
      );
      return;
    }

    if (next.hasNoResults || (hasSearchedRef.current && next.query && next.resultCount === 0)) {
      speak("encouraging", noResultsMessage, false);
      return;
    }

    if (next.query) {
      const countText = next.resultCount
        ? `${next.resultCount} result${next.resultCount === 1 ? "" : "s"}`
        : "this result set";
      speak(
        "curious",
        `This search gives us something to work with. What pattern do you notice in ${countText}?`,
      );
    } else {
      speak("idle", idleMessage, false);
    }
  }, [refreshSnapshot, speak]);

  const beginSearchReflection = useCallback(() => {
    hasSearchedRef.current = true;
    speak("thinking", "Let's think through this search together.", false);
    if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
    settleTimerRef.current = window.setTimeout(completeSearchReflection, SEARCH_SETTLE_DELAY);
  }, [completeSearchReflection, speak]);

  const runPrompt = useCallback(
    (prompt: ArchiveGuidePrompt) => {
      const current = refreshSnapshot();
      setPanelView("open");
      setActiveMode(promptModes[prompt]);
      aiReset();

      const fallback = () => {
        if (prompt === "care") {
          speak("careful", culturalCareMessage, false);
          return;
        }

        if (prompt === "expand") {
          const input = current.isWorkbenchBoard
            ? (document.querySelector(".workbench-note-board-floating-search input") as HTMLInputElement | null)
            : (document.getElementById("mainSearch") as HTMLInputElement | null);
          input?.focus();
          speak(
            "pointing",
            current.isWorkbenchBoard
              ? "Use board search to find a source, then place it beside a question or task so the pattern becomes visible."
              : current.query
                ? `You've already started a useful path with "${current.query}". Try adding a place, material, community, time period, or related concept.`
                : "Start with one term, then broaden it with a place, material, community, time period, or related concept.",
          );
          return;
        }

        if (prompt === "questions") {
          speak(
            "curious",
            current.isWorkbenchBoard
              ? "Ask what this board is trying to prove, what is only a hunch, and which source should anchor the next move."
              : "Ask who made it, who held it, what terms the archive uses, and what this record cannot tell us by itself.",
          );
          return;
        }

        if (prompt === "compare") {
          speak(
            "pointing",
            current.isWorkbenchBoard
              ? "Compare the cards by source, date, rights, place, and what each one lets you say with care."
              : "Compare source, date, creator, rights, language and context. Differences between records are often where the inquiry begins.",
          );
          return;
        }

        if (prompt === "missing") {
          speak(
            "careful",
            current.isWorkbenchBoard
              ? "Look at the blank spaces on the board: whose voice, protocol, place, or citation is still missing?"
              : "Look for absences: unnamed makers, places, languages, custodians, protocols, or records that were never collected.",
          );
          return;
        }

        if (prompt === "reflect") {
          speak(
            "encouraging",
            current.isWorkbenchBoard
              ? "Your board already shows choices. What have you grouped, what have you left aside, and what does that reveal about your question?"
              : "Your searches and saves are already a trail. What did you expect to find, and what did the archive make more complicated?",
          );
          return;
        }

        speak(
          "encouraging",
          current.isWorkbenchBoard
            ? "Choose a few cards, one question, and one next action. That is enough to turn the board into a reading path."
            : "Choose a few sources, one question, and one reason each source matters. That is enough to begin a reading path.",
        );
      };

      if (isMuted) {
        fallback();
        return;
      }

      const context = buildContext();
      setCurrentContext(context);
      if (!context) {
        fallback();
        return;
      }

      if (prompt === "expand") {
        const input = context.area === "workbench_board"
          ? (document.querySelector(".workbench-note-board-floating-search input") as HTMLInputElement | null)
          : (document.getElementById("mainSearch") as HTMLInputElement | null);
        input?.focus();
      }

      speak(
        prompt === "care" ? "careful" : "thinking",
        prompt === "care"
          ? "Let's slow down and check care before we interpret too quickly."
          : "Let's build from what you already tried.",
        false,
      );

      void aiAsk({
        area: context.area,
        mode: promptModes[prompt],
        context,
      }).then((result) => {
        if (!result.ok) {
          fallback();
          return;
        }
        setState(result.characterState);
        setMessage(
          result.characterState === "careful"
            ? "Let's slow down and work through this with care."
            : "Here's a guided path based on the visible context.",
        );
      });
    },
    [aiAsk, aiReset, buildContext, isMuted, refreshSnapshot, speak],
  );

  const hideGuide = useCallback(() => {
    setIsHidden(true);
    window.localStorage.setItem(HIDDEN_KEY, "true");
  }, []);

  const showGuide = useCallback(() => {
    setIsHidden(false);
    setPanelView("open");
    window.localStorage.removeItem(HIDDEN_KEY);
  }, []);

  const toggleMuted = useCallback(() => {
    setIsMuted((current) => {
      const next = !current;
      window.localStorage.setItem(MUTED_KEY, next ? "true" : "false");
      if (next) {
        clearTimers();
        setState("sleeping");
        setMessage("Archive Guide beta is resting. You can wake it again any time.");
      } else {
        setState("idle");
        setMessage(idleMessage);
      }
      return next;
    });
  }, [clearTimers]);

  useEffect(() => {
    setIsHidden(window.localStorage.getItem(HIDDEN_KEY) === "true");
    setIsMuted(window.localStorage.getItem(MUTED_KEY) === "true");
    refreshSnapshot();

    // app.js loads asynchronously (afterInteractive). If it finishes rendering
    // before the MutationObserver is attached, the snapshot stays "none" and
    // the panel never shows. Poll briefly after mount to catch this race.
    const retryDelays = [200, 600, 1400, 3000];
    const timers = retryDelays.map((delay) =>
      window.setTimeout(() => {
        const next = readArchiveGuideSnapshot();
        if (next.surface !== "none") {
          setSnapshot(next);
        }
      }, delay),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [refreshSnapshot]);

  useEffect(() => {
    if (snapshot.isWorkbenchBoard && !hasAutoCollapsedBoardGuideRef.current) {
      hasAutoCollapsedBoardGuideRef.current = true;
      setPanelView("bubble");
      setState("idle");
      setMessage(boardIdleMessage);
    }
  }, [snapshot.isWorkbenchBoard]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      if (
        target.closest("#localSearchBtn") ||
        target.closest("#sourceSearchBtn") ||
        target.closest(".workbench-note-board-floating-search") ||
        target.closest("[data-recent-search]") ||
        target.closest(".suggestion[data-q]") ||
        target.closest(".related-search[data-related]")
      ) {
        beginSearchReflection();
        return;
      }

      if (
        target.closest("[data-card-bookmark]") ||
        target.closest("[data-card-add-list]") ||
        target.closest("[data-card-workbench-add]") ||
        target.closest(".workbench-note-board-floating-add") ||
        target.closest('[data-record-tool="bookmark"]') ||
        target.closest('[data-record-tool="add_to_reading_list"]')
      ) {
        const current = refreshSnapshot();
        speak(
          "celebrating",
          current.isWorkbenchBoard
            ? "Good move. What kind of card would help this thought become usable?"
            : "Good move. What made this source worth saving?",
        );
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        event.key === "Enter" &&
        (target?.id === "mainSearch" || target?.closest(".workbench-note-board-floating-search"))
      ) {
        beginSearchReflection();
      }
      if (event.key === "Escape") {
        setPanelView("bubble");
      }
    };

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        !isMuted &&
        (target?.id === "mainSearch" || target?.closest(".workbench-note-board-floating-search"))
      ) {
        const current = refreshSnapshot();
        setState("listening");
        setMessage(
          current.isWorkbenchBoard
            ? "I'm listening. A board search is a way of noticing what your materials are starting to say."
            : "I'm listening. Every search term is a clue to what you are thinking through.",
        );
      }
    };

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(refreshSnapshot);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocusIn);

    return () => {
      observer.disconnect();
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocusIn);
      clearTimers();
    };
  }, [beginSearchReflection, clearTimers, isMuted, refreshSnapshot, speak]);

  return {
    state: isMuted ? ("sleeping" as const) : state,
    message,
    snapshot,
    panelView,
    activeMode,
    isHidden,
    isMuted,
    openPanel: () => setPanelView("open"),
    closePanel: () => setPanelView("bubble"),
    hideGuide,
    showGuide,
    toggleMuted,
    runPrompt,
    guideResponse,
    guideError,
    isAskingGuide,
    currentContext,
  };
}
