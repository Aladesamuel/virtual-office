import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  User, Mic, MicOff, Phone, LogOut,
  Lock, Unlock, Hand, Bell, UserRound, Clock
} from 'lucide-react';
import { useWebRTC } from '../hooks/useWebRTC';
import { ActiveCallModal } from '../components/ActiveCallModal';
import { IncomingCallNotification } from '../components/IncomingCallNotification';
import { ConnectionQuality } from '../components/ConnectionQuality';
import { DoNotDisturb } from '../components/DoNotDisturb';
import { CallHistory } from '../components/CallHistory';

export default function Room() {
  const { roomId } = useParams();
  const [joined, setJoined] = useState(false);
  const [name, setName] = useState(() => localStorage.getItem('vo_username') || '');
  const [notifications, setNotifications] = useState([]);
  const [activePeerId, setActivePeerId] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [groupCallPeers, setGroupCallPeers] = useState([]);
  const [incomingCall, setIncomingCall] = useState(null);
  const [dndEnabled, setDndEnabled] = useState(() => localStorage.getItem('vo_dnd') === 'true');
  const [showCallHistory, setShowCallHistory] = useState(false);
  const [peerConnections, setPeerConnections] = useState({});
  const callStartTime = useRef(null);

  const {
    peers, myId, myStatus, setMyStatus,
    isMuted, setIsMuted,
    isLocked, setIsLocked,
    joinRequests, acceptRequest,
    callPeer, knockPeer, hangUp,
    localStream
  } = useWebRTC(roomId, name, joined);

  // Register incoming call handler
  useEffect(() => {
    window.__handleIncomingCall = (callData) => {
      if (!dndEnabled && !activePeerId && !incomingCall) {
        setIncomingCall(callData);
      }
    };

    return () => {
      delete window.__handleIncomingCall;
    };
  }, [dndEnabled, activePeerId, incomingCall]);

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

  // Do Not Disturb handler
  useEffect(() => {
    localStorage.setItem('vo_dnd', String(dndEnabled));
  }, [dndEnabled]);

  // Handle auto-reject for DND mode
  useEffect(() => {
    if (dndEnabled && joinRequests.length > 0) {
      joinRequests.forEach(request => {
        setTimeout(() => {
          addNotification(`Missed call from ${request.name} (DND enabled)`);
        }, 100);
      });
    }
  }, [joinRequests, dndEnabled]);

  // Call duration timer
  useEffect(() => {
    const currentCallPeerId = activePeerId || incomingCall?.peerId;
    
    if (!currentCallPeerId) {
      if (callDuration > 0) {
        // Save call to history
        const peerName = peers[currentCallPeerId]?.name || 'Unknown';
        const stored = JSON.parse(localStorage.getItem('vo_call_history') || '[]');
        stored.unshift({
          id: `${Date.now()}-${Math.random()}`,
          peerName,
          duration: callDuration,
          timestamp: Date.now(),
          date: new Date().toLocaleDateString(),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        stored.splice(50);
        localStorage.setItem('vo_call_history', JSON.stringify(stored));
      }
      setCallDuration(0);
      callStartTime.current = null;
      return;
    }

    callStartTime.current = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - callStartTime.current) / 1000);
      setCallDuration(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [activePeerId, incomingCall, peers]);

  // Update timer display
  useEffect(() => {
    const timerElement = document.getElementById('call-timer');
    if (timerElement) {
      const minutes = Math.floor(callDuration / 60);
      const seconds = callDuration % 60;
      timerElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
  }, [callDuration]);

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
      <div className="room-header">
        <h1 className="room-header-title">
          OFFICE <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>/ {roomId.slice(0, 8)}</span>
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }}>
          {activePeerId && <ConnectionQuality peerConnection={peerConnections[activePeerId]} />}
          {dndEnabled && <div className="dnd-badge">DND</div>}
          <span className="room-header-status">● ONLINE</span>
        </div>
      </div>

      {/* Office Floor (Grid) */}
      <div className="office-floor">
        {/* Your Tile */}
        <div className="member-tile">
          <div className={`avatar-container ${localStream && !isMuted ? 'talking-pulse' : ''}`}>
            <User size={28} color="var(--primary)" />
            <div className={`status-dot status-${myStatus}`} />
          </div>
          <p className="member-name">{name}</p>
          <p className="member-status-text">{myStatus}</p>
        </div>

        {/* Peer Tiles */}
        {peerList.map(peer => (
          <div key={peer.id} className="member-tile">
            <div className={`avatar-container ${peer.isTalking ? 'talking-pulse' : ''}`}>
              <User size={28} color={peer.isTalking ? 'var(--primary)' : 'var(--text-muted)'} />
              <div className={`status-dot status-${peer.status || 'Available'}`} />
              {peer.isLocked && <div style={{ position: 'absolute', top: -8, right: -8, background: 'var(--oncall)', color: 'white', padding: '4px', borderRadius: '50%', display: 'flex' }}><Lock size={12} /></div>}
            </div>
            <p className="member-name">{peer.name}</p>
            <p className="member-status-text">{peer.status || 'Available'}</p>

            <div style={{ width: '100%', marginTop: '0.75rem' }}>
              {peer.status === 'OnCall' ? (
                <button onClick={() => { hangUp(peer.id); setActivePeerId(null); }} className="call-btn danger">
                  <Phone size={14} /> Hang Up
                </button>
              ) : (
                peer.isLocked ? (
                  <button onClick={() => knockPeer(peer.id)} className="call-btn">
                    <Hand size={14} /> Knock
                  </button>
                ) : (
                  <button onClick={() => { callPeer(peer.id); setActivePeerId(peer.id); }} className="call-btn">
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
        <div className="knock-notification">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <div style={{ width: '40px', height: '40px', background: 'var(--primary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Hand size={20} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0 }}>{joinRequests[0].name}</p>
              <p style={{ fontSize: '0.75rem', opacity: 0.7, margin: '2px 0 0 0' }}>is knocking...</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button onClick={() => { acceptRequest(joinRequests[0].id); setIncomingCallerId(joinRequests[0].id); }} style={{ background: 'white', color: 'var(--text-main)', padding: '8px 12px', borderRadius: '10px', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>Accept</button>
            <button onClick={() => setJoinRequests(prev => prev.slice(1))} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', padding: '8px 10px', borderRadius: '10px', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>Ignore</button>
          </div>
        </div>
      )}

      {/* Incoming Call Notification Banner */}
      {incomingCall && !activePeerId && (
        <IncomingCallNotification
          callerName={incomingCall.peerName}
          onAccept={() => {
            setActivePeerId(incomingCall.peerId);
            setIncomingCall(null);
          }}
          onDecline={() => {
            hangUp(incomingCall.peerId);
            setIncomingCall(null);
          }}
        />
      )}

      {/* Active Call Modal */}
      {(activePeerId || incomingCall) && peers[activePeerId || incomingCall?.peerId] && (
        <ActiveCallModal
          peerName={peers[activePeerId || incomingCall?.peerId].name}
          onHangUp={() => {
            const callPeerId = activePeerId || incomingCall?.peerId;
            hangUp(callPeerId);
            setActivePeerId(null);
            setIncomingCall(null);
            setGroupCallPeers([]);
          }}
          availablePeers={Object.values(peers).filter(p => p.id !== (activePeerId || incomingCall?.peerId) && !groupCallPeers.includes(p.id))}
          onAddPeer={(peerId) => {
            if (!groupCallPeers.includes(peerId)) {
              callPeer(peerId);
              setGroupCallPeers([...groupCallPeers, peerId]);
              addNotification(`${peers[peerId].name} added to call`);
            }
          }}
          isVisible={true}
        />
      )}

      {/* Floating Control Bar */}
      <div className="control-bar">
        <button
          className={`icon-btn ${!isMuted ? 'active' : ''}`}
          onClick={() => setIsMuted(!isMuted)}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
        </button>

        <div className="status-pill-group">
          {['Available', 'Busy', 'Away'].map(s => (
            <button
              key={s}
              onClick={() => setMyStatus(s)}
              className={`status-pill ${myStatus === s ? 'active' : ''}`}
            >
              {s}
            </button>
          ))}
        </div>

        <button
          className="icon-btn"
          onClick={() => setShowCallHistory(true)}
          title="Call History"
        >
          <Clock size={18} />
        </button>

        <DoNotDisturb isEnabled={dndEnabled} onChange={setDndEnabled} />

        <button
          className={`icon-btn ${isLocked ? 'active' : ''}`}
          onClick={() => setIsLocked(!isLocked)}
          title={isLocked ? "Unlock Space" : "Lock Space"}
        >
          {isLocked ? <Lock size={18} /> : <Unlock size={18} />}
        </button>

        <button className="icon-btn danger" onClick={() => setJoined(false)} title="Leave">
          <LogOut size={18} />
        </button>
      </div>

      {/* Call History Modal */}
      <CallHistory isOpen={showCallHistory} onClose={() => setShowCallHistory(false)} />
    </div>
  );
}
