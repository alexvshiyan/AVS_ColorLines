import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";

const SESSION_STORAGE_KEY = "colorlines-analytics-session-id";
const HEARTBEAT_INTERVAL_MS = 45_000;

export type AnalyticsMetadata = Record<string, unknown>;

function createSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `session_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "server";

  const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) return existing;

  const created = createSessionId();
  window.localStorage.setItem(SESSION_STORAGE_KEY, created);
  return created;
}

function detectDisplayMode(): string {
  if (typeof window === "undefined") return "unknown";
  if (window.matchMedia?.("(display-mode: standalone)").matches) return "standalone";
  if ((window.navigator as Navigator & { standalone?: boolean }).standalone) return "ios-standalone";
  return "browser";
}

function detectBrowser(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return "Microsoft Edge";
  if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) return "Chrome";
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return "Safari";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/OPR\//.test(ua)) return "Opera";
  return "unknown";
}

function detectPlatform(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  if (/Android/.test(ua)) return "Android";
  if (/Windows/.test(ua)) return "Windows";
  if (/Macintosh|Mac OS X/.test(ua)) return "macOS";
  if (/Linux/.test(ua)) return "Linux";
  return navigator.platform || "unknown";
}

function getViewport(): string {
  if (typeof window === "undefined") return "unknown";
  return `${window.innerWidth}x${window.innerHeight}`;
}

export function useAnalytics() {
  const [sessionId] = useState(getOrCreateSessionId);
  const [onlinePlayers, setOnlinePlayers] = useState<number | null>(null);
  const mutation = trpc.analytics.track.useMutation({
    onSuccess(data) {
      if (typeof data.onlinePlayers === "number") {
        setOnlinePlayers(data.onlinePlayers);
      }
    },
  });
  const hasTrackedStart = useRef(false);

  const clientContext = useMemo(
    () => ({
      locale: typeof navigator !== "undefined" ? navigator.language : undefined,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      viewport: getViewport(),
      displayMode: detectDisplayMode(),
      browser: detectBrowser(),
      platform: detectPlatform(),
    }),
    [],
  );

  const track = useCallback(
    (eventName: string, metadata?: AnalyticsMetadata, category = "game") => {
      mutation.mutate(
        {
          sessionId,
          eventName,
          category,
          page: typeof window !== "undefined" ? window.location.pathname : "/",
          metadata,
          ...clientContext,
          viewport: getViewport(),
          displayMode: detectDisplayMode(),
        },
        {
          onError(error) {
            if (import.meta.env.DEV) {
              console.warn("[Analytics] Event was not recorded", eventName, error);
            }
          },
        },
      );
    },
    [clientContext, mutation, sessionId],
  );

  useEffect(() => {
    if (hasTrackedStart.current) return;
    hasTrackedStart.current = true;
    track("session_started", { source: "home" }, "session");
  }, [track]);

  useEffect(() => {
    const sendHeartbeat = () => track("heartbeat", { visibility: document.visibilityState }, "session");
    const interval = window.setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") sendHeartbeat();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [track]);

  return { sessionId, onlinePlayers, track };
}
