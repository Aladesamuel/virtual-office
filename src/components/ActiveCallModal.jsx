import React, { useEffect, useState } from 'react';
import { Phone, PhoneOff } from 'lucide-react';

export function ActiveCallModal({ peerName, onHangUp, isVisible }) {
  const [audioLevel, setAudioLevel] = useState(0);

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

        {/* Hang Up Button */}
        <button className="hang-up-btn" onClick={onHangUp}>
          <PhoneOff size={24} />
          <span>End Call</span>
        </button>
      </div>
    </div>
  );
}
