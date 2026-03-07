import React, { useState } from 'react';
import { Circle, CircleOff } from 'lucide-react';

export function DoNotDisturb({ isEnabled, onChange }) {
  const [showMenu, setShowMenu] = useState(false);

  const toggleDND = () => {
    onChange(!isEnabled);
    setShowMenu(false);
  };

  return (
    <div style={{ position: 'relative', pointerEvents: 'auto' }}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        style={{
          background: isEnabled ? 'var(--danger)' : 'var(--bg-card)',
          color: isEnabled ? 'white' : 'var(--text-muted)',
          border: `1px solid ${isEnabled ? 'var(--danger)' : 'var(--border)'}`,
          borderRadius: '50%',
          width: '44px',
          height: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
          padding: 0,
          fontSize: '1rem',
          fontWeight: '700',
          title: isEnabled ? 'Do Not Disturb ON' : 'Do Not Disturb OFF'
        }}
        onMouseEnter={e => {
          if (!isEnabled) {
            e.target.style.background = 'var(--primary-subtle)';
            e.target.style.color = 'var(--primary)';
            e.target.style.borderColor = 'var(--primary)';
          }
        }}
        onMouseLeave={e => {
          if (!isEnabled) {
            e.target.style.background = 'var(--bg-card)';
            e.target.style.color = 'var(--text-muted)';
            e.target.style.borderColor = 'var(--border)';
          }
        }}
      >
        {isEnabled ? <CircleOff size={18} /> : <Circle size={18} />}
      </button>

      {showMenu && (
        <div
          style={{
            position: 'absolute',
            bottom: '50px',
            right: 0,
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '0.75rem',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 1000,
            whiteSpace: 'nowrap',
            minWidth: '140px'
          }}
        >
          <button
            onClick={toggleDND}
            style={{
              width: '100%',
              padding: '0.6rem',
              border: 'none',
              background: 'transparent',
              color: isEnabled ? 'var(--danger)' : 'var(--success)',
              fontWeight: '700',
              fontSize: '0.85rem',
              cursor: 'pointer',
              borderRadius: '8px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => {
              e.target.style.background = isEnabled ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)';
            }}
            onMouseLeave={e => {
              e.target.style.background = 'transparent';
            }}
          >
            {isEnabled ? 'Deactivate DND' : 'Activate DND'}
          </button>
          <div
            style={{
              borderTop: '1px solid var(--border)',
              marginTop: '0.5rem',
              paddingTop: '0.5rem',
              fontSize: '0.7rem',
              color: 'var(--text-muted)',
              textAlign: 'center'
            }}
          >
            {isEnabled ? 'Calls will be auto-rejected' : 'Calls can be received'}
          </div>
        </div>
      )}
    </div>
  );
}
