import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Mic,
  MicOff,
  UserRound,
  PhoneCall,
  PhoneOff,
  Lock,
  Unlock,
  Check,
  X,
  Settings,
  MoreVertical
} from 'lucide-react';
import { useWebRTC } from '../hooks/useWebRTC';

function DraggableCard({ children, initialX, initialY }) {
  const [pos, setPos] = useState({ x: initialX, y: initialY });
  const [dragging, setDragging] = useState(false);
  const offset = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    if (e.target.closest('button')) return;

    setDragging(true);
    offset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e) => {
    const newX = e.clientX - offset.current.x;
    const newY = e.clientY - offset.current.y;
    setPos({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setDragging(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      className="peer-card"
      style={{ left: pos.x, top: pos.y, cursor: dragging ? 'grabbing' : 'grab' }}
      onMouseDown={handleMouseDown}
    >
      {children}
    </div>
  );
}

export default function Room() {
  const { roomId } = useParams();
  const [joined, setJoined] = useState(false);
  const [name, setName] = useState(() => localStorage.getItem('vo_username') || '');
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const {
    peers,
    myStatus,
    setMyStatus,
    isMuted,
    toggleMute,
    isLocked,
    toggleLock,
    joinRequests,
    acceptJoinRequest,
    declineJoinRequest,
    callPeer,
    hangUpPeer,
    error,
  } = useWebRTC(roomId, name, joined);

  const handleJoin = (e) => {
    e.preventDefault();
    if (name.trim()) {
      localStorage.setItem('vo_username', name);
      setJoined(true);
    }
  };

  if (!joined) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-app)' }}>
        <div className="glass" style={{ width: '100%', maxWidth: '400px', padding: '3rem', borderRadius: '32px', textAlign: 'center' }}>
          <div className="peer-avatar" style={{ margin: '0 auto 2rem auto', width: '80px', height: '80px', background: 'var(--primary-subtle)' }}>
            <UserRound size={40} color="var(--primary)" />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>Enter Workspace</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Ready to collaborate in <strong>{roomId}</strong>?</p>
          <form onSubmit={handleJoin}>
            <input
              type="text"
              placeholder="Display name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: '100%', border: '1px solid var(--border)', padding: '1rem', borderRadius: '16px', marginBottom: '1.5rem', outline: 'none', fontSize: '1rem', textAlign: 'center' }}
              autoFocus
            />
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '1rem' }}>
              Join Room
            </button>
          </form>
        </div>
      </div>
    );
  }

  const peerList = Object.values(peers);
  const isAnyPeerTalking = peerList.some(p => p.isTalking);

  return (
    <div className="workspace-container">
      {/* Top Navigation */}
      <div style={{ position: 'fixed', top: '1.5rem', left: '1.5rem', zIndex: 10 }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>Virtual Office</h1>
      </div>

      {/* Error Feedback */}
      {error && (
        <div style={{ position: 'fixed', top: '5rem', left: '50%', transform: 'translateX(-50%)', background: '#fee2e2', color: 'var(--danger)', padding: '0.75rem 1.5rem', borderRadius: '12px', zIndex: 50, fontWeight: 600 }}>
          {error}
        </div>
      )}

      {/* Join Requests */}
      {joinRequests.length > 0 && (
        <div className="request-banner">
          <Check size={20} color="var(--success)" />
          <span><strong>{joinRequests[0].peerName}</strong> is knocking...</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => acceptJoinRequest(joinRequests[0].peerId)} className="btn btn-primary" style={{ padding: '0.4rem 0.8rem' }}>Accept</button>
            <button onClick={() => declineJoinRequest(joinRequests[0].peerId)} className="btn btn-ghost" style={{ padding: '0.4rem 0.8rem' }}>Decline</button>
          </div>
        </div>
      )}

      {/* Local User Card (Draggable) */}
      <DraggableCard initialX={100} initialY={100}>
        {isLocked && <div style={{ position: 'absolute', top: '12px', right: '12px', color: 'var(--danger)' }}><Lock size={14} /></div>}
        <div style={{ position: 'relative' }} onClick={() => setShowStatusMenu(!showStatusMenu)}>
          <div className={`peer-avatar ${!isMuted ? 'talking-pulse' : ''}`} style={{ cursor: 'pointer' }}>
            <UserRound size={30} color={!isMuted ? 'var(--primary)' : 'var(--text-muted)'} />
            <div className={`status-indicator status-${myStatus}`} />
          </div>

          {showStatusMenu && (
            <div className="status-menu">
              {['Available', 'Busy', 'Break'].map(s => (
                <div key={s} className="status-option" onClick={(e) => { e.stopPropagation(); setMyStatus(s); setShowStatusMenu(false); }}>
                  <div className={`status-dot status-${s}`} style={{ width: 8, height: 8, borderRadius: '50%' }} />
                  {s}
                </div>
              ))}
            </div>
          )}
        </div>
        <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{name}</h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>You • {myStatus}</p>
      </DraggableCard>

      {/* Remote Peers (Draggable) */}
      {peerList.map((peer, index) => (
        <DraggableCard key={peer.id} initialX={400 + (index * 40)} initialY={200 + (index * 40)}>
          <div style={{ position: 'relative' }}>
            <div className={`peer-avatar ${peer.isTalking ? 'talking-pulse' : ''}`}>
              <UserRound size={30} color={peer.isTalking ? 'var(--primary)' : 'var(--text-muted)'} />
              <div className={`status-indicator status-${peer.status}`} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{peer.name}</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{peer.status}</p>
            </div>

            <div>
              {peer.isTalking ? (
                <button onClick={() => hangUpPeer(peer.id)} className="control-btn danger" style={{ background: '#fee2e2' }}>
                  <PhoneOff size={18} />
                </button>
              ) : (
                <button
                  onClick={() => callPeer(peer.id)}
                  disabled={peer.status === 'Busy'}
                  className="btn btn-primary"
                  style={{ padding: '0.5rem', borderRadius: '12px', opacity: peer.status === 'Busy' ? 0.3 : 1 }}
                >
                  {peer.isLocked ? <Lock size={18} /> : <PhoneCall size={18} />}
                </button>
              )}
            </div>
          </div>
        </DraggableCard>
      ))}

      {/* Bottom Control Bar */}
      <div className="control-bar">
        <button className="control-btn" style={{ background: isMuted ? 'transparent' : 'var(--primary-subtle)', color: isMuted ? 'var(--text-muted)' : 'var(--primary)' }} onClick={toggleMute}>
          {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
        </button>

        {isAnyPeerTalking && (
          <button className="control-btn" style={{ background: isLocked ? '#fee2e2' : 'transparent', color: isLocked ? 'var(--danger)' : 'var(--text-muted)' }} onClick={toggleLock}>
            {isLocked ? <Lock size={22} /> : <Unlock size={22} />}
          </button>
        )}

        <div style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 8px' }} />

        <div style={{ display: 'flex', gap: '4px', padding: '0 8px' }}>
          {['Available', 'Busy', 'Break'].map(s => (
            <button
              key={s}
              onClick={() => setMyStatus(s)}
              style={{
                width: '10px', height: '10px', borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: s === 'Available' ? 'var(--success)' : (s === 'Busy' ? 'var(--danger)' : 'var(--warning)'),
                transform: myStatus === s ? 'scale(1.3)' : 'scale(1)',
                transition: 'all 0.2s',
                padding: 0
              }}
              title={s}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
