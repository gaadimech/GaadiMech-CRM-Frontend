"use client";

import { useState, useEffect, useRef } from "react";

interface UseSpeechRecognitionOptions {
  onResult?: (text: string) => void;
  onError?: (error: string) => void;
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

export function useSpeechRecognition({
  onResult,
  onError,
  language = "en-IN", // English (India) - supports Hindi code-switching
  continuous = true,
  interimResults = true,
}: UseSpeechRecognitionOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef("");
  const lastResultIndexRef = useRef(0);

  useEffect(() => {
    // Check if browser supports Web Speech API
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError(
        "Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari."
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = language;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = "";
      let newFinalTranscript = "";

      // Process only new results (from resultIndex onwards)
      // This prevents processing the same results multiple times
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          // Only add new final results
          newFinalTranscript += transcript + " ";
          finalTranscriptRef.current += transcript + " ";
        } else {
          // Interim results for real-time display
          interimTranscript += transcript;
        }
      }

      // Combine all final results with current interim results for display
      const fullTranscript = (finalTranscriptRef.current.trim() + " " + interimTranscript).trim();
      setTranscript(fullTranscript);
      
      // Call onResult only when we have new final results
      if (onResult && newFinalTranscript.trim()) {
        onResult(finalTranscriptRef.current.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      let errorMessage = "Speech recognition error occurred";
      
      switch (event.error) {
        case "no-speech":
          errorMessage = "No speech detected. Please try again.";
          break;
        case "audio-capture":
          errorMessage = "Microphone not found. Please check your microphone.";
          break;
        case "not-allowed":
          errorMessage = "Microphone permission denied. Please allow microphone access.";
          break;
        case "network":
          errorMessage = "Network error. Please check your connection.";
          break;
        case "aborted":
          // User stopped manually, not an error
          return;
        default:
          errorMessage = `Speech recognition error: ${event.error}`;
      }
      
      setError(errorMessage);
      setIsListening(false);
      if (onError) {
        onError(errorMessage);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors when stopping
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, continuous, interimResults]);

  const startListening = () => {
    if (!recognitionRef.current) {
      setError("Speech recognition not initialized");
      return;
    }

    try {
      finalTranscriptRef.current = "";
      lastResultIndexRef.current = 0;
      setTranscript("");
      recognitionRef.current.start();
    } catch (err: any) {
      if (err.message?.includes("already started")) {
        // Already listening, ignore
        return;
      }
      setError("Failed to start speech recognition");
      if (onError) {
        onError("Failed to start speech recognition");
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        // Ignore errors
      }
    }
  };

  const reset = () => {
    stopListening();
    setTranscript("");
    finalTranscriptRef.current = "";
    lastResultIndexRef.current = 0;
    setError(null);
  };

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    reset,
  };
}

