import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Mic, MicOff, UserRound, PhoneOff, PhoneCall,
  Monitor, MonitorOff, User, LogOut, Coffee, Video, Camera, CameraOff,
} from 'lucide-react';
import { useWebRTC } from '../hooks/useWebRTC';
import { sounds } from '../utils/sounds';

// ─── Dialer Popup ─────────────────────────────────────────────────────────────
function DialerPopup({ peerList, activePeerId, dialingPeerId, onSelect, onHangUp, onClose }) {
  return (
    <>
      <div className="dialer-overlay" onClick={onClose} />
      <div className="dialer-popup">
        <div className="dialer-popup-header">
          <p className="dialer-popup-title">
            {activePeerId ? '📞 Active Call' : '☎️ Office Dialer'}
          </p>
          <button className="dialer-close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="dialer-scroll-area">
          {peerList.length === 0 ? (
            <div className="dialer-empty">
              <p>No one else is online</p>
              <p style={{ fontSize: '0.72rem', opacity: 0.6, marginTop: 4 }}>Share the room link to invite teammates</p>
            </div>
          ) : (
            peerList.map(peer => {
              const isActive = peer.id === activePeerId;
              const isDialing = peer.id === dialingPeerId;
              const isOnCall = peer.status === 'OnCall' && !isActive;
              return (
                <button
                  key={peer.id}
                  className={`dialer-row ${isActive || isDialing ? 'dialer-row-active' : ''}`}
                  onClick={() => (isActive || isDialing) ? onHangUp(peer.id) : (!isOnCall ? onSelect(peer.id) : null)}
                  disabled={isOnCall && !isActive && !isDialing}
                >
                  <div className="dialer-avatar">
                    <User size={15} />
                    <span className={`dialer-dot status-dot-${isActive || isDialing ? 'oncall' : (peer.status || 'Available')}`} />
                  </div>
                  <div className="dialer-info">
                    <span className="dialer-name">{peer.name}</span>
                    <span className="dialer-status-text">
                      {isActive ? 'On call with you' : isDialing ? 'Dialing...' : (peer.status === 'OnCall' ? 'On another call' : (peer.status || 'Available'))}
                    </span>
                  </div>
                  <div className={`dialer-action ${isActive || isDialing ? 'dialer-end' : isOnCall ? 'dialer-busy' : 'dialer-call'}`}>
                    {isActive || isDialing ? <><PhoneOff size={13} /> {isActive ? 'End' : 'Cancel'}</> : isOnCall ? 'Busy' : <><PhoneCall size={13} /> Dial</>}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

// ─── Draggable Card ───────────────────────────────────────────────────────────
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

// ─── Main Room ────────────────────────────────────────────────────────────────
export default function Room() {
  const { roomId: urlRoomId } = useParams();
  const [joined, setJoined] = useState(false);
  const [name, setName] = useState(() => localStorage.getItem('vo_username') || '');
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [roomType, setRoomType] = useState('Lounge');
  const [showDialer, setShowDialer] = useState(false);
  const [activePeerId, setActivePeerId] = useState(null);
  const [dialingPeerId, setDialingPeerId] = useState(null);
  const prevStatus = useRef('Available');

  const actualRoomId = `${urlRoomId}-${roomType.toLowerCase()}`;

  const {
    peers, myId, myStatus, setMyStatus, isMuted, toggleMute,
    joinRequests, acceptJoinRequest, declineJoinRequest, callPeer, hangUpPeer, ringPeer,
    startScreenShare, stopScreenShare, localScreenStream, sendFile, error, canScreenShare,
    isVideoEnabled, toggleVideo, localVideoStream
  } = useWebRTC(actualRoomId, name, joined, {
    onCallAccepted: (id) => {
      setDialingPeerId(prev => {
        if (prev === id) {
          setActivePeerId(id);
          return null;
        }
        return prev;
      });
    },
    onCallDeclined: (id) => {
      setDialingPeerId(prev => (prev === id ? null : prev));
    },
    onCallCanceled: (id) => {
      setActivePeerId(prev => (prev === id ? null : prev));
      setDialingPeerId(prev => (prev === id ? null : prev));
    }
  });

  // Sound Hooks
  useEffect(() => {
    if (dialingPeerId) sounds.playDialTone();
    else sounds.stopDialTone();
    return () => sounds.stopDialTone();
  }, [dialingPeerId]);

  useEffect(() => {
    if (joinRequests.length > 0) sounds.playRingTone();
    else sounds.stopRingTone();
    return () => sounds.stopRingTone();
  }, [joinRequests.length]);

  // AUTO Status: OnCall / restore
  useEffect(() => {
    if (activePeerId || dialingPeerId) {
      if (myStatus !== 'OnCall') prevStatus.current = myStatus;
      setMyStatus('OnCall');
    } else {
      if (myStatus === 'OnCall') setMyStatus(prevStatus.current);
    }
  }, [activePeerId, dialingPeerId]);

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

  const handleJoin = e => {
    e.preventDefault();
    if (name.trim()) { localStorage.setItem('vo_username', name); setJoined(true); }
  };

  const handleDial = id => {
    ringPeer(id);
    setDialingPeerId(id);
    setShowDialer(false);
  };

  const handleHangUp = id => {
    hangUpPeer(id);
    setActivePeerId(null);
    setDialingPeerId(null);
    setShowDialer(false);
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
  const activePeer = activePeerId ? peers[activePeerId] : null;

  const getInitialPos = (index, type) => {
    if (!isMobile) {
      if (type === 'me') return { x: 100, y: 120 };
      return { x: 420 + (index * 50), y: 120 + (index * 30) };
    }
    const bx = window.innerWidth / 2 - (110 * dynamicScale);
    const by = window.innerHeight / 2 - (70 * dynamicScale);
    return { x: bx + (index * 15), y: by + (index * 15) };
  };

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
          <span className="request-banner-text"><strong>{joinRequests[0].peerName}</strong> is calling...</span>
          <div className="request-banner-actions">
            <button onClick={() => { acceptJoinRequest(joinRequests[0].peerId); setActivePeerId(joinRequests[0].peerId); }} className="btn btn-primary">
              <PhoneCall size={14} /> Answer
            </button>
            <button onClick={() => declineJoinRequest(joinRequests[0].peerId)} className="btn btn-ghost">Decline</button>
          </div>
        </div>
      )}

      {/* Active/Dialing Call Indicator */}
      {(activePeerId || dialingPeerId) && (
        <div className="active-call-pill">
          {activePeerId ? <div className="call-dot-anim" /> : <div className="incoming-call-ring" style={{ width: 8, height: 8 }} />}
          <span>{dialingPeerId ? `Dialing ` : `In call with `}<strong>{peers[activePeerId || dialingPeerId]?.name}</strong></span>
          <button className="end-call-mini" onClick={() => handleHangUp(activePeerId || dialingPeerId)}>
            <PhoneOff size={14} />
          </button>
        </div>
      )}

      {/* LOUNGE */}
      {roomType === 'Lounge' && (
        <>
          <DraggableCard initialX={getInitialPos(0, 'me').x} initialY={getInitialPos(0, 'me').y} scale={dynamicScale}>
            <div>
              {localScreenStream ? (
                <div className="card-screen-container">
                  <div className="screen-header"><span>Your Screen</span><button onClick={stopScreenShare} className="control-btn danger small"><MonitorOff size={14} /></button></div>
                  <video autoPlay playsInline muted ref={el => { if (el) el.srcObject = localScreenStream; }} className="card-video" />
                </div>
              ) : isVideoEnabled ? (
                <div className="card-screen-container">
                  <video autoPlay playsInline muted ref={el => { if (el) el.srcObject = localVideoStream; }} className="card-video mirrored" />
                </div>
              ) : (
                <div onClick={() => setShowStatusMenu(!showStatusMenu)} style={{ position: 'relative' }}>
                  <div className={`peer-avatar ${activePeer && !isMuted ? 'talking-pulse' : ''}`} style={{ cursor: 'pointer' }}>
                    <User size={30} color={activePeer && !isMuted ? 'var(--primary)' : 'var(--text-muted)'} />
                    <div className={`status-indicator status-${myStatus}`} />
                  </div>
                  {showStatusMenu && (
                    <div className="status-menu">
                      {['Available', 'Busy', 'Break'].map(s => (
                        <div key={s} className="status-option" onClick={() => { setMyStatus(s); prevStatus.current = s; setShowStatusMenu(false); }}>{s}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginTop: '0.5rem' }}>{name} <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.8rem' }}>(You)</span></h3>
              <p style={{ fontSize: '0.75rem', color: myStatus === 'OnCall' ? 'var(--oncall)' : 'var(--text-muted)', fontWeight: myStatus === 'OnCall' ? 700 : 400 }}>{myStatus}</p>
            </div>
          </DraggableCard>

          {peerList.map((peer, index) => (
            <DraggableCard key={peer.id} initialX={getInitialPos(index + 1, 'peer').x} initialY={getInitialPos(index + 1, 'peer').y} peerId={peer.id} onFileDrop={sendFile} scale={dynamicScale}>
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
                <p style={{ fontSize: '0.75rem', color: peer.id === activePeerId || peer.status === 'OnCall' ? 'var(--oncall)' : 'var(--text-muted)', fontWeight: peer.id === activePeerId ? 700 : 400 }}>
                  {peer.id === activePeerId ? '📞 On call' : (peer.status === 'OnCall' ? 'On a call' : (peer.status || 'Available'))}
                </p>
              </div>
            </DraggableCard>
          ))}
        </>
      )}

      {/* CONFERENCE */}
      {roomType === 'Conference' && (
        <div className="conference-layout">
          {presenter ? (
            <div className="presentation-container">
              <div className="main-presentation">
                <video autoPlay playsInline muted={presenter.isMe}
                  ref={el => { if (el) el.srcObject = presenter.isMe ? localScreenStream : presenter.remoteScreenStream; }}
                  className="meeting-video presentation" />
                <div className="tile-info"><span>{presenter.name} is presenting</span></div>
              </div>
              <div className="side-grid">
                <div className={`meeting-tile ${!isMuted ? 'active-speaker' : ''}`}>
                  {isVideoEnabled ? <video autoPlay playsInline muted ref={el => { if (el) el.srcObject = localVideoStream; }} className="meeting-video mirrored" /> : <div className="tile-avatar"><User size={24} /></div>}
                  <div className="tile-info">{isMuted ? <MicOff size={12} color="var(--danger)" /> : <Mic size={12} color="var(--success)" />}<span>You</span></div>
                </div>
                {peerList.filter(p => !p.remoteScreenStream).map(peer => (
                  <div key={peer.id} className={`meeting-tile ${peer.isTalking ? 'active-speaker' : ''}`}>
                    {peer.remoteVideoStream ? <video autoPlay playsInline ref={el => { if (el) el.srcObject = peer.remoteVideoStream; }} className="meeting-video" /> : <div className="tile-avatar"><User size={24} /></div>}
                    <div className="tile-info">{!peer.isTalking ? <MicOff size={12} color="var(--danger)" /> : <Mic size={12} color="var(--success)" />}<span>{peer.name}</span></div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="conference-grid">
              <div className={`meeting-tile ${!isMuted ? 'active-speaker' : ''}`}>
                {isVideoEnabled ? <video autoPlay playsInline muted ref={el => { if (el) el.srcObject = localVideoStream; }} className="meeting-video mirrored" /> : <div className="tile-avatar"><User size={48} /></div>}
                <div className="tile-info">{isMuted ? <MicOff size={14} color="var(--danger)" /> : <Mic size={14} color="var(--success)" />}<span>{name} (You)</span></div>
              </div>
              {peerList.map(peer => (
                <div key={peer.id} className={`meeting-tile ${peer.isTalking ? 'active-speaker' : ''}`}>
                  {peer.remoteScreenStream ? <video autoPlay playsInline ref={el => { if (el) el.srcObject = peer.remoteScreenStream; }} className="meeting-video" /> : peer.remoteVideoStream ? <video autoPlay playsInline ref={el => { if (el) el.srcObject = peer.remoteVideoStream; }} className="meeting-video" /> : <div className="tile-avatar"><User size={48} /></div>}
                  <div className="tile-info">{!peer.isTalking ? <MicOff size={14} color="var(--danger)" /> : <Mic size={14} color="var(--success)" />}<span>{peer.name}</span></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Control Bar ── */}
      <div className="control-bar">

        {/* Dialer (Lounge only) */}
        {roomType === 'Lounge' && (
          <>
            {showDialer && (
              <DialerPopup
                peerList={peerList}
                activePeerId={activePeerId}
                dialingPeerId={dialingPeerId}
                onSelect={handleDial}
                onHangUp={handleHangUp}
                onClose={() => setShowDialer(false)}
              />
            )}
            <button
              className={`dialer-toggle ${activePeerId || dialingPeerId ? 'dialer-toggle-active' : ''}`}
              onClick={() => setShowDialer(prev => !prev)}
              title="Office Dialer"
            >
              <div className={`dialer-knob ${activePeerId || dialingPeerId ? 'dialer-knob-right' : ''}`}>
                <PhoneCall size={16} />
              </div>
              <span className="dialer-label">
                {activePeerId ? (peers[activePeerId]?.name || 'On call') : dialingPeerId ? 'Dialing' : 'Dial'}
              </span>
            </button>
          </>
        )}

        {/* Mute (only visible while on a lounge call OR in conference) */}
        {(activePeerId || roomType === 'Conference') && (
          <button className={`control-btn ${!isMuted ? 'active' : ''}`} onClick={toggleMute}>
            {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
          </button>
        )}

        <button className={`control-btn ${isVideoEnabled ? 'active' : ''}`} onClick={toggleVideo}>
          {isVideoEnabled ? <Camera size={22} /> : <CameraOff size={22} />}
        </button>

        {canScreenShare && (roomType === 'Conference' || activePeerId) && (
          <button className={`control-btn ${localScreenStream ? 'active' : ''}`} onClick={localScreenStream ? stopScreenShare : startScreenShare}>
            <Monitor size={22} />
          </button>
        )}

        <button className="control-btn" onClick={() => setJoined(false)} style={{ color: 'var(--danger)', marginLeft: '0.5rem' }}>
          <LogOut size={22} />
        </button>

        <div style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 8px' }} />
        {['Available', 'Busy', 'Break'].map(s => (
          <button key={s} onClick={() => { prevStatus.current = s; setMyStatus(s); }}
            style={{ width: '12px', height: '12px', borderRadius: '50%', background: `var(--${s === 'Available' ? 'success' : (s === 'Busy' ? 'danger' : 'warning')})`, transform: myStatus === s ? 'scale(1.4)' : 'scale(1)', transition: '0.2s', border: 'none', cursor: 'pointer' }}
            title={s}
          />
        ))}
      </div>
    </div>
  );
}
