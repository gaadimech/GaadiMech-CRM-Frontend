"use client";

import { useEffect, useState, useRef } from "react";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  currentValue?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function VoiceInputButton({
  onTranscript,
  currentValue = "",
  disabled = false,
  size = "md",
}: VoiceInputButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const sessionStartValueRef = useRef(currentValue);
  const lastTranscriptRef = useRef("");

  const {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    reset,
  } = useSpeechRecognition({
    onResult: (finalText) => {
      // Final results are handled through the transcript useEffect
    },
    onError: (errorMsg) => {
      console.error("Speech recognition error:", errorMsg);
      if (errorMsg.includes("permission")) {
        alert("Please allow microphone access to use voice input.");
      }
    },
    language: "en-IN", // English (India) - supports Hindi code-switching
    continuous: true,
    interimResults: true,
  });

  // Update session start value when currentValue changes externally (but not during listening)
  useEffect(() => {
    if (!isListening) {
      sessionStartValueRef.current = currentValue;
    }
  }, [currentValue, isListening]);

  // Handle click to toggle listening
  const handleClick = () => {
    if (disabled) return;

    if (isListening) {
      stopListening();
      lastTranscriptRef.current = "";
    } else {
      // Store the starting value when we begin listening
      sessionStartValueRef.current = currentValue;
      lastTranscriptRef.current = "";
      reset();
      startListening();
    }
  };

  // Update transcript in real-time
  useEffect(() => {
    if (isListening && transcript) {
      // Only update if transcript has changed
      if (transcript !== lastTranscriptRef.current) {
        const base = sessionStartValueRef.current;
        // Combine base value with current transcript
        const fullText = base ? `${base}\n${transcript}` : transcript;
        
        // Update tracking
        lastTranscriptRef.current = transcript;
        
        // Update the parent component
        onTranscript(fullText);
      }
    } else if (!isListening) {
      // Reset when not listening
      lastTranscriptRef.current = "";
    }
  }, [transcript, isListening, onTranscript]);

  // Size classes
  const sizeClasses = {
    sm: "w-7 h-7",
    md: "w-9 h-9",
    lg: "w-11 h-11",
  };

  const iconSizes = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`
          ${sizeClasses[size]}
          flex items-center justify-center
          rounded-lg
          transition-all duration-200
          ${
            isListening
              ? "bg-red-500 text-white animate-pulse"
              : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
          }
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2
        `}
        title={isListening ? "Stop recording" : "Start voice input"}
      >
        {isListening ? (
          <svg
            className={iconSizes[size]}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 012 0v4a1 1 0 11-2 0V7zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V7a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <svg
            className={iconSizes[size]}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-900 text-white text-xs rounded whitespace-nowrap z-50">
          {isListening ? "Click to stop" : "Click to speak"}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-zinc-900"></div>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute top-full left-0 mt-1 px-2 py-1 bg-red-100 text-red-800 text-xs rounded whitespace-nowrap z-50 max-w-xs">
          {error}
        </div>
      )}
    </div>
  );
}

