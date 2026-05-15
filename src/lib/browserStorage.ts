import { emit } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

const STORAGE_PREFIX = "project-btw:";

export function isTauriRuntime() {
  return Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
}

export async function readAppFile(relativePath: string): Promise<string> {
  if (isTauriRuntime()) {
    return invoke<string>("read_file", { relativePath });
  }
  return localStorage.getItem(`${STORAGE_PREFIX}${relativePath}`) ?? "";
}

export async function writeAppFile(relativePath: string, content: string): Promise<void> {
  if (isTauriRuntime()) {
    await invoke("write_file", { relativePath, content });
    return;
  }
  localStorage.setItem(`${STORAGE_PREFIX}${relativePath}`, content);
}

export async function clearAppFile(relativePath: string): Promise<void> {
  if (isTauriRuntime()) {
    await invoke("write_file", { relativePath, content: "" });
    return;
  }
  localStorage.removeItem(`${STORAGE_PREFIX}${relativePath}`);
}

export async function emitAppEvent(event: string, payload: unknown = {}): Promise<void> {
  if (isTauriRuntime()) {
    await emit(event, payload);
  } else {
    window.dispatchEvent(new CustomEvent(event, { detail: payload }));
  }
}

export async function showCurrentWindow(): Promise<void> {
  if (isTauriRuntime()) {
    await getCurrentWindow().show();
  }
}

export async function hideCurrentWindow(): Promise<void> {
  if (isTauriRuntime()) {
    await getCurrentWindow().hide();
  }
}
