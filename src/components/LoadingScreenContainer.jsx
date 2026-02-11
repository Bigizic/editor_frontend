import React, { useState, useEffect } from 'react';

const BRAND = "Reedapt";

const STATUS_LABELS = {
  processing: "Processing",
  extracting_audio: "Extracting audio from video",
  analyzing_audio_stems: "Running stem analysis",
  analyzing_audio: "Analyzing audio",
  transcribing_audio: "Transcribing audio",
  translating_audio: "Translating audio",
  cloning: "Cloning voice",
  segmenting_audio: "Segmenting audio",
  adjusting_audio_timing: "Syncing audio timing",
  generating_tts: "Generating speech audio",
  creating_final_audio: "Creating final audio mix",
  lip_syncing: "Lip syncing video",
  cleaning_things_up: "Cleaning things up",
  done: "Done",
  completed: "Completed",
  failed: "Failed"
};

const LoadingScreenContainer = ({ loading, statusText }) => {
  const [dotCount, setDotCount] = useState(0);

  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setDotCount((prev) => (prev + 1) % 4);
    }, 500);
    return () => clearInterval(interval);
  }, [loading]);

  if (!loading) return null;

  const dots = ".".repeat(dotCount);

  // Resolve a raw status slug to a friendly label
  const displayText = statusText
    ? (STATUS_LABELS[statusText] || statusText.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '))
    : "Loading";

  return (
    <div className="loading-screen-overlay">
      <div className="loading-screen-content">
        <div className="loading-brand" aria-label={BRAND}>
          {BRAND.split("").map((char, i) => (
            <span
              key={i}
              className="loading-brand-letter"
              style={{
                animationDelay: `${i * 0.15}s, ${i * 0.18}s`
              }}
            >
              {char}
            </span>
          ))}
        </div>
        <span className="loading-screen-subtitle">
          {displayText}<span className="loading-dots">{dots}</span>
        </span>
      </div>
    </div>
  );
};

export default LoadingScreenContainer;
