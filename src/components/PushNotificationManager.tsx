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

  const [hasRequestedPermission, setHasRequestedPermission] = useState(false);

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

  // Request permission on first user interaction (click anywhere on page)
  useEffect(() => {
    if (!isSupported || permission !== "default" || hasRequestedPermission) {
      return;
    }

    const handleUserInteraction = (event: Event) => {
      // Only trigger on actual user interaction, not programmatic events
      if (permission === "default" && !hasRequestedPermission) {
        setHasRequestedPermission(true);
        // Small delay to ensure it's a real user interaction
        setTimeout(() => {
          requestPermission().then((granted) => {
            if (granted) {
              subscribe();
            }
          });
        }, 100);
      }
    };

    // Listen for first user interaction (click, touch, or key press)
    const events = ["click", "touchstart", "keydown"];
    events.forEach((event) => {
      document.addEventListener(event, handleUserInteraction, { once: true, passive: true });
    });

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleUserInteraction);
      });
    };
  }, [isSupported, permission, hasRequestedPermission, requestPermission, subscribe]);

  // This component doesn't render anything - it just manages push notifications in the background
  return null;
}




