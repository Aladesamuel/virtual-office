import { useState, useEffect, useRef, useCallback } from 'react';
import mqtt from 'mqtt';

// Global WebRTC Configuration (STUN servers help bypass NAT)
const pcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
    ],
    iceCandidatePoolSize: 10
};

export function useWebRTC(roomId, userName, isJoined, callbacks = {}) {
    const callbacksRef = useRef(callbacks);
    useEffect(() => { callbacksRef.current = callbacks; }, [callbacks]);

    const [peers, setPeers] = useState({});
    const [sessionStartTime] = useState(() => Date.now());
    const [myId] = useState(() => {
        const saved = localStorage.getItem('vo_myid');
        if (saved) return saved;
        const newId = `u_${Math.random().toString(36).substr(2, 6)}`;
        localStorage.setItem('vo_myid', newId);
        return newId;
    });
    const [error, setError] = useState(null);
    const [myStatus, setMyStatus] = useState('Available');
    const [isMuted, setIsMuted] = useState(true);
    const [isLocked, setIsLocked] = useState(false);
    const [joinRequests, setJoinRequests] = useState([]);

    const [localScreenStream, setLocalScreenStream] = useState(null);
    const [localVideoStream, setLocalVideoStream] = useState(null);
    const [isVideoEnabled, setIsVideoEnabled] = useState(false);
    const [incomingFile, setIncomingFile] = useState(null);

    const mqttRef = useRef(null);
    const localStreamRef = useRef(null);
    const peerConnections = useRef({});
    const dataChannels = useRef({});
    const signalsQueue = useRef({});

    // 1. Media Setup
    useEffect(() => {
        if (!isJoined) return;

        navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
            video: isVideoEnabled ? { width: 1280, height: 720, frameRate: 24 } : false
        })
            .then(stream => {
                localStreamRef.current = stream;
                stream.getAudioTracks().forEach(t => t.enabled = !isMuted);

                if (isVideoEnabled) {
                    setLocalVideoStream(stream);
                } else {
                    setLocalVideoStream(null);
                }

                // Push new tracks to existing connections
                Object.values(peerConnections.current).forEach(pc => {
                    stream.getTracks().forEach(track => {
                        const senders = pc.getSenders();
                        const sender = senders.find(s => s.track?.kind === track.kind);
                        if (!sender) {
                            pc.addTrack(track, stream);
                        } else {
                            sender.replaceTrack(track);
                        }
                    });
                });
            })
            .catch(err => {
                console.error("[WebRTC] Media Error:", err);
                if (isVideoEnabled) {
                    setIsVideoEnabled(false);
                    setError("Camera not found or access denied.");
                } else {
                    setError("Microphone required for workspace.");
                }
            });

        return () => {
            if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
        };
    }, [isJoined, isVideoEnabled]);

    const setupDataChannel = useCallback((peerId, channel) => {
        channel.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'file-start') {
                setIncomingFile({ name: data.name, size: data.size, progress: 0, fromId: peerId });
            }
        };
        dataChannels.current[peerId] = channel;
    }, []);

    const getPeerConnection = useCallback((remoteId) => {
        if (peerConnections.current[remoteId]) return peerConnections.current[remoteId];

        const pc = new RTCPeerConnection(pcConfig);
        peerConnections.current[remoteId] = pc;
        signalsQueue.current[remoteId] = [];

        const dc = pc.createDataChannel('office-data', { negotiated: true, id: 0 });
        setupDataChannel(remoteId, dc);

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current));
        }
        if (localScreenStream) {
            localScreenStream.getTracks().forEach(t => pc.addTrack(t, localScreenStream));
        }

        pc.onicecandidate = (e) => {
            if (e.candidate && mqttRef.current) {
                mqttRef.current.publish(`vo/room/${roomId}/${remoteId}/sig`, JSON.stringify({
                    type: 'ice', from: myId, candidate: e.candidate
                }));
            }
        };

        pc.onnegotiationneeded = async () => {
            try {
                if (pc.signalingState !== 'stable') return;
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                mqttRef.current.publish(`vo/room/${roomId}/${remoteId}/sig`, JSON.stringify({
                    type: 'off', from: myId, sdp: offer
                }));
            } catch (e) { console.warn("[WebRTC] Negotiation Error", e); }
        };

        pc.onconnectionstatechange = () => {
            console.log(`[WebRTC] PC State (${remoteId}):`, pc.connectionState);
            if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                // Try to recover once if it just disconnected
                if (pc.iceConnectionState === 'disconnected') {
                    pc.restartIce().catch(e => console.warn("[WebRTC] ICE Restart Failed", e));
                }
            }
            if (pc.connectionState === 'closed') {
                setPeers(prev => { const n = { ...prev }; delete n[remoteId]; return n; });
            }
        };

        pc.ontrack = (event) => {
            const stream = event.streams[0] || new MediaStream([event.track]);
            const isVideo = event.track.kind === 'video';
            const label = event.track.label.toLowerCase();
            const isScreen = label.includes('screen') || label.includes('monitor') || label.includes('display');

            setPeers(prev => {
                const peer = prev[remoteId] || {};
                // Only update if state actually changed to avoid re-renders
                if (peer[isVideo ? (isScreen ? 'remoteScreenStream' : 'remoteVideoStream') : 'remoteAudioStream'] === stream) return prev;

                return {
                    ...prev,
                    [remoteId]: {
                        ...peer,
                        [isVideo ? (isScreen ? 'remoteScreenStream' : 'remoteVideoStream') : 'remoteAudioStream']: stream
                    }
                };
            });

            // Remote VAD
            if (!isVideo) {
                try {
                    const AudioCtx = window.AudioContext || window.webkitAudioContext;
                    const audioContext = new AudioCtx();
                    const source = audioContext.createMediaStreamSource(stream);
                    const analyzer = audioContext.createAnalyser();
                    source.connect(analyzer);
                    const dataArray = new Uint8Array(analyzer.frequencyBinCount);
                    const check = () => {
                        if (!peerConnections.current[remoteId] || pc.connectionState === 'closed') {
                            audioContext.close().catch(() => { });
                            return;
                        }
                        analyzer.getByteFrequencyData(dataArray);
                        const avg = dataArray.reduce((p, c) => p + c, 0) / dataArray.length;
                        const isTalking = avg > 10;
                        setPeers(prev => (prev[remoteId]?.isTalking === isTalking ? prev : { ...prev, [remoteId]: { ...prev[remoteId], isTalking } }));
                        setTimeout(check, 250);
                    };
                    check();
                } catch (e) { }
            }
        };

        return pc;
    }, [roomId, myId, setupDataChannel, localScreenStream, pcConfig]); // Add pcConfig to deps for safety

    const flushCandidates = useCallback(async (peerId) => {
        const pc = peerConnections.current[peerId];
        if (!pc || !pc.remoteDescription) return;
        while (signalsQueue.current[peerId]?.length > 0) {
            const candidate = signalsQueue.current[peerId].shift();
            try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) { }
        }
    }, []);

    // Signaling
    useEffect(() => {
        if (!isJoined || !roomId) return;
        setPeers({});

        const client = mqtt.connect('wss://broker.emqx.io:8084/mqtt', { clientId: `vo_${myId}`, clean: true });
        mqttRef.current = client;

        client.on('connect', () => {
            client.subscribe(`vo/room/${roomId}/+/pres`);
            client.subscribe(`vo/room/${roomId}/${myId}/sig`);
            client.publish(`vo/room/${roomId}/${myId}/pres`, JSON.stringify({
                id: myId, name: userName, status: myStatus, isLocked, isSharing: !!localScreenStream, sessionStartTime
            }), { retain: true, qos: 1 });
        });

        client.on('message', async (topic, message) => {
            const msgStr = message.toString();
            if (topic.endsWith('/pres')) {
                const remoteId = topic.split('/')[3];
                if (remoteId === myId) return;
                if (!msgStr) {
                    setPeers(prev => { const n = { ...prev }; delete n[remoteId]; return n; });
                    return;
                }
                const payload = JSON.parse(msgStr);
                setPeers(prev => ({ ...prev, [remoteId]: { ...prev[remoteId], ...payload, lastSeen: Date.now() } }));
            }

            if (topic.endsWith('/sig')) {
                const payload = JSON.parse(msgStr);
                const pc = getPeerConnection(payload.from);
                try {
                    if (payload.type === 'req') setJoinRequests(prev => prev.find(r => r.peerId === payload.from) ? prev : [...prev, { peerId: payload.from, peerName: payload.name }]);
                    else if (payload.type === 'cancel') {
                        setJoinRequests(prev => prev.filter(r => r.peerId !== payload.from));
                        if (callbacksRef.current.onCallCanceled) callbacksRef.current.onCallCanceled(payload.from);
                    }
                    else if (payload.type === 'dec' && callbacksRef.current.onCallDeclined) callbacksRef.current.onCallDeclined(payload.from);
                    else if (payload.type === 'acc') {
                        if (callbacksRef.current.onCallAccepted) callbacksRef.current.onCallAccepted(payload.from);
                        const offer = await pc.createOffer();
                        await pc.setLocalDescription(offer);
                        client.publish(`vo/room/${roomId}/${payload.from}/sig`, JSON.stringify({ type: 'off', from: myId, sdp: offer }));
                    }
                    else if (payload.type === 'off') {
                        // If we are Available, auto-accept and notify UI
                        if (myStatus === 'Available') {
                            if (callbacksRef.current.onCallAccepted) callbacksRef.current.onCallAccepted(payload.from);
                        }
                        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                        flushCandidates(payload.from);
                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);
                        client.publish(`vo/room/${roomId}/${payload.from}/sig`, JSON.stringify({ type: 'ans', from: myId, sdp: answer }));
                    } else if (payload.type === 'ans') {
                        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                        flushCandidates(payload.from);
                    } else if (payload.type === 'ice') {
                        if (pc.remoteDescription) await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
                        else (signalsQueue.current[payload.from] = signalsQueue.current[payload.from] || []).push(payload.candidate);
                    }
                } catch (e) { }
            }
        });

        return () => {
            if (mqttRef.current) {
                mqttRef.current.publish(`vo/room/${roomId}/${myId}/pres`, '', { retain: true, qos: 1 });
                mqttRef.current.end();
            }
            Object.values(peerConnections.current).forEach(p => p.close());
        };
    }, [isJoined, roomId, myId, getPeerConnection, flushCandidates]);

    // Heartbeats for Presence
    useEffect(() => {
        if (!mqttRef.current || !mqttRef.current.connected) return;
        const broadcast = () => {
            mqttRef.current.publish(`vo/room/${roomId}/${myId}/pres`, JSON.stringify({
                id: myId, name: userName, status: myStatus, isLocked, isSharing: !!localScreenStream, sessionStartTime, lastSeen: Date.now()
            }), { retain: true, qos: 1 });
        };
        const timer = setInterval(broadcast, 15000);
        return () => clearInterval(timer);
    }, [myStatus, isLocked, !!localScreenStream, roomId, myId, userName]);

    // Pruning
    useEffect(() => {
        const pruner = setInterval(() => {
            const now = Date.now();
            setPeers(prev => {
                const updated = { ...prev };
                let changed = false;
                Object.keys(updated).forEach(id => {
                    if (updated[id].lastSeen && (now - updated[id].lastSeen > 40000)) {
                        delete updated[id];
                        if (peerConnections.current[id]) { peerConnections.current[id].close(); delete peerConnections.current[id]; }
                        changed = true;
                    }
                });
                return changed ? updated : prev;
            });
        }, 5000);
        return () => clearInterval(pruner);
    }, []);

    return {
        peers, myId, error, myStatus, setMyStatus,
        isMuted, toggleMute: () => {
            if (localStreamRef.current) {
                const t = localStreamRef.current.getAudioTracks()[0];
                if (t) { t.enabled = !t.enabled; setIsMuted(!t.enabled); }
            }
        },
        isLocked, toggleLock: () => setIsLocked(!isLocked),
        isVideoEnabled, toggleVideo: () => setIsVideoEnabled(prev => !prev),
        joinRequests, acceptJoinRequest: (id) => {
            setJoinRequests(prev => prev.filter(r => r.peerId !== id));
            mqttRef.current.publish(`vo/room/${roomId}/${id}/sig`, JSON.stringify({ type: 'acc', from: myId }));
        },
        declineJoinRequest: (id) => {
            setJoinRequests(prev => prev.filter(r => r.peerId !== id));
            mqttRef.current.publish(`vo/room/${roomId}/${id}/sig`, JSON.stringify({ type: 'dec', from: myId }));
        },
        ringPeer: (id) => {
            mqttRef.current.publish(`vo/room/${roomId}/${id}/sig`, JSON.stringify({ type: 'req', from: myId, name: userName }));
        },
        callPeer: (id) => {
            const pc = getPeerConnection(id);
            pc.createOffer().then(o => pc.setLocalDescription(o)).then(() => {
                mqttRef.current.publish(`vo/room/${roomId}/${id}/sig`, JSON.stringify({ type: 'off', from: myId, sdp: pc.localDescription }));
            });
        },
        hangUpPeer: (id) => {
            mqttRef.current.publish(`vo/room/${roomId}/${id}/sig`, JSON.stringify({ type: 'cancel', from: myId }));
            if (peerConnections.current[id]) {
                peerConnections.current[id].close();
                delete peerConnections.current[id];
                setPeers(prev => ({ ...prev, [id]: { ...prev[id], isTalking: false, remoteScreenStream: null, remoteVideoStream: null } }));
            }
        },
        startScreenShare: async () => {
            try {
                // Production-ready constraints: prefer system audio if available
                const stream = await navigator.mediaDevices.getDisplayMedia({
                    video: { cursor: "always" },
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    }
                });

                setLocalScreenStream(stream);

                // Add or Replace tracks in all PC instances
                Object.values(peerConnections.current).forEach(pc => {
                    stream.getTracks().forEach(track => {
                        // Check if we already have a sender for this kind of track
                        const senders = pc.getSenders();
                        const existingSender = senders.find(s => s.track?.kind === track.kind && s.track?.label?.includes('screen'));

                        if (existingSender) {
                            existingSender.replaceTrack(track);
                        } else {
                            pc.addTrack(track, stream);
                        }
                    });
                });

                // Handle external stop (browser's "Stop Sharing" button)
                stream.getVideoTracks()[0].onended = () => {
                    // Logic to remove tracks from PCs
                    Object.values(peerConnections.current).forEach(pc => {
                        const senders = pc.getSenders();
                        senders.forEach(sender => {
                            if (sender.track && (sender.track.label.includes('screen') || stream.getTracks().includes(sender.track))) {
                                try { pc.removeTrack(sender); } catch (e) { }
                            }
                        });
                    });
                    setLocalScreenStream(null);
                };

            } catch (err) {
                console.error("[WebRTC] Screen Share Error:", err);
                if (err.name !== 'NotAllowedError') {
                    setError("Failed to start screen share. Please check permissions.");
                }
            }
        },
        stopScreenShare: () => {
            if (localScreenStream) {
                localScreenStream.getTracks().forEach(t => {
                    t.stop();
                    // Manually trigger onended logic for consistency
                    Object.values(peerConnections.current).forEach(pc => {
                        const senders = pc.getSenders();
                        senders.forEach(sender => {
                            if (sender.track === t) {
                                try { pc.removeTrack(sender); } catch (e) { }
                            }
                        });
                    });
                });
                setLocalScreenStream(null);
            }
        },
        localVideoStream, localScreenStream,
        canScreenShare: !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia),
        sendFile: (peerId, file) => { alert("P2P File Transfer not implemented."); }
    };
}
