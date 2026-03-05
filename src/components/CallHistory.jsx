import React, { useEffect, useState } from 'react';
import { Clock, Trash2, X } from 'lucide-react';

export function CallHistory({ isOpen, onClose }) {
  const [callHistory, setCallHistory] = useState([]);

  useEffect(() => {
    const stored = localStorage.getItem('vo_call_history');
    if (stored) {
      try {
        setCallHistory(JSON.parse(stored));
      } catch (err) {
        console.error('Failed to load call history:', err);
      }
    }
  }, [isOpen]);

  const saveToHistory = (peerName, duration, timestamp) => {
    const history = JSON.parse(localStorage.getItem('vo_call_history') || '[]');
    history.unshift({
      id: `${Date.now()}-${Math.random()}`,
      peerName,
      duration,
      timestamp,
      date: new Date(timestamp).toLocaleDateString(),
      time: new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    // Keep only last 50 calls
    history.splice(50);
    localStorage.setItem('vo_call_history', JSON.stringify(history));
    setCallHistory(history);
  };

  const clearHistory = () => {
    if (confirm('Clear all call history?')) {
      localStorage.removeItem('vo_call_history');
      setCallHistory([]);
    }
  };

  const deleteCall = (id) => {
    const updated = callHistory.filter(c => c.id !== id);
    localStorage.setItem('vo_call_history', JSON.stringify(updated));
    setCallHistory(updated);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 300
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '20px 20px 0 0',
          padding: '1.5rem',
          width: '100%',
          maxWidth: '500px',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.5rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={20} color="var(--primary)" />
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-main)' }}>
              Call History
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--primary-subtle)',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--primary)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => {
              e.target.style.background = 'var(--primary)';
              e.target.style.color = 'white';
            }}
            onMouseLeave={e => {
              e.target.style.background = 'var(--primary-subtle)';
              e.target.style.color = 'var(--primary)';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {callHistory.length > 0 ? (
          <>
            <div style={{ flex: 1, marginBottom: '1rem' }}>
              {callHistory.map(call => (
                <div
                  key={call.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem',
                    borderBottom: '1px solid var(--border)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--primary-subtle)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '700', color: 'var(--text-main)', marginBottom: '2px' }}>
                      {call.peerName}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {call.date} at {call.time}
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginLeft: '1rem',
                      flexShrink: 0
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: '700',
                        color: 'var(--primary)',
                        fontVariantNumeric: 'tabular-nums'
                      }}
                    >
                      {formatDuration(call.duration)}
                    </span>
                    <button
                      onClick={() => deleteCall(call.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => {
                        e.target.style.color = 'var(--danger)';
                      }}
                      onMouseLeave={e => {
                        e.target.style.color = 'var(--text-muted)';
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={clearHistory}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'var(--danger)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontWeight: '700',
                cursor: 'pointer',
                fontSize: '0.9rem',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => {
                e.target.style.background = '#dc2626';
              }}
              onMouseLeave={e => {
                e.target.style.background = 'var(--danger)';
              }}
            >
              Clear History
            </button>
          </>
        ) : (
          <div
            style={{
              textAlign: 'center',
              padding: '2rem 1rem',
              color: 'var(--text-muted)'
            }}
          >
            <Clock size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
            <p style={{ margin: 0 }}>No calls yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

export { saveToHistory: saveCallToHistory };
