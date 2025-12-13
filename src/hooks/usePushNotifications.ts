"use client";

import { useEffect, useState, useCallback } from "react";
import { getApiBase } from "../lib/apiBase";

const API_BASE = getApiBase();

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  // Check if push notifications are supported
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  // Register service worker
  const registerServiceWorker = useCallback(async () => {
    if (!isSupported) {
      console.log("Push notifications not supported");
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
      console.log("Service Worker registered:", registration);
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

  // Subscribe to push notifications
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

      // Get VAPID public key from server
      let vapidPublicKey = "";
      try {
        const keyResponse = await fetch(`${API_BASE}/api/push/vapid-public-key`, {
          credentials: "include",
        });
        if (keyResponse.ok) {
          const keyData = await keyResponse.json();
          vapidPublicKey = keyData.publicKey || "";
        }
      } catch (error) {
        console.error("Error fetching VAPID public key:", error);
      }

      if (!vapidPublicKey) {
        console.warn("VAPID public key not available");
        // Continue anyway - the backend will handle it
      }

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey
          ? urlBase64ToUint8Array(vapidPublicKey)
          : undefined,
      });

      console.log("Push subscription:", subscription);

      // Send subscription to backend
      const response = await fetch(`${API_BASE}/api/push/subscribe`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(subscription.getKey("p256dh")),
            auth: arrayBufferToBase64(subscription.getKey("auth")),
          },
        }),
      });

      if (response.ok) {
        setIsSubscribed(true);
        console.log("Push subscription registered successfully");
        return true;
      } else {
        const error = await response.json();
        console.error("Failed to register push subscription:", error);
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
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Get endpoint to send to backend
        const endpoint = subscription.endpoint;

        // Unsubscribe from push service
        await subscription.unsubscribe();

        // Remove subscription from backend
        const response = await fetch(`${API_BASE}/api/push/unsubscribe`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ endpoint }),
        });

        if (response.ok) {
          setIsSubscribed(false);
          console.log("Push subscription removed successfully");
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

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error("Error checking subscription:", error);
    }
  }, [isSupported]);

  // Initialize on mount
  useEffect(() => {
    if (isSupported) {
      registerServiceWorker();
      checkSubscription();
    }
  }, [isSupported, registerServiceWorker, checkSubscription]);

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

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Helper function to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

