import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const SecondaryMouse = ({ position, items, onClose }) => {
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        onClose();
      }
    };
    // Use mousedown to capture before click propagates
    document.addEventListener('mousedown', handleClickOutside);
    // Also close on scroll to avoid floating menu in wrong place
    window.addEventListener('scroll', onClose, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', onClose, true);
    };
  }, [onClose]);

  if (!position) return null;

  // Use portal to render outside of localized stacking contexts/overflows
  return createPortal(
    <div
      ref={ref}
      className="secondary-mouse-menu"
      style={{
        position: 'fixed',
        top: position.y,
        left: position.x,
        zIndex: 9999,
        backgroundColor: 'var(--bg-card, #1e1e1e)',
        border: '1px solid var(--border-color, #333)',
        borderRadius: '6px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        padding: '4px 0',
        minWidth: '160px',
        color: 'var(--text-primary, #fff)',
        fontSize: '14px',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}
      onContextMenu={(e) => e.preventDefault()} // Prevent native menu on the menu itself
    >
      {items.map((item, index) => (
        <div
          key={index}
          onClick={(e) => {
            e.stopPropagation();
            item.onClick();
            onClose();
          }}
          style={{
            padding: '8px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: item.danger ? 'var(--danger-color, #ff4d4f)' : 'inherit',
            transition: 'background-color 0.2s',
            borderBottom: index < items.length - 1 && item.divider ? '1px solid var(--border-color, #333)' : 'none'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover, #333)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          {item.icon && <span style={{ display: 'flex', alignItems: 'center' }}>{item.icon}</span>}
          <span>{item.label}</span>
        </div>
      ))}
    </div>,
    document.body
  );
};

export default SecondaryMouse;
