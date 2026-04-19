import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { captureStore, useCaptureStore } from "../../lib/captureStore";
import { onCaptureTriggered, analyzePerception } from "../../lib/gateway";
import { resolveContactId, ensureContact, appendConversation } from "../../lib/contactRegistry";
import BubbleCollapsed from "./BubbleCollapsed";
import BubbleExpanded from "./BubbleExpanded";
import "./Overlay.css";

const COLLAPSED_SIZE = { width: 280, height: 76 };
const EXPANDED_SIZE  = { width: 780, height: 560 };

export default function OverlayBubble() {
  const [expanded, setExpandedState] = useState(true);
  const expandedRef = useRef(true);
  const [contactsCache, setContactsCache] = useState<Record<string, string>>({});
  const state = useCaptureStore();

  function setExpanded(v: boolean) {
    expandedRef.current = v;
    setExpandedState(v);
  }

  function refreshContactsCache() {
    invoke<Array<{ id: string; name: string; platform: string }>>("list_contacts")
      .then((list) => {
        const map: Record<string, string> = {};
        list.forEach((c) => { map[c.id] = c.name; });
        setContactsCache(map);
      })
      .catch(() => {});
  }

  // Load contacts cache on mount
  useEffect(refreshContactsCache, []);

  // Refresh contacts cache when a capture completes (new contact may have been added)
  useEffect(() => {
    if (state.status === "done") refreshContactsCache();
  }, [state.status === "done" ? state.analyzeResult?.contact_name : null]);

  // Listen for persona updated event (after onboarding completes)
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen("btw-persona-updated", () => {
      // Trigger HomeView persona re-check by forcing a re-render
      setContactsCache((prev) => ({ ...prev }));
    }).then((fn) => { unlisten = fn; });
    return () => unlisten?.();
  }, []);

  // Capture event handler
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    onCaptureTriggered(async (event) => {
      captureStore.reset(); // captureCardVisible = true
      captureStore.setStatus("analyzing");

      // Expand if collapsed
      if (!expandedRef.current) {
        await handleExpand();
      }

      try {
        const result = await analyzePerception(event.screenshot, event.window_title);

        const contactId = resolveContactId(
          result.contact_name,
          captureStore.getState().activeContactId,
        );

        captureStore.setCaptureResult(event, result, contactId ?? undefined);

        if (contactId) {
          try {
            await ensureContact(contactId, result.contact_name ?? contactId, result.platform ?? "unknown");
            await appendConversation(contactId, result.messages, new Date(event.timestamp).toLocaleString());
            refreshContactsCache();
          } catch (registryErr) {
            console.warn("contactRegistry:", registryErr);
          }
        }
      } catch (e) {
        captureStore.setError(e instanceof Error ? e.message : String(e));
        if (!expandedRef.current) await handleExpand();
      }
    }).then((fn) => { unlisten = fn; });

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

  const displayContactName = state.activeContactId
    ? (contactsCache[state.activeContactId] ?? state.analyzeResult?.contact_name ?? null)
    : (state.analyzeResult?.contact_name ?? null);

  return expanded ? (
    <BubbleExpanded
      onCollapse={handleCollapse}
      onClose={handleClose}
      contactsCache={contactsCache}
    />
  ) : (
    <BubbleCollapsed
      status={state.status}
      contactName={displayContactName}
      onExpand={handleExpand}
      onClose={handleClose}
    />
  );
}
