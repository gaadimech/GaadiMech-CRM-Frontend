"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getApiBase } from "../lib/apiBase";
import { getFCMToken, onForegroundMessage } from "../lib/firebase";

const API_BASE = getApiBase();

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  // Check if push notifications are supported
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Check for service worker support
      const hasServiceWorker = "serviceWorker" in navigator;
      // Check for notification support
      const hasNotifications = "Notification" in window;
      // Check for Firebase Messaging (FCM)
      const hasFCM = typeof window !== "undefined";
      
      if (hasServiceWorker && hasNotifications && hasFCM) {
        setIsSupported(true);
        setPermission(Notification.permission);
      }
    }
  }, []);

  // Register Firebase Messaging service worker
  const registerServiceWorker = useCallback(async () => {
    if (!isSupported) {
      console.log("Push notifications not supported");
      return null;
    }

    try {
      // Register Firebase Messaging service worker
      const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
        scope: "/",
      });
      console.log("Firebase Messaging Service Worker registered:", registration);
      
      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      
      return registration;
    } catch (error) {
      console.error("Service Worker registration failed:", error);
      return null;
    }
  }, [isSupported]);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      return permission === "granted";
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  }, [isSupported]);

  // Subscribe to push notifications (FCM)
  const subscribe = useCallback(async () => {
    if (!isSupported || permission !== "granted") {
      console.log("Push notifications not supported or permission not granted");
      return false;
    }

    setIsRegistering(true);

    try {
      // Register service worker first
      const registration = await registerServiceWorker();
      if (!registration) {
        throw new Error("Service Worker registration failed");
      }

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      // Get FCM token
      const fcmToken = await getFCMToken();
      
      if (!fcmToken) {
        throw new Error("Failed to get FCM token");
      }

      console.log("FCM Token obtained:", fcmToken);

      // Send FCM token to backend
      const response = await fetch(`${API_BASE}/api/push/subscribe`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fcm_token: fcmToken,
          // Keep endpoint for backward compatibility during migration
          endpoint: fcmToken, // Using token as endpoint identifier
        }),
      });

      if (response.ok) {
        setIsSubscribed(true);
        console.log("FCM token registered successfully");
        return true;
      } else {
        const error = await response.json();
        console.error("Failed to register FCM token:", error);
        return false;
      }
    } catch (error) {
      console.error("Error subscribing to push notifications:", error);
      return false;
    } finally {
      setIsRegistering(false);
    }
  }, [isSupported, permission, registerServiceWorker]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!isSupported) {
      return false;
    }

    try {
      // Get current FCM token
      const fcmToken = await getFCMToken();
      
      if (fcmToken) {
        // Remove token from backend
        const response = await fetch(`${API_BASE}/api/push/unsubscribe`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            fcm_token: fcmToken,
            endpoint: fcmToken, // For backward compatibility
          }),
        });

        if (response.ok) {
          setIsSubscribed(false);
          console.log("FCM token removed successfully");
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error("Error unsubscribing from push notifications:", error);
      return false;
    }
  }, [isSupported]);

  // Check subscription status
  const checkSubscription = useCallback(async () => {
    if (!isSupported) {
      return;
    }

    // Only check subscription if permission is granted
    if (permission !== "granted") {
      setIsSubscribed(false);
      return;
    }

    try {
      const fcmToken = await getFCMToken();
      setIsSubscribed(!!fcmToken);
    } catch (error) {
      console.error("Error checking subscription:", error);
      setIsSubscribed(false);
    }
  }, [isSupported, permission]);

  // Listen for foreground messages
  useEffect(() => {
    if (!isSupported) {
      return;
    }

    const unsubscribe = onForegroundMessage((payload) => {
      console.log("🔔 Foreground message received:", payload);
      
      // Check notification permission before showing
      if (Notification.permission !== "granted") {
        console.warn("⚠️ Notification permission not granted. Permission:", Notification.permission);
        console.warn("⚠️ Please grant notification permission to receive notifications.");
        return;
      }
      
      // Show notification even when app is in foreground
      if (payload.notification) {
        try {
          const notification = new Notification(
            payload.notification.title || "New Notification",
            {
              body: payload.notification.body,
              icon: payload.notification.icon || "/icon-192x192.png",
              badge: "/badge-72x72.png",
              tag: payload.data?.tag || "default",
              data: payload.data || {},
              requireInteraction: false,
            }
          );
          
          console.log("✅ Foreground notification created:", notification);
          
          // Handle notification click
          notification.onclick = (event) => {
            event.preventDefault();
            const url = payload.data?.url || "/todays-leads";
            window.focus();
            window.location.href = url;
            notification.close();
          };
        } catch (error) {
          console.error("❌ Error creating foreground notification:", error);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isSupported]);

  // Initialize on mount - only once
  const initializedRef = useRef(false);
  useEffect(() => {
    if (isSupported && !initializedRef.current) {
      initializedRef.current = true;
      registerServiceWorker();
      // Only check subscription if permission is already granted
      if (permission === "granted") {
        checkSubscription();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupported, permission]); // Run when isSupported or permission changes

  return {
    isSupported,
    permission,
    isSubscribed,
    isRegistering,
    requestPermission,
    subscribe,
    unsubscribe,
    checkSubscription,
  };
}
