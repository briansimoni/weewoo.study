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
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<
    BeforeInstallPromptEvent | null
  >(null);

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
      
    // Check specifically for iOS
    const isIOSDevice = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

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
    <div className="fixed bottom-0 left-0 right-0 bg-primary text-primary-content p-4 shadow-lg z-[100]">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-base-100 rounded-full p-2">
            <img src="/ambulance.svg" alt="WeeWoo" className="w-6 h-6" />
          </div>
          <div>
            <p className="font-bold">Get the WeeWoo App</p>
            <p className="text-sm">
              {isIOS 
                ? "Add to your home screen" 
                : "For a better experience"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {isIOS ? (
            <div className="text-sm flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Tap <strong>Share</strong> then <strong>Add to Home Screen</strong>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-sm btn-accent"
              onClick={handleInstallClick}
            >
              Install
            </button>
          )}
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
