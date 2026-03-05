import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Mic, MicOff, UserRound, PhoneOff, Lock,
  Monitor, MonitorOff, User, LogOut, Coffee, Video, Camera, CameraOff,
  ChevronUp, Users
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
  const onDragOver = e => { e.preventDefault(); setIsOver(true); };
  const onDragLeave = () => setIsOver(false);
  const onDrop = e => {
    e.preventDefault(); setIsOver(false);
    if (!onFileDrop || !peerId) return;
    const file = e.dataTransfer.files[0];
    if (file) onFileDrop(peerId, file);
  };

  return (
    <div
      className={`peer-card ${isOver ? 'file-over' : ''}`}
      style={{ left: pos.x, top: pos.y, cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none', '--card-scale': scale }}
      onMouseDown={handleMouseDown} onTouchStart={handleTouchStart}
      onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
    >
      {children}
    </div>
  );
}

// ─── Peer Selector Popover ────────────────────────────────────────────────────
function PeerSelector({ peerList, activePeerId, onSelect, onHangUp, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('touchstart', handler); };
  }, [onClose]);

  return (
    <div className="peer-selector" ref={ref}>
      <div className="peer-selector-arrow" />
      <p className="peer-selector-label">
        {activePeerId ? 'On a call' : 'Who do you want to talk to?'}
      </p>
      {peerList.length === 0 && (
        <p className="peer-selector-empty">No one else is online yet</p>
      )}
      {peerList.map(peer => {
        const isActive = peer.id === activePeerId;
        return (
          <button
            key={peer.id}
            className={`peer-selector-row ${isActive ? 'active' : ''}`}
            onClick={() => isActive ? onHangUp(peer.id) : onSelect(peer.id)}
          >
            <div className="selector-avatar">
              <User size={16} />
              <span className="online-dot-sm" />
            </div>
            <div className="selector-info">
              <span className="selector-name">{peer.name}</span>
              <span className="selector-status">{isActive ? 'On call with you' : (peer.isTalking ? 'In another call' : (peer.status || 'Available'))}</span>
            </div>
            <div className={`selector-action-pill ${isActive ? 'end' : 'call'}`}>
              {isActive ? <><PhoneOff size={12} /> End</> : <><Mic size={12} /> Call</>}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Main Room Component ──────────────────────────────────────────────────────
export default function Room() {
  const { roomId: urlRoomId } = useParams();
  const [joined, setJoined] = useState(false);
  const [name, setName] = useState(() => localStorage.getItem('vo_username') || '');
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [roomType, setRoomType] = useState('Lounge');
  const [showPeerSelector, setShowPeerSelector] = useState(false);
  const [activePeerId, setActivePeerId] = useState(null); // who we're calling

  const actualRoomId = `${urlRoomId}-${roomType.toLowerCase()}`;

  const {
    peers, myId, myStatus, setMyStatus, isMuted, toggleMute, isLocked, toggleLock,
    joinRequests, acceptJoinRequest, declineJoinRequest, callPeer, hangUpPeer,
    startScreenShare, stopScreenShare, localScreenStream, sendFile, error, canScreenShare,
    isVideoEnabled, toggleVideo, localVideoStream
  } = useWebRTC(actualRoomId, name, joined);

  // Conference: auto-call all peers
  useEffect(() => {
    if (roomType === 'Conference' && joined) {
      Object.keys(peers).forEach(id => {
        if (!peers[id].isTalking && myId < id) callPeer(id);
      });
    }
  }, [peers, roomType, joined, myId, callPeer]);

  // If active peer disconnects, clear state
  useEffect(() => {
    if (activePeerId && !peers[activePeerId]) {
      setActivePeerId(null);
    }
  }, [peers, activePeerId]);

  const handleJoin = (e) => {
    e.preventDefault();
    if (name.trim()) { localStorage.setItem('vo_username', name); setJoined(true); }
  };

  const handleSelectPeer = (id) => {
    setActivePeerId(id);
    callPeer(id);
    setShowPeerSelector(false);
  };

  const handleHangUp = (id) => {
    hangUpPeer(id);
    setActivePeerId(null);
    setShowPeerSelector(false);
  };

  // Clicking the mic button:
  // - If no one selected yet → open selector
  // - If on a call → toggle mute as normal
  const handleMicClick = () => {
    if (activePeerId) {
      toggleMute();
    } else {
      setShowPeerSelector(prev => !prev);
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
          <form onSubmit={handleJoin}>
            <input type="text" placeholder="Display name" value={name} onChange={e => setName(e.target.value)}
              style={{ width: '100%', border: '1px solid var(--border)', padding: '1rem', borderRadius: '16px', marginBottom: '1.5rem', textAlign: 'center', fontFamily: 'inherit', outline: 'none' }} autoFocus />
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Join Room</button>
          </form>
        </div>
      </div>
    );
  }

  const peerList = Object.values(peers);
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
  const dynamicScale = isMobile ? Math.max(0.4, 1 - (peerList.length * 0.12)) : 1;
  const presenter = peerList.find(p => p.remoteScreenStream) || (localScreenStream ? { id: 'me', name: 'You', isMe: true } : null);

  const getInitialPos = (index, type) => {
    if (!isMobile) {
      if (type === 'me') return { x: 100, y: 120 };
      return { x: 420 + (index * 50), y: 120 + (index * 30) };
    }
    const bx = window.innerWidth / 2 - (110 * dynamicScale);
    const by = window.innerHeight / 2 - (70 * dynamicScale);
    return { x: bx + (index * 15), y: by + (index * 15) };
  };

  const activePeer = activePeerId ? peers[activePeerId] : null;

  return (
    <div className="workspace-container">
      {/* Top Nav */}
      <div style={{ position: 'fixed', top: '1.5rem', left: '1.5rem', zIndex: 100 }}>
        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>
          VO <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>/ {roomType}</span>
        </span>
      </div>

      {/* Room Toggler */}
      <div className="room-toggler">
        <button className={`room-type-btn ${roomType === 'Lounge' ? 'active' : ''}`} onClick={() => setRoomType('Lounge')}>
          <Coffee size={16} /><span className="room-btn-text">Lounge</span>
        </button>
        <button className={`room-type-btn ${roomType === 'Conference' ? 'active' : ''}`} onClick={() => setRoomType('Conference')}>
          <Video size={16} /><span className="room-btn-text">Conference</span>
          <span className="beta-tag">Beta</span>
        </button>
      </div>

      {/* Incoming Call Banner */}
      {joinRequests.length > 0 && (
        <div className="request-banner">
          <div className="incoming-call-ring" />
          <span><strong>{joinRequests[0].peerName}</strong> is calling...</span>
          <button onClick={() => { acceptJoinRequest(joinRequests[0].peerId); setActivePeerId(joinRequests[0].peerId); }} className="btn btn-primary">
            <Mic size={14} /> Answer
          </button>
          <button onClick={() => declineJoinRequest(joinRequests[0].peerId)} className="btn btn-ghost">Decline</button>
        </div>
      )}

      {/* Active Call Pill (top of screen) */}
      {activePeer && (
        <div className="active-call-pill">
          <div className="call-dot-anim" />
          <span>In call with <strong>{activePeer.name}</strong></span>
          <button className="end-call-mini" onClick={() => handleHangUp(activePeerId)}>
            <PhoneOff size={14} />
          </button>
        </div>
      )}

      {/* ============================
          LOUNGE – Draggable Cards
      ============================ */}
      {roomType === 'Lounge' && (
        <>
          {/* My Card */}
          <DraggableCard initialX={getInitialPos(0, 'me').x} initialY={getInitialPos(0, 'me').y} scale={dynamicScale}>
            <div>
              {localScreenStream ? (
                <div className="card-screen-container">
                  <div className="screen-header">
                    <span>Your Screen</span>
                    <button onClick={stopScreenShare} className="control-btn danger small"><MonitorOff size={14} /></button>
                  </div>
                  <video autoPlay playsInline muted ref={el => { if (el) el.srcObject = localScreenStream; }} className="card-video" />
                </div>
              ) : isVideoEnabled ? (
                <div className="card-screen-container">
                  <video autoPlay playsInline muted ref={el => { if (el) el.srcObject = localVideoStream; }} className="card-video mirrored" />
                </div>
              ) : (
                <div onClick={() => setShowStatusMenu(!showStatusMenu)} style={{ position: 'relative' }}>
                  <div className={`peer-avatar ${!isMuted && activePeer ? 'talking-pulse' : ''}`} style={{ cursor: 'pointer' }}>
                    <User size={30} color={activePeer && !isMuted ? 'var(--primary)' : 'var(--text-muted)'} />
                    <div className={`status-indicator status-${myStatus}`} />
                  </div>
                  {showStatusMenu && (
                    <div className="status-menu">
                      {['Available', 'Busy', 'Break'].map(s => (
                        <div key={s} className="status-option" onClick={() => setMyStatus(s)}>{s}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginTop: '0.5rem' }}>{name} <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.8rem' }}>(You)</span></h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{myStatus}</p>
            </div>
          </DraggableCard>

          {/* Peer Cards — presence only, no call buttons */}
          {peerList.map((peer, index) => (
            <DraggableCard key={peer.id}
              initialX={getInitialPos(index + 1, 'peer').x}
              initialY={getInitialPos(index + 1, 'peer').y}
              peerId={peer.id} onFileDrop={sendFile} scale={dynamicScale}
            >
              <div>
                {peer.remoteScreenStream ? (
                  <div className="card-screen-container">
                    <div className="screen-header"><span>{peer.name}'s Screen</span></div>
                    <video autoPlay playsInline ref={el => { if (el) el.srcObject = peer.remoteScreenStream; }} className="card-video" />
                  </div>
                ) : peer.remoteVideoStream ? (
                  <div className="card-screen-container">
                    <video autoPlay playsInline ref={el => { if (el) el.srcObject = peer.remoteVideoStream; }} className="card-video" />
                  </div>
                ) : (
                  <div className={`peer-avatar ${peer.id === activePeerId ? 'talking-pulse' : ''}`}>
                    <User size={30} color={peer.id === activePeerId ? 'var(--primary)' : 'var(--text-muted)'} />
                    <div className={`status-indicator status-${peer.status || 'Available'}`} />
                  </div>
                )}
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginTop: '0.5rem' }}>{peer.name}</h3>
                <p style={{ fontSize: '0.75rem', color: peer.id === activePeerId ? 'var(--primary)' : 'var(--text-muted)', fontWeight: peer.id === activePeerId ? 700 : 400 }}>
                  {peer.id === activePeerId ? '🔊 On call' : (peer.isTalking ? 'In a call' : (peer.status || 'Available'))}
                </p>
              </div>
            </DraggableCard>
          ))}
        </>
      )}

      {/* ============================
          CONFERENCE – Google Meet Grid
      ============================ */}
      {roomType === 'Conference' && (
        <div className="conference-layout">
          {presenter ? (
            <div className="presentation-container">
              <div className="main-presentation">
                <video autoPlay playsInline muted={presenter.isMe}
                  ref={el => { if (el) el.srcObject = presenter.isMe ? localScreenStream : presenter.remoteScreenStream; }}
                  className="meeting-video presentation"
                />
                <div className="tile-info"><span>{presenter.name} is presenting</span></div>
              </div>
              <div className="side-grid">
                <div className={`meeting-tile ${!isMuted ? 'active-speaker' : ''}`}>
                  {isVideoEnabled
                    ? <video autoPlay playsInline muted ref={el => { if (el) el.srcObject = localVideoStream; }} className="meeting-video mirrored" />
                    : <div className="tile-avatar"><User size={24} /></div>}
                  <div className="tile-info">{isMuted ? <MicOff size={12} color="var(--danger)" /> : <Mic size={12} color="var(--success)" />}<span>You</span></div>
                </div>
                {peerList.filter(p => !p.remoteScreenStream).map(peer => (
                  <div key={peer.id} className={`meeting-tile ${peer.isTalking ? 'active-speaker' : ''}`}>
                    {peer.remoteVideoStream
                      ? <video autoPlay playsInline ref={el => { if (el) el.srcObject = peer.remoteVideoStream; }} className="meeting-video" />
                      : <div className="tile-avatar"><User size={24} /></div>}
                    <div className="tile-info">{!peer.isTalking ? <MicOff size={12} color="var(--danger)" /> : <Mic size={12} color="var(--success)" />}<span>{peer.name}</span></div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="conference-grid">
              <div className={`meeting-tile ${!isMuted ? 'active-speaker' : ''}`}>
                {isVideoEnabled
                  ? <video autoPlay playsInline muted ref={el => { if (el) el.srcObject = localVideoStream; }} className="meeting-video mirrored" />
                  : <div className="tile-avatar"><User size={48} /></div>}
                <div className="tile-info">{isMuted ? <MicOff size={14} color="var(--danger)" /> : <Mic size={14} color="var(--success)" />}<span>{name} (You)</span></div>
              </div>
              {peerList.map(peer => (
                <div key={peer.id} className={`meeting-tile ${peer.isTalking ? 'active-speaker' : ''}`}>
                  {peer.remoteScreenStream
                    ? <video autoPlay playsInline ref={el => { if (el) el.srcObject = peer.remoteScreenStream; }} className="meeting-video" />
                    : peer.remoteVideoStream
                      ? <video autoPlay playsInline ref={el => { if (el) el.srcObject = peer.remoteVideoStream; }} className="meeting-video" />
                      : <div className="tile-avatar"><User size={48} /></div>}
                  <div className="tile-info">{!peer.isTalking ? <MicOff size={14} color="var(--danger)" /> : <Mic size={14} color="var(--success)" />}<span>{peer.name}</span></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================
          Control Bar
      ============================ */}
      <div className="control-bar" style={{ position: 'relative' }}>

        {/* Peer Selector Popover */}
        {showPeerSelector && roomType === 'Lounge' && (
          <PeerSelector
            peerList={peerList}
            activePeerId={activePeerId}
            onSelect={handleSelectPeer}
            onHangUp={handleHangUp}
            onClose={() => setShowPeerSelector(false)}
          />
        )}

        {/* Mic Button Group */}
        <div className="mic-group">
          <button
            className={`control-btn ${!isMuted && activePeer ? 'active' : ''} ${!activePeer && roomType === 'Lounge' ? 'mic-idle' : ''}`}
            onClick={handleMicClick}
            title={activePeer ? (isMuted ? 'Unmute' : 'Mute') : 'Select who to call'}
          >
            {isMuted || !activePeer ? <MicOff size={22} /> : <Mic size={22} />}
          </button>

          {/* Chevron to open selector in Lounge */}
          {roomType === 'Lounge' && (
            <button
              className={`chevron-btn ${showPeerSelector ? 'open' : ''}`}
              onClick={() => setShowPeerSelector(prev => !prev)}
              title="Select contact"
            >
              <ChevronUp size={14} />
            </button>
          )}
        </div>

        <button className={`control-btn ${isVideoEnabled ? 'active' : ''}`} onClick={toggleVideo}>
          {isVideoEnabled ? <Camera size={22} /> : <CameraOff size={22} />}
        </button>

        {canScreenShare && (roomType === 'Conference' || activePeer) && (
          <button className={`control-btn ${localScreenStream ? 'active' : ''}`} onClick={localScreenStream ? stopScreenShare : startScreenShare}>
            <Monitor size={22} />
          </button>
        )}

        <button className="control-btn" onClick={() => setJoined(false)} style={{ color: 'var(--danger)', marginLeft: '0.5rem' }}>
          <LogOut size={22} />
        </button>

        <div style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 8px' }} />
        {['Available', 'Busy', 'Break'].map(s => (
          <button key={s} onClick={() => setMyStatus(s)}
            style={{ width: '12px', height: '12px', borderRadius: '50%', background: `var(--${s === 'Available' ? 'success' : (s === 'Busy' ? 'danger' : 'warning')})`, transform: myStatus === s ? 'scale(1.4)' : 'scale(1)', transition: '0.2s', border: 'none', cursor: 'pointer' }}
            title={s}
          />
        ))}
      </div>
    </div>
  );
}
