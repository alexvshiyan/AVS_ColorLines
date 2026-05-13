import { useEffect, useState } from "react";

type Platform = "android" | "ios" | "none";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "colorlines-install-dismissed";

function detectPlatform(): Platform {
  if (typeof window === "undefined") return "none";
  // Already installed as PWA
  if (window.matchMedia("(display-mode: standalone)").matches) return "none";
  // iOS Safari
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua) && /safari/i.test(ua) && !/chrome/i.test(ua)) {
    return "ios";
  }
  return "none"; // Android will be set via beforeinstallprompt
}

export default function InstallBanner() {
  const [platform, setPlatform] = useState<Platform>("none");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    // Check if already dismissed
    if (localStorage.getItem(DISMISSED_KEY) === "1") {
      setDismissed(true);
      return;
    }

    // Detect iOS
    const p = detectPlatform();
    if (p === "ios") {
      setPlatform("ios");
      return;
    }

    // Android: listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setPlatform("android");
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Listen for successful install
    window.addEventListener("appinstalled", () => setInstalled(true));

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
    setShowIosHint(false);
  };

  const handleInstallAndroid = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
      setDismissed(true);
    }
    setDeferredPrompt(null);
  };

  if (dismissed || installed || platform === "none") return null;

  return (
    <div
      className="install-banner"
      role="banner"
      aria-label="Install Color Lines as an app"
    >
      <span className="install-banner-icon">📲</span>

      {platform === "android" && (
        <>
          <span className="install-banner-text">Install as app</span>
          <button
            className="install-banner-btn"
            onClick={handleInstallAndroid}
            aria-label="Install Color Lines app"
          >
            INSTALL
          </button>
        </>
      )}

      {platform === "ios" && !showIosHint && (
        <>
          <span className="install-banner-text">Add to Home Screen</span>
          <button
            className="install-banner-btn"
            onClick={() => setShowIosHint(true)}
            aria-label="Show iOS install instructions"
          >
            HOW?
          </button>
        </>
      )}

      {platform === "ios" && showIosHint && (
        <span className="install-banner-hint">
          Tap <strong>Share</strong> &#x2197; → <strong>Add to Home Screen</strong>
        </span>
      )}

      <button
        className="install-banner-close"
        onClick={handleDismiss}
        aria-label="Dismiss install banner"
      >
        ✕
      </button>
    </div>
  );
}
