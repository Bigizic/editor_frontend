import React from 'react';
import Loading from './Loading.jsx';

const LoadingSpinnerContainer = ({ loading, message = "Processing..." }) => {
  if (!loading) return null;

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10000,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(2px)'
    }}>
      <div style={{
        background: 'var(--editor-card-bg)',
        padding: '30px',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px'
      }}>
        <Loading size="large" />
        <span style={{
          color: 'var(--editor-text)',
          fontWeight: 500,
          fontSize: '16px'
        }}>
          {message}
        </span>
      </div>
    </div>
  );
};

export default LoadingSpinnerContainer;
