import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Mic, MicOff, UserRound, PhoneCall, PhoneOff, Lock, Unlock, Check, X,
  Monitor, FileUp, MonitorOff, User
} from 'lucide-react';
import { useWebRTC } from '../hooks/useWebRTC';

function DraggableCard({ children, initialX, initialY, onFileDrop, peerId }) {
  const [pos, setPos] = useState({ x: initialX, y: initialY });
  const [dragging, setDragging] = useState(false);
  const [isOver, setIsOver] = useState(false);
  const offset = useRef({ x: 0, y: 0 });

  const handleMouseDown = e => {
    if (e.target.closest('button, input')) return;
    setDragging(true);
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStart = e => {
    if (e.target.closest('button, input')) return;
    const t = e.touches[0];
    setDragging(true);
    offset.current = { x: t.clientX - pos.x, y: t.clientY - pos.y };
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
  };

  const handleMouseMove = e => setPos({ x: e.clientX - offset.current.x, y: e.clientY - offset.current.y });
  const handleTouchMove = e => { e.preventDefault(); const t = e.touches[0]; setPos({ x: t.clientX - offset.current.x, y: t.clientY - offset.current.y }); };
  const handleMouseUp = () => { setDragging(false); document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); };
  const handleTouchEnd = () => { setDragging(false); document.removeEventListener('touchmove', handleTouchMove); document.removeEventListener('touchend', handleTouchEnd); };

  // File Drop Handlers
  const onDragOver = e => { e.preventDefault(); setIsOver(true); };
  const onDragLeave = () => setIsOver(false);
  const onDrop = e => {
    e.preventDefault();
    setIsOver(false);
    if (!onFileDrop || !peerId) return;
    const file = e.dataTransfer.files[0];
    if (file) onFileDrop(peerId, file);
  };

  return (
    <div
      className={`peer-card ${isOver ? 'file-over' : ''} ${children.props?.isSharing ? 'sharing' : ''}`}
      style={{ left: pos.x, top: pos.y, cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none' }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
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
    peers, myId, myStatus, setMyStatus, isMuted, toggleMute, isLocked, toggleLock,
    joinRequests, acceptJoinRequest, declineJoinRequest, callPeer, hangUpPeer,
    startScreenShare, stopScreenShare, localScreenStream, sendFile, error
  } = useWebRTC(roomId, name, joined);

  const handleJoin = (e) => { e.preventDefault(); if (name.trim()) { localStorage.setItem('vo_username', name); setJoined(true); } };

  if (!joined) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-app)' }}>
        <div className="glass" style={{ width: '100%', maxWidth: '400px', padding: '3rem', borderRadius: '32px', textAlign: 'center' }}>
          <div className="peer-avatar" style={{ margin: '0 auto 2rem auto', width: '80px', height: '80px', background: 'var(--primary-subtle)' }}><UserRound size={40} color="var(--primary)" /></div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>Enter Workspace</h2>
          <form onSubmit={handleJoin}>
            <input type="text" placeholder="Display name" value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', border: '1px solid var(--border)', padding: '1rem', borderRadius: '16px', marginBottom: '1.5rem', textAlign: 'center' }} autoFocus />
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Join Room</button>
          </form>
        </div>
      </div>
    );
  }

  const peerList = Object.values(peers);

  return (
    <div className="workspace-container">
      {/* Top Nav */}
      <div style={{ position: 'fixed', top: '1.5rem', left: '1.5rem', zIndex: 10 }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>Virtual Office</h1>
      </div>

      {/* Join Requests */}
      {joinRequests.length > 0 && (
        <div className="request-banner">
          <Check size={20} color="var(--success)" />
          <span><strong>{joinRequests[0].peerName}</strong> is knocking...</span>
          <button onClick={() => acceptJoinRequest(joinRequests[0].peerId)} className="btn btn-primary">Accept</button>
          <button onClick={() => declineJoinRequest(joinRequests[0].peerId)} className="btn btn-ghost">Decline</button>
        </div>
      )}

      {/* Local User Card */}
      <DraggableCard initialX={100} initialY={100}>
        <div isSharing={!!localScreenStream}>
          {localScreenStream ? (
            <div className="card-screen-container">
              <div className="screen-header">
                <span>You are sharing</span>
                <button onClick={stopScreenShare} className="control-btn danger small"><MonitorOff size={14} /></button>
              </div>
              <video
                autoPlay playsInline muted
                ref={el => { if (el) el.srcObject = localScreenStream; }}
                className="card-video"
              />
            </div>
          ) : (
            <div onClick={() => setShowStatusMenu(!showStatusMenu)}>
              <div className={`peer-avatar ${!isMuted ? 'talking-pulse' : ''}`} style={{ cursor: 'pointer' }}>
                <User size={30} color={!isMuted ? 'var(--primary)' : 'var(--text-muted)'} />
                <div className={`status-indicator status-${myStatus}`} />
              </div>
              {showStatusMenu && (
                <div className="status-menu">
                  {['Available', 'Busy', 'Break'].map(s => <div key={s} className="status-option" onClick={() => setMyStatus(s)}>{s}</div>)}
                </div>
              )}
            </div>
          )}
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{name} (You)</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{myStatus}</p>
        </div>
      </DraggableCard>

      {/* Remote Peer Cards */}
      {peerList.map((peer, index) => (
        <DraggableCard key={peer.id} initialX={400 + (index * 40)} initialY={200 + (index * 40)} peerId={peer.id} onFileDrop={sendFile}>
          <div isSharing={!!peer.remoteScreenStream}>
            {peer.remoteScreenStream ? (
              <div className="card-screen-container">
                <div className="screen-header">
                  <span>{peer.name}'s Screen</span>
                </div>
                <video
                  autoPlay playsInline
                  ref={el => { if (el) el.srcObject = peer.remoteScreenStream; }}
                  className="card-video"
                />
              </div>
            ) : (
              <div className={`peer-avatar ${peer.isTalking ? 'talking-pulse' : ''}`}>
                <User size={30} color={peer.isTalking ? 'var(--primary)' : 'var(--text-muted)'} />
                <div className={`status-indicator status-${peer.status}`} />
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{peer.name}</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{peer.status}</p>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {peer.isTalking ? (
                  <button onClick={() => hangUpPeer(peer.id)} className="control-btn danger small"><PhoneOff size={16} /></button>
                ) : (
                  <button onClick={() => callPeer(peer.id)} className="btn btn-primary small">{peer.isLocked ? <Lock size={14} /> : <PhoneCall size={14} />}</button>
                )}
              </div>
            </div>
          </div>
        </DraggableCard>
      ))}

      {/* Control Bar */}
      <div className="control-bar">
        <button className={`control-btn ${!isMuted ? 'active' : ''}`} onClick={toggleMute}>{isMuted ? <MicOff size={22} /> : <Mic size={22} />}</button>
        <button className={`control-btn ${localScreenStream ? 'active' : ''}`} onClick={localScreenStream ? stopScreenShare : startScreenShare}><Monitor size={22} /></button>
        {peerList.some(p => p.isTalking) && (
          <button className={`control-btn ${isLocked ? 'danger' : ''}`} onClick={toggleLock}>{isLocked ? <Lock size={22} /> : <Unlock size={22} />}</button>
        )}
        <div style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 8px' }} />
        {['Available', 'Busy', 'Break'].map(s => <button key={s} onClick={() => setMyStatus(s)} style={{ width: '12px', height: '12px', borderRadius: '50%', background: `var(--${s === 'Available' ? 'success' : (s === 'Busy' ? 'danger' : 'warning')})`, transform: myStatus === s ? 'scale(1.4)' : 'scale(1)', transition: '0.2s', border: 'none', cursor: 'pointer' }} title={s} />)}
      </div>
    </div>
  );
}
