import React from "react";
import { FiLoader } from "react-icons/fi";

const Loading = ({ message = "Loading...", variant = "text" }) => {
  if (variant === "spinner") {
    return (
      <div className="loading-spinner-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--editor-text-muted)' }}>
        <FiLoader className="spinner-icon" style={{ animation: 'spin 1s linear infinite' }} />
        <span>{message}</span>
        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }
  return <div className="loading">{message}</div>;
};

export default Loading;
