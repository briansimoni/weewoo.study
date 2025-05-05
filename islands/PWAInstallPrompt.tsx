import { useEffect, useState } from "preact/hooks";

// Define interface for BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<
    { outcome: "accepted" | "dismissed"; platform: string }
  >;
  prompt(): Promise<void>;
}

export default function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<
    BeforeInstallPromptEvent | null
  >(null);

  sessionStorage.setItem("pwa-prompt-dismissed", "false");

  useEffect(() => {
    // Only run on client-side
    if (typeof globalThis === "undefined") return;

    // Check if already dismissed in this session
    if (sessionStorage.getItem("pwa-prompt-dismissed") === "true") return;

    // Only show on mobile devices
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
      .test(
        navigator.userAgent,
      );

    // Check if app is running in standalone mode (already installed)
    const isStandalone =
      globalThis.matchMedia("(display-mode: standalone)").matches ||
      (navigator as { standalone?: boolean }).standalone === true;

    // Only show prompt for mobile devices not in standalone mode
    if (isMobile && !isStandalone) {
      setShowPrompt(true);
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      // Prevent Chrome 67+ from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
    };

    globalThis.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt as EventListener,
    );

    return () => {
      globalThis.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt as EventListener,
      );
    };
  }, []);

  const handleInstallClick = () => {
    if (!deferredPrompt) return;

    // Show the prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === "accepted") {
        console.log("User accepted the install prompt");
      } else {
        console.log("User dismissed the install prompt");
      }
      // Clear the saved prompt
      setDeferredPrompt(null);
    });
  };

  const handleDismissClick = () => {
    setShowPrompt(false);
    // Remember dismissal for this session
    sessionStorage.setItem("pwa-prompt-dismissed", "true");
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-primary text-primary-content p-4 shadow-lg z-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-base-100 rounded-full p-2">
            <img src="/ambulance.svg" alt="WeeWoo" className="w-6 h-6" />
          </div>
          <div>
            <p className="font-bold">Get the WeeWoo App</p>
            <p className="text-sm">For a better experience</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-sm btn-accent"
            onClick={handleInstallClick}
          >
            Install
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            aria-label="Dismiss"
            onClick={handleDismissClick}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
