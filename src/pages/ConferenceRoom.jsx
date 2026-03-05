import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  User, Mic, MicOff, LogOut, Lock, Unlock,
  Monitor, X, Phone, Users, UserRound
} from 'lucide-react';
import { useWebRTC } from '../hooks/useWebRTC';

export default function ConferenceRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [joined, setJoined] = useState(false);
  const [name, setName] = useState(() => localStorage.getItem('vo_username') || '');
  const [notifications, setNotifications] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  const [sharingPeerId, setSharingPeerId] = useState(null);
  const screenVideoRef = useRef(null);
  const localStreamRef = useRef(null);

  // Simplified WebRTC for conference mode
  const [peers, setPeers] = useState({});
  const [myId] = useState(Math.random().toString(36).substr(2, 9));
  const peerConnectionsRef = useRef({});
  const localStreamRef2 = useRef(null);

  const handleJoin = (e) => {
    e.preventDefault();
    if (name.trim()) {
      localStorage.setItem('vo_username', name);
      setJoined(true);
    }
  };

  // Initialize media on join
  useEffect(() => {
    if (!joined) return;

    const initializeConference = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true }
        });
        localStreamRef2.current = stream;
        stream.getAudioTracks().forEach(t => t.enabled = !isMuted);
      } catch (err) {
        console.error("Media Error:", err);
      }
    };

    initializeConference();

    return () => {
      if (localStreamRef2.current) {
        localStreamRef2.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [joined, isMuted]);

  const startScreenShare = async () => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false
      });

      // Set video source directly when stream is captured
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = displayStream;
      }

      setScreenStream(displayStream);
      setIsScreenSharing(true);
      setSharingPeerId(myId);

      // Handle when user stops sharing via system UI
      displayStream.getTracks().forEach(track => {
        track.addEventListener('ended', () => {
          stopScreenShare();
        });
      });
    } catch (err) {
      if (err.name !== 'NotAllowedError') {
        console.error("Screen share error:", err);
      }
    }
  };

  const stopScreenShare = () => {
    if (screenStream) {
      screenStream.getTracks().forEach(t => t.stop());
      setScreenStream(null);
      setIsScreenSharing(false);
      setSharingPeerId(null);
    }
  };

  if (!joined) {
    return (
      <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="glass-login">
          <div className="avatar-container" style={{ margin: '0 auto 2rem auto' }}>
            <UserRound size={40} color="var(--primary)" />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>Conference Room</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Team meetings with screen sharing.</p>
          <form onSubmit={handleJoin}>
            <input
              type="text"
              placeholder="Your display name"
              className="text-input"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
            <button type="submit" className="primary-btn">Join Conference</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Fixed Header */}
      <div className="room-header">
        <h1 className="room-header-title">
          CONFERENCE <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>/ {roomId.slice(0, 8)}</span>
        </h1>
        <div className="room-switcher">
          <button className="room-tab" onClick={() => navigate(`/room/${roomId}`)}>Office</button>
          <button className="room-tab active">Conference</button>
        </div>
      </div>

      {/* Main Conference Layout */}
      <div className="conference-container">
        {/* Screen Share Area */}
        <div className="screen-share-area">
          {screenStream && (
            <div className="screen-share-container">
              <video
                ref={screenVideoRef}
                autoPlay
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
              />
              {isScreenSharing && (
                <div className="screen-share-indicator">
                  <Monitor size={18} />
                  <span>You are sharing your screen</span>
                  <button
                    onClick={stopScreenShare}
                    className="stop-share-btn"
                    title="Stop sharing"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
          )}
          {!screenStream && (
            <div className="screen-share-empty">
              <Monitor size={48} color="var(--text-muted)" opacity={0.3} />
              <p>No one is sharing their screen</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Click "Share Screen" to begin</p>
            </div>
          )}
        </div>

        {/* Participants Sidebar */}
        <div className="participants-sidebar">
          <div className="participants-header">
            <Users size={18} />
            <span>Participants</span>
          </div>

          <div className="participant-list">
            {/* Self */}
            <div className="participant-card">
              <div className="participant-avatar">
                <User size={24} color="white" />
              </div>
              <div className="participant-info">
                <p className="participant-name">{name}</p>
                <p className="participant-status">You</p>
              </div>
              <div className="participant-controls">
                {isMuted ? (
                  <MicOff size={16} color="var(--danger)" />
                ) : (
                  <Mic size={16} color="var(--success)" />
                )}
              </div>
            </div>

            {/* Peers */}
            {Object.values(peers).map(peer => (
              <div key={peer.id} className="participant-card">
                <div className="participant-avatar">
                  <User size={24} color="white" />
                </div>
                <div className="participant-info">
                  <p className="participant-name">{peer.name}</p>
                  <p className="participant-status">{peer.isMuted ? 'Muted' : 'Speaking'}</p>
                </div>
                <div className="participant-controls">
                  {peer.isMuted ? (
                    <MicOff size={16} color="var(--danger)" />
                  ) : (
                    <Mic size={16} color="var(--success)" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Control Bar - Conference Style */}
      <div className="conference-control-bar">
        <button
          className={`icon-btn ${!isMuted ? 'active' : ''}`}
          onClick={() => {
            setIsMuted(!isMuted);
            if (localStreamRef2.current) {
              localStreamRef2.current.getAudioTracks().forEach(t => t.enabled = !isMuted);
            }
          }}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
        </button>

        <button
          className={`icon-btn ${isScreenSharing ? 'active danger' : ''}`}
          onClick={() => {
            if (isScreenSharing) {
              stopScreenShare();
            } else {
              startScreenShare();
            }
          }}
          title={isScreenSharing ? "Stop sharing" : "Share screen"}
        >
          <Monitor size={18} />
        </button>

        <button
          className={`icon-btn ${isLocked ? 'active' : ''}`}
          onClick={() => setIsLocked(!isLocked)}
          title={isLocked ? "Unlock" : "Lock"}
        >
          {isLocked ? <Lock size={18} /> : <Unlock size={18} />}
        </button>

        <button
          className="icon-btn danger"
          onClick={() => setJoined(false)}
          title="Leave conference"
        >
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );
}
