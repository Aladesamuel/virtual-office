import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Mic, MicOff, UserRound, PhoneCall, PhoneOff, Lock, Unlock, Check, X,
  Monitor, FileUp, MonitorOff, User, LogOut, Coffee, Video
} from 'lucide-react';
import { useWebRTC } from '../hooks/useWebRTC';

function DraggableCard({ children, initialX, initialY, onFileDrop, peerId, scale = 1 }) {
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
      style={{
        left: pos.x, top: pos.y,
        cursor: dragging ? 'grabbing' : 'grab',
        touchAction: 'none',
        '--card-scale': scale
      }}
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
  const { roomId: urlRoomId } = useParams();
  const [joined, setJoined] = useState(false);
  const [name, setName] = useState(() => localStorage.getItem('vo_username') || '');
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [roomType, setRoomType] = useState('Lounge'); // Lounge or Conference

  // The roomId will be derived from the base URL id + the type
  const actualRoomId = `${urlRoomId}-${roomType.toLowerCase()}`;

  const {
    peers, myId, myStatus, setMyStatus, isMuted, toggleMute, isLocked, toggleLock,
    joinRequests, acceptJoinRequest, declineJoinRequest, callPeer, hangUpPeer,
    startScreenShare, stopScreenShare, localScreenStream, sendFile, error, canScreenShare
  } = useWebRTC(actualRoomId, name, joined);

  // AUTO-JOIN logic for Conference room
  useEffect(() => {
    if (roomType === 'Conference' && joined) {
      Object.keys(peers).forEach(id => {
        if (!peers[id].isTalking) {
          // In conference, we auto-call everyone to simulate immediate entry
          // But only if we are the "caller" (alphabetical ID check to avoid double calls)
          if (myId < id) callPeer(id);
        }
      });
    }
  }, [peers, roomType, joined, myId, callPeer]);

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
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
  const dynamicScale = isMobile ? Math.max(0.6, 1 - (peerList.length * 0.08)) : 1;

  // Detect active presenter
  const presenter = peerList.find(p => p.remoteScreenStream) || (localScreenStream ? { id: 'me', name: 'You', isMe: true } : null);

  const getInitialPos = (index, type) => {
    if (!isMobile) {
      if (type === 'me') return { x: 100, y: 100 };
      return { x: 400 + (index * 40), y: 200 + (index * 40) };
    }
    const bx = window.innerWidth / 2 - (110 * dynamicScale);
    const by = window.innerHeight / 2 - (70 * dynamicScale);
    return { x: bx + (index * 15), y: by + (index * 15) };
  };

  return (
    <div className="workspace-container">
      {/* Top Nav */}
      <div style={{ position: 'fixed', top: '1.5rem', left: '1.5rem', zIndex: 100 }}>
        <button className="control-btn" onClick={() => setJoined(false)} style={{ color: 'var(--danger)', marginRight: '1rem' }}><LogOut size={20} /></button>
        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>
          VO <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>/ {roomType}</span>
        </span>
      </div>

      {/* Room Toggler */}
      <div className="room-toggler">
        <button className={`room-type-btn ${roomType === 'Lounge' ? 'active' : ''}`} onClick={() => setRoomType('Lounge')}><Coffee size={16} /> Lounge</button>
        <button className={`room-type-btn ${roomType === 'Conference' ? 'active' : ''}`} onClick={() => setRoomType('Conference')}><Video size={16} /> Conference</button>
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

      {/* Lounge Layout */}
      {roomType === 'Lounge' && (
        <>
          <DraggableCard initialX={getInitialPos(0, 'me').x} initialY={getInitialPos(0, 'me').y} scale={dynamicScale}>
            <div isSharing={!!localScreenStream}>
              {localScreenStream ? (
                <div className="card-screen-container">
                  <div className="screen-header"><span>Your Screen</span><button onClick={stopScreenShare} className="control-btn danger small"><MonitorOff size={14} /></button></div>
                  <video autoPlay playsInline muted ref={el => { if (el) el.srcObject = localScreenStream; }} className="card-video" />
                </div>
              ) : (
                <div onClick={() => setShowStatusMenu(!showStatusMenu)}>
                  <div className={`peer-avatar ${!isMuted ? 'talking-pulse' : ''}`} style={{ cursor: 'pointer' }}><User size={30} color={!isMuted ? 'var(--primary)' : 'var(--text-muted)'} /><div className={`status-indicator status-${myStatus}`} /></div>
                  {showStatusMenu && <div className="status-menu">{['Available', 'Busy', 'Break'].map(s => <div key={s} className="status-option" onClick={() => setMyStatus(s)}>{s}</div>)}</div>}
                </div>
              )}
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{name} (You)</h3><p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{myStatus}</p>
            </div>
          </DraggableCard>
          {peerList.map((peer, index) => (
            <DraggableCard key={peer.id} initialX={getInitialPos(index + 1, 'peer').x} initialY={getInitialPos(index + 1, 'peer').y} peerId={peer.id} onFileDrop={sendFile} scale={dynamicScale}>
              <div isSharing={!!peer.remoteScreenStream}>
                {peer.remoteScreenStream ? (
                  <div className="card-screen-container"><div className="screen-header"><span>{peer.name}'s Screen</span></div><video autoPlay playsInline ref={el => { if (el) el.srcObject = peer.remoteScreenStream; }} className="card-video" /></div>
                ) : (
                  <div className={`peer-avatar ${peer.isTalking ? 'talking-pulse' : ''}`}><User size={30} color={peer.isTalking ? 'var(--primary)' : 'var(--text-muted)'} /><div className={`status-indicator status-${peer.status}`} /></div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{peer.name}</h3><p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{peer.status}</p></div><div style={{ display: 'flex', gap: '4px' }}>{peer.isTalking ? <button onClick={() => hangUpPeer(peer.id)} className="control-btn danger small"><PhoneOff size={16} /></button> : <button onClick={() => callPeer(peer.id)} className="btn btn-primary small">{peer.isLocked ? <Lock size={14} /> : <PhoneCall size={14} />}</button>}</div></div>
              </div>
            </DraggableCard>
          ))}
        </>
      )}

      {/* Conference Layout (Google Meet Clone) */}
      {roomType === 'Conference' && (
        <div className="conference-layout">
          {presenter ? (
            <div className="presentation-container">
              <div className="main-presentation">
                <video
                  autoPlay playsInline muted={presenter.isMe}
                  ref={el => { if (el) el.srcObject = presenter.isMe ? localScreenStream : presenter.remoteScreenStream; }}
                  className="meeting-video presentation"
                />
                <div className="tile-info"><span>{presenter.name} is presenting</span></div>
              </div>
              <div className="side-grid">
                {/* Local Tile */}
                <div className={`meeting-tile ${!isMuted ? 'active-speaker' : ''}`}>
                  <div className="tile-avatar"><User size={32} /></div>
                  <div className="tile-info">{isMuted ? <MicOff size={14} color="var(--danger)" /> : <Mic size={14} color="var(--success)" />}<span>You</span></div>
                </div>
                {/* Peer Tiles */}
                {peerList.filter(p => p.id !== presenter.id).map(peer => (
                  <div key={peer.id} className={`meeting-tile ${peer.isTalking ? 'active-speaker' : ''}`}>
                    <div className="tile-avatar"><User size={32} /></div>
                    <div className="tile-info">{!peer.isTalking ? <MicOff size={14} color="var(--danger)" /> : <Mic size={14} color="var(--success)" />}<span>{peer.name}</span></div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="conference-grid">
              {/* My Tile */}
              <div className={`meeting-tile ${!isMuted ? 'active-speaker' : ''}`}>
                <div className="tile-avatar"><User size={48} /></div>
                <div className="tile-info">{isMuted ? <MicOff size={14} color="var(--danger)" /> : <Mic size={14} color="var(--success)" />}<span>{name} (You)</span></div>
              </div>
              {/* Peer Tiles */}
              {peerList.map(peer => (
                <div key={peer.id} className={`meeting-tile ${peer.isTalking ? 'active-speaker' : ''}`}>
                  <div className="tile-avatar"><User size={48} /></div>
                  <div className="tile-info">{!peer.isTalking ? <MicOff size={14} color="var(--danger)" /> : <Mic size={14} color="var(--success)" />}<span>{peer.name}</span></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Control Bar */}
      <div className="control-bar">
        <button className={`control-btn ${!isMuted ? 'active' : ''}`} onClick={toggleMute}>{isMuted ? <MicOff size={22} /> : <Mic size={22} />}</button>
        {canScreenShare && (roomType === 'Conference' || peerList.some(p => p.isTalking)) && (
          <button className={`control-btn ${localScreenStream ? 'active' : ''}`} onClick={localScreenStream ? stopScreenShare : startScreenShare}><Monitor size={22} /></button>
        )}
        <div style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 8px' }} />
        {['Available', 'Busy', 'Break'].map(s => <button key={s} onClick={() => setMyStatus(s)} style={{ width: '12px', height: '12px', borderRadius: '50%', background: `var(--${s === 'Available' ? 'success' : (s === 'Busy' ? 'danger' : 'warning')})`, transform: myStatus === s ? 'scale(1.4)' : 'scale(1)', transition: '0.2s', border: 'none', cursor: 'pointer' }} title={s} />)}
      </div>
    </div>
  );
}
