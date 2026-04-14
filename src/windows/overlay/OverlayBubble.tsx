/**
 * OverlayBubble — entry point for the overlay window.
 *
 * Manages collapsed ↔ expanded state.
 * Collapsed: 280×76 capsule.
 * Expanded: 420×520 panel.
 *
 * Listens for btw-capture events from Rust and updates captureStore.
 */

import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { captureStore, useCaptureStore } from "../../lib/captureStore";
import { onCaptureTriggered, analyzePerception } from "../../lib/gateway";
import BubbleCollapsed from "./BubbleCollapsed";
import BubbleExpanded from "./BubbleExpanded";
import "./Overlay.css";

const COLLAPSED_SIZE = { width: 280, height: 76 };
const EXPANDED_SIZE  = { width: 420, height: 520 };

export default function OverlayBubble() {
  const [expanded, setExpanded] = useState(false);
  const state = useCaptureStore();

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    onCaptureTriggered(async (event) => {
      // Reset previous results, start analyzing
      captureStore.reset();
      captureStore.setStatus("analyzing");

      // Auto-expand when capture comes in
      setExpanded(false);

      try {
        const result = await analyzePerception(event.screenshot, event.window_title);
        captureStore.setCaptureResult(event, result);
        // Auto-expand to show results
        handleExpand();
      } catch (e) {
        captureStore.setError(e instanceof Error ? e.message : String(e));
        setExpanded(true);
        await invoke("resize_overlay", EXPANDED_SIZE);
      }
    }).then((fn) => {
      unlisten = fn;
    });

    return () => unlisten?.();
  }, []);

  async function handleExpand() {
    setExpanded(true);
    await invoke("resize_overlay", EXPANDED_SIZE);
  }

  async function handleCollapse() {
    setExpanded(false);
    await invoke("resize_overlay", COLLAPSED_SIZE);
  }

  async function handleClose() {
    setExpanded(false);
    await invoke("resize_overlay", COLLAPSED_SIZE);
    await invoke("hide_overlay");
  }

  return expanded ? (
    <BubbleExpanded onCollapse={handleCollapse} onClose={handleClose} />
  ) : (
    <BubbleCollapsed
      status={state.status}
      contactName={state.analyzeResult?.contact_name ?? null}
      onExpand={handleExpand}
      onClose={handleClose}
    />
  );
}
