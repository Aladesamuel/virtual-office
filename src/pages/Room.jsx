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

      {/* Header */}
      <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', background: 'white' }}>
        <h1 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          OFFICE <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>Room: {roomId}</span>
        </h1>
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

          <div style={{ marginTop: '1rem', width: '100%' }}>
            {isVideoEnabled && localStream && (
              <video
                autoPlay playsInline muted
                ref={el => { if (el) el.srcObject = localStream; }}
                style={{ width: '100%', borderRadius: '12px', background: '#000', height: '140px', objectFit: 'cover' }}
              />
            )}
          </div>
        </div>

        {/* Peer Tiles */}
        {peerList.map(peer => (
          <div key={peer.id} className="member-tile">
            <div className={`avatar-container ${peer.isTalking ? 'talking-pulse' : ''}`}>
              <User size={30} color={peer.isTalking ? 'var(--primary)' : 'var(--text-muted)'} />
              <div className={`status-dot status-${peer.status}`} />
              {peer.isLocked && <div style={{ position: 'absolute', top: -5, right: -5, background: 'var(--oncall)', color: 'white', padding: '2px', borderRadius: '50%' }}><Lock size={10} /></div>}
            </div>
            <p className="member-name">{peer.name}</p>
            <p className="member-status-text">{peer.status} {peer.isMuted ? '(Muted)' : ''}</p>

            {/* Video Feed if on call and video available */}
            {peer.remoteStream && peer.remoteStream.getVideoTracks().length > 0 && (
              <video
                autoPlay playsInline
                ref={el => { if (el) el.srcObject = peer.remoteStream; }}
                style={{ width: '100%', borderRadius: '12px', background: '#000', height: '140px', objectFit: 'cover', marginTop: '1rem' }}
              />
            )}

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

      {/* Join Requests Banner */}
      {joinRequests.length > 0 && (
        <div style={{ position: 'fixed', bottom: '100px', left: '2rem', right: '2rem', background: 'var(--primary)', color: 'white', padding: '1rem 2rem', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 100, boxShadow: 'var(--shadow-lg)' }}>
          <span><strong>{joinRequests[0].name}</strong> is knocking on your huddle...</span>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => acceptRequest(joinRequests[0].id)} className="primary-btn" style={{ background: 'white', color: 'var(--primary)', padding: '0.5rem 1rem' }}>Let in</button>
            <button onClick={() => addNotification("Request ignored")} style={{ background: 'transparent', color: 'white', border: 'none', cursor: 'pointer' }}>Ignore</button>
          </div>
        </div>
      )}

      {/* Control Bar */}
      <div className="control-bar">
        <div className="controls-group">
          <button
            className={`icon-btn ${!isMuted ? 'active' : ''}`}
            onClick={() => setIsMuted(!isMuted)}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          <button
            className={`icon-btn ${isVideoEnabled ? 'active' : ''}`}
            onClick={() => setIsVideoEnabled(!isVideoEnabled)}
            title={isVideoEnabled ? "Disable Video" : "Enable Video"}
          >
            {isVideoEnabled ? <Camera size={20} /> : <CameraOff size={20} />}
          </button>
          <button
            className={`icon-btn ${isLocked ? 'active' : ''}`}
            onClick={() => setIsLocked(!isLocked)}
            title={isLocked ? "Unlock Space" : "Lock Space"}
          >
            {isLocked ? <Lock size={20} /> : <Unlock size={20} />}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {['Available', 'Busy', 'Away'].map(s => (
            <button
              key={s}
              onClick={() => setMyStatus(s)}
              style={{ padding: '0.5rem 1rem', borderRadius: '12px', border: '1px solid var(--border)', background: myStatus === s ? 'var(--primary-subtle)' : 'white', color: myStatus === s ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 700, cursor: 'pointer' }}
            >
              {s}
            </button>
          ))}
        </div>

        <button className="icon-btn" onClick={() => setJoined(false)} style={{ color: 'var(--danger)' }}>
          <LogOut size={20} />
        </button>
      </div>
    </div>
  );
}
