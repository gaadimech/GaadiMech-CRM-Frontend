"use client";

import { useEffect } from "react";
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

  // Auto-request permission and subscribe when component mounts (if user is authenticated)
  useEffect(() => {
    if (!isSupported) {
      return;
    }

    // Only auto-subscribe if permission is granted and not already subscribed
    if (permission === "granted" && !isSubscribed && !isRegistering) {
      subscribe();
    } else if (permission === "default") {
      // Request permission automatically
      requestPermission().then((granted) => {
        if (granted) {
          subscribe();
        }
      });
    }
  }, [isSupported, permission, isSubscribed, isRegistering, requestPermission, subscribe]);

  // This component doesn't render anything - it just manages push notifications in the background
  return null;
}




