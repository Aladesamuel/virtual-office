import React, { useEffect, useState } from 'react';
import { Phone, PhoneOff, Plus } from 'lucide-react';

export function ActiveCallModal({ peerName, onHangUp, isVisible, availablePeers, onAddPeer }) {
  const [audioLevel, setAudioLevel] = useState(0);
  const [showAddPeers, setShowAddPeers] = useState(false);

  // Simulate audio waveform visualization
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setAudioLevel(Math.random() * 100);
    }, 80);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="active-call-overlay">
      <div className="active-call-modal">
        {/* Header */}
        <div className="call-modal-header">
          <h2>In a call with</h2>
        </div>

        {/* Peer Avatar */}
        <div className="call-avatar-large">
          <div className="call-avatar-initials">
            {peerName.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Peer Name */}
        <h1 className="call-peer-name">{peerName}</h1>

        {/* Audio Waveform Visualizer */}
        <div className="audio-visualizer">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="visualizer-bar"
              style={{
                height: `${Math.random() * 100}%`,
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>

        {/* Call Duration */}
        <div className="call-duration">
          <span id="call-timer">00:00</span>
        </div>

        {/* Add Participants Button */}
        {availablePeers && availablePeers.length > 0 && (
          <div style={{ width: '100%', marginTop: '0.5rem' }}>
            <button
              onClick={() => setShowAddPeers(!showAddPeers)}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'var(--primary-subtle)',
                color: 'var(--primary)',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
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
              <Plus size={18} />
              Add Person
            </button>

            {/* Participants List */}
            {showAddPeers && (
              <div style={{
                marginTop: '1rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '0.75rem',
                maxHeight: '200px',
                overflowY: 'auto',
                padding: '0.75rem',
                background: 'rgba(0,0,0,0.02)',
                borderRadius: '12px'
              }}>
                {availablePeers.map(peer => (
                  <button
                    key={peer.id}
                    onClick={() => {
                      onAddPeer(peer.id);
                      setShowAddPeers(false);
                    }}
                    style={{
                      padding: '0.75rem',
                      background: 'white',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s',
                      fontSize: '0.85rem',
                      fontWeight: 600
                    }}
                    onMouseEnter={e => {
                      e.target.style.background = 'var(--primary-subtle)';
                      e.target.style.borderColor = 'var(--primary)';
                    }}
                    onMouseLeave={e => {
                      e.target.style.background = 'white';
                      e.target.style.borderColor = 'var(--border)';
                    }}
                  >
                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {peer.name}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Add to call
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Hang Up Button */}
        <button className="hang-up-btn" onClick={onHangUp}>
          <PhoneOff size={24} />
          <span>End Call</span>
        </button>
      </div>
    </div>
  );
}
