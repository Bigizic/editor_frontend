import React from 'react';
import { FiX, FiCheck, FiAlertTriangle } from 'react-icons/fi';

const ConfirmSelection = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  options = [],
  confirmText = "Done",
  cancelText = "Cancel",
  isAlert = false,
  theme = "light"
}) => {
  if (!isOpen) return null;

  // Determine styles based on theme if needed, but CSS vars handle most
  const isDark = theme === "dark";

  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'fadeIn 0.2s ease-out'
  };

  const contentStyle = {
    backgroundColor: 'var(--editor-card-bg)',
    color: 'var(--editor-text)',
    padding: '24px',
    borderRadius: '12px',
    maxWidth: '420px',
    width: '90%',
    border: '1px solid var(--editor-border)',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    transform: 'scale(1)',
    animation: 'scaleIn 0.2s ease-out',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  };

  const titleStyle = {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  };

  const messageStyle = {
    margin: 0,
    fontSize: '14px',
    color: 'var(--editor-text-muted)',
    lineHeight: 1.5
  };

  const buttonContainerStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '8px'
  };

  const actionButtonStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid var(--editor-border)',
    background: 'var(--editor-input-bg)',
    color: 'var(--editor-text)',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s',
    width: '100%'
  };

  const footerStyle = {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '8px'
  };

  const basicButtonStyle = {
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    border: 'none'
  };

  return (
    <div className="modal-overlay" style={overlayStyle} onClick={onClose}>
      <div
        className="modal-content"
        style={contentStyle}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={titleStyle}>
          {isAlert && <FiAlertTriangle color="#f59e0b" />}
          {title}
        </h3>

        {message && <p style={messageStyle}>{message}</p>}

        {options.length > 0 ? (
          <div style={buttonContainerStyle}>
            {options.map((opt, idx) => (
              <button
                key={idx}
                style={{
                  ...actionButtonStyle,
                  borderColor: opt.danger ? 'var(--error-color, #ef4444)' : 'var(--editor-border)',
                  color: opt.danger ? 'var(--error-color, #ef4444)' : 'var(--editor-text)'
                }}
                onClick={() => {
                  opt.onClick();
                  onClose();
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--editor-accent-bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--editor-input-bg)'}
              >
                <span style={{ fontWeight: 600, fontSize: '14px' }}>{opt.label}</span>
                {opt.description && (
                  <span style={{
                    display: 'block',
                    fontSize: '12px',
                    opacity: 0.7,
                    fontWeight: 400,
                    marginTop: '2px'
                  }}>
                    {opt.description}
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : null}

        <div style={footerStyle}>
          {cancelText && (
            <button
              style={{
                ...basicButtonStyle,
                background: 'transparent',
                color: 'var(--editor-text-muted)'
              }}
              onClick={onClose}
            >
              {cancelText}
            </button>
          )}

          {!options.length && (
            <button
              style={{
                ...basicButtonStyle,
                background: 'var(--editor-accent)',
                color: '#fff'
              }}
              onClick={() => {
                if (onConfirm) onConfirm();
                onClose();
              }}
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
};

export default ConfirmSelection;
