import React, { useState, useEffect } from 'react';

const BRAND = "Reedapt";

/**
 * LoadingScreenContainer — only shown during initial page load (loading prop).
 * Editor action progress is now handled by the EditorNotifications component
 * and per-button disabling via isEditing, so this overlay no longer reads
 * from the editorNotification reducer.
 */
const LoadingScreenContainer = ({ loading, statusText }) => {
  // const editorNotification = useSelector((state) => state.editorNotification);
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
  const displayText = statusText || "Loading editor";

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







/**
 * 
 * 
 * const BRAND = "Reedapt";
const LoadingScreenContainer = ({ loading, statusText }) => {
  // const editorNotification = useSelector((state) => state.editorNotification);
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
  const displayText = statusText || "Loading editor";

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
 */
