"use client";

import { useEffect, useState } from "react";
import { usePushNotifications } from "../hooks/usePushNotifications";

export default function PushNotificationManager() {
  const {
    isSupported,
    permission,
    isSubscribed,
    isRegistering,
    requestPermission,
    subscribe,
  } = usePushNotifications();

  const [showBanner, setShowBanner] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [hasDismissed, setHasDismissed] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);

  // Auto-subscribe if permission is already granted
  useEffect(() => {
    if (!isSupported) {
      return;
    }

    // Only auto-subscribe if permission is already granted and not already subscribed
    if (permission === "granted" && !isSubscribed && !isRegistering) {
      subscribe();
    }
  }, [isSupported, permission, isSubscribed, isRegistering, subscribe]);

  // Show banner if permission is not granted
  useEffect(() => {
    if (!isSupported) {
      return;
    }

    // Show banner if:
    // 1. Permission is "default" (not asked yet) or "denied" (user denied)
    // 2. User hasn't dismissed it
    // 3. User is not already subscribed
    if ((permission === "default" || permission === "denied") && !hasDismissed && !isSubscribed) {
      // Small delay to let page load first
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 2000); // Show after 2 seconds

      return () => clearTimeout(timer);
    } else {
      setShowBanner(false);
    }
  }, [isSupported, permission, hasDismissed, isSubscribed]);

  // Hide banner and show success when permission is granted
  useEffect(() => {
    if (permission === "granted" && isSubscribed) {
      setShowBanner(false);
      setShowSuccess(true);
      setHasDismissed(false); // Reset so it can show again if permission is revoked
      
      // Hide success message after 5 seconds
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [permission, isSubscribed]);

  const handleEnableNotifications = async () => {
    setIsEnabling(true);
    try {
      // If permission was previously denied, we can't request again programmatically
      // Guide user to browser settings
      if (permission === "denied") {
        // Show instructions for enabling in browser settings
        alert(
          "To enable notifications:\n\n" +
          "Chrome/Edge: Click the lock icon in the address bar → Site settings → Notifications → Allow\n\n" +
          "Firefox: Click the lock icon → More Information → Permissions → Notifications → Allow\n\n" +
          "Safari: Safari → Settings → Websites → Notifications → Allow\n\n" +
          "After enabling, please refresh the page."
        );
        setIsEnabling(false);
        return;
      }

      const granted = await requestPermission();
      if (granted) {
        await subscribe();
        setShowBanner(false);
      } else {
        // Permission denied - keep banner visible with different message
        console.warn("Notification permission denied");
      }
    } catch (error) {
      console.error("Error enabling notifications:", error);
    } finally {
      setIsEnabling(false);
    }
  };

  const handleDismiss = () => {
    setHasDismissed(true);
    setShowBanner(false);
    // Store dismissal in localStorage so it doesn't show again this session
    if (typeof window !== "undefined") {
      localStorage.setItem("notification_banner_dismissed", "true");
    }
  };

  // Check localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const dismissed = localStorage.getItem("notification_banner_dismissed");
      if (dismissed === "true") {
        setHasDismissed(true);
      }
    }
  }, []);

  // Reset dismissal when permission changes
  useEffect(() => {
    if (permission === "denied" || permission === "default") {
      // Clear dismissal flag so banner can show again
      if (typeof window !== "undefined") {
        localStorage.removeItem("notification_banner_dismissed");
      }
      setHasDismissed(false);
    }
  }, [permission]);

  return (
    <>
      {/* Success Message */}
      {showSuccess && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4 bg-green-600 text-white shadow-lg animate-slide-up border-t-2 border-green-500">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-xl sm:text-2xl">✅</span>
              <div>
                <h3 className="font-semibold text-base sm:text-lg">Notifications Enabled!</h3>
                <p className="text-xs sm:text-sm text-green-100">You'll now receive instant alerts when leads are assigned to you.</p>
              </div>
            </div>
            <button
              onClick={() => setShowSuccess(false)}
              className="px-3 sm:px-4 py-2 text-green-100 hover:text-white active:text-green-50 transition-colors text-lg sm:text-xl"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Permission Request Banner */}
      {showBanner && isSupported && !isSubscribed && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4 bg-blue-600 text-white shadow-lg animate-slide-up border-t-2 border-blue-500">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base sm:text-lg mb-1">🔔 Enable Notifications</h3>
                <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
                  {permission === "denied"
                    ? "Notifications are currently blocked. Please enable them in your browser settings to receive instant alerts when leads are assigned to you."
                    : "Enable push notifications to receive instant alerts when leads are assigned to you. This is essential for your workflow."}
                </p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleEnableNotifications}
                  disabled={isEnabling || isRegistering}
                  className="flex-1 sm:flex-none px-4 py-2 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 active:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  {isEnabling || isRegistering
                    ? "Enabling..."
                    : permission === "denied"
                    ? "How to Enable"
                    : "Enable Notifications"}
                </button>
                {permission !== "denied" && (
                  <button
                    onClick={handleDismiss}
                    className="px-3 sm:px-4 py-2 text-blue-100 hover:text-white active:text-blue-50 transition-colors text-sm sm:text-base"
                  >
                    Not Now
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}




