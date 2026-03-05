import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  User, Mic, MicOff, Phone, LogOut, Video, VideoOff,
  Lock, Unlock, Hand, Camera, CameraOff, Bell, UserRound
} from 'lucide-react';
import { useWebRTC } from '../hooks/useWebRTC';

export default function Room() {
  const { roomId } = useParams();
  const [joined, setJoined] = useState(false);
  const [name, setName] = useState(() => localStorage.getItem('vo_username') || '');
  const [notifications, setNotifications] = useState([]);

  const {
    peers, myId, myStatus, setMyStatus,
    isMuted, setIsMuted,
    isVideoEnabled, setIsVideoEnabled,
    isLocked, setIsLocked,
    joinRequests, acceptRequest,
    callPeer, knockPeer, hangUp,
    localStream
  } = useWebRTC(roomId, name, joined);

  // Auto-notification for people entering
  const prevPeers = useRef({});
  useEffect(() => {
    const now = Object.keys(peers);
    const prev = Object.keys(prevPeers.current);
    now.forEach(id => {
      if (!prev.includes(id)) {
        addNotification(`${peers[id].name || 'Someone'} entered the office`);
      }
    });
    prevPeers.current = peers;
  }, [peers]);

  const addNotification = (message) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, message }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000);
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (name.trim()) {
      localStorage.setItem('vo_username', name);
      setJoined(true);
    }
  };

  if (!joined) {
    return (
      <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="glass-login">
          <div className="avatar-container" style={{ margin: '0 auto 2rem auto' }}>
            <UserRound size={40} color="var(--primary)" />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>Virtual Office</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Reclaiming the "quick sync" from Slack and Zoom.</p>
          <form onSubmit={handleJoin}>
            <input
              type="text"
              placeholder="Your display name"
              className="text-input"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
            <button type="submit" className="primary-btn">Step Inside</button>
          </form>
        </div>
      </div>
    );
  }

  const peerList = Object.values(peers);

  return (
    <div className="app-container">
      {/* Toast Notifications */}
      <div className="toast-container">
        {notifications.map(n => (
          <div key={n.id} className="toast">
            <Bell size={14} style={{ marginRight: '8px' }} />
            {n.message}
          </div>
        ))}
      </div>

      {/* Sleek Fixed Header */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, padding: '1.25rem 2rem', zIndex: 50, display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'none' }}>
        <h1 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.02em', pointerEvents: 'auto' }}>
          OFFICE <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>/ {roomId}</span>
        </h1>
        <div style={{ pointerEvents: 'auto' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--success)', background: 'white', padding: '4px 12px', borderRadius: '99px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            ● ONLINE
          </span>
        </div>
      </div>

      {/* Office Floor (Grid) */}
      <div className="office-floor">
        {/* Your Tile */}
        <div className="member-tile">
          <div className={`avatar-container ${localStream && !isMuted ? 'talking-pulse' : ''}`}>
            <User size={30} color="var(--primary)" />
            <div className={`status-dot status-${myStatus}`} />
          </div>
          <p className="member-name">{name} (You)</p>
          <p className="member-status-text">{myStatus}</p>

          <div style={{ marginTop: '1rem', width: '100%', aspectRatio: '16/9', overflow: 'hidden', borderRadius: '16px', border: '1px solid var(--border)', background: '#0f172a' }}>
            {isVideoEnabled && localStream && (
              <video
                autoPlay playsInline muted
                ref={el => { if (el) el.srcObject = localStream; }}
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
              />
            )}
            {(!isVideoEnabled || !localStream) && (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-app)' }}>
                <CameraOff size={24} color="var(--text-muted)" opacity={0.3} />
              </div>
            )}
          </div>
        </div>

        {/* Peer Tiles */}
        {peerList.map(peer => (
          <div key={peer.id} className="member-tile">
            <div className={`avatar-container ${peer.isTalking ? 'talking-pulse' : ''}`}>
              <User size={30} color={peer.isTalking ? 'var(--primary)' : 'var(--text-muted)'} />
              <div className={`status-dot status-${peer.status || 'Available'}`} />
              {peer.isLocked && <div style={{ position: 'absolute', top: -5, right: -5, background: 'var(--oncall)', color: 'white', padding: '2px', borderRadius: '50%' }}><Lock size={10} /></div>}
            </div>
            <p className="member-name">{peer.name}</p>
            <p className="member-status-text">{peer.status || 'Available'} {peer.isMuted ? '(Muted)' : ''}</p>

            {/* Video Feed */}
            <div style={{ marginTop: '1rem', width: '100%', aspectRatio: '16/9', overflow: 'hidden', borderRadius: '16px', border: '1px solid var(--border)', background: '#0f172a' }}>
              {peer.remoteStream && peer.remoteStream.getVideoTracks().length > 0 ? (
                <video
                  autoPlay playsInline
                  ref={el => { if (el) el.srcObject = peer.remoteStream; }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-app)' }}>
                  <VideoOff size={24} color="var(--text-muted)" opacity={0.3} />
                </div>
              )}
            </div>

            <div style={{ width: '100%' }}>
              {peer.status === 'OnCall' ? (
                <button onClick={() => hangUp(peer.id)} className="call-btn danger">
                  <Phone size={14} /> Hang Up
                </button>
              ) : (
                peer.isLocked ? (
                  <button onClick={() => knockPeer(peer.id)} className="call-btn">
                    <Hand size={14} /> Knock
                  </button>
                ) : (
                  <button onClick={() => callPeer(peer.id)} className="call-btn">
                    <Phone size={14} /> Talk
                  </button>
                )
              )}
            </div>

            {/* Hidden Audio Elements */}
            <audio autoPlay ref={el => { if (el && peer.remoteStream) el.srcObject = peer.remoteStream; }} />
          </div>
        ))}
      </div>

      {/* Join Requests Banner (Notification Style) */}
      {joinRequests.length > 0 && (
        <div style={{
          position: 'fixed', bottom: '6.5rem', left: '50%', transform: 'translateX(-50%)',
          width: '90%', maxWidth: '380px', background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(20px)',
          color: 'white', padding: '1.25rem', borderRadius: '24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          zIndex: 110, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', background: 'var(--primary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Hand size={20} />
            </div>
            <div>
              <p style={{ fontSize: '0.85rem', fontWeight: 700 }}>{joinRequests[0].name}</p>
              <p style={{ fontSize: '0.75rem', opacity: 0.7 }}>is knocking...</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => acceptRequest(joinRequests[0].id)} style={{ background: 'white', color: 'var(--text-main)', padding: '8px 16px', borderRadius: '12px', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}>Accept</button>
            <button onClick={() => setJoinRequests(prev => prev.slice(1))} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', padding: '8px 12px', borderRadius: '12px', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}>Ignore</button>
          </div>
        </div>
      )}

      {/* Floating Control Bar */}
      <div className="control-bar">
        <div className="controls-group">
          <button
            className={`icon-btn ${!isMuted ? 'active' : ''}`}
            onClick={() => setIsMuted(!isMuted)}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
          <button
            className={`icon-btn ${isVideoEnabled ? 'active' : ''}`}
            onClick={() => setIsVideoEnabled(!isVideoEnabled)}
            title={isVideoEnabled ? "Disable Video" : "Enable Video"}
          >
            {isVideoEnabled ? <Camera size={18} /> : <CameraOff size={18} />}
          </button>
          <button
            className={`icon-btn ${isLocked ? 'active' : ''}`}
            onClick={() => setIsLocked(!isLocked)}
            title={isLocked ? "Unlock Space" : "Lock Space"}
          >
            {isLocked ? <Lock size={18} /> : <Unlock size={18} />}
          </button>
        </div>

        <div className="status-pill-group">
          {['Available', 'Busy', 'Away'].map(s => (
            <button
              key={s}
              onClick={() => setMyStatus(s)}
              style={{ padding: '0.4rem 0.8rem', borderRadius: '99px', border: 'none', background: myStatus === s ? 'var(--primary-subtle)' : 'transparent', color: myStatus === s ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem', transition: '0.2s' }}
            >
              {s}
            </button>
          ))}
        </div>

        <button className="icon-btn" onClick={() => setJoined(false)} style={{ color: 'var(--danger)', border: 'none' }}>
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );
}
