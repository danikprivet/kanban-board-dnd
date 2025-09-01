import React, { useEffect } from 'react';

export default function Modal({ title, open, onClose, children, hideHeader, style }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose?.(); }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div 
      onClick={onClose} 
              style={{ 
          position: 'fixed', 
          inset: 0, 
          background: 'transparent', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 1000,
          backdropFilter: 'none',
          WebkitBackdropFilter: 'none'
        }}
    >
      <div 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          background: 'var(--surface)', 
          color: 'var(--text)', 
          minWidth: 500,
          maxWidth: '90vw', 
          maxHeight: '90vh',
          borderRadius: 16, 
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
          transform: 'scale(1)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          ...style
        }}

      >
        {!hideHeader && (
          <div style={{
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: 'center',
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--surface-alt)',
            borderRadius: '12px 12px 0 0',
            minHeight: '60px'
          }}>
            <div style={{
              fontSize: '18px',
              fontWeight: '600',
              color: 'var(--text)',
              textAlign: 'left'
            }}>
              {title}
            </div>
            <button
              onClick={onClose}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: 'none',
                background: 'var(--surface-alt)',
                color: 'var(--text)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: 'bold',
                outline: 'none',
                marginLeft: 'auto'
              }}
              onMouseEnter={(e) => e.target.style.background = 'var(--surface)'}
              onMouseLeave={(e) => e.target.style.background = 'var(--surface-alt)'}
            >
              ×
            </button>
          </div>
        )}
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  );
}
