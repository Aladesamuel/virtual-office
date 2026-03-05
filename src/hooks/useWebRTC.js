import { useState, useEffect, useRef, useCallback } from 'react';
import mqtt from 'mqtt';

// Global WebRTC Configuration
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

export function useWebRTC(roomId, userName, isJoined) {
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

                if (isVideoEnabled) setLocalVideoStream(stream);
                else setLocalVideoStream(null);

                // Update tracks in existing connections
                Object.values(peerConnections.current).forEach(pc => {
                    stream.getTracks().forEach(track => {
                        const sender = pc.getSenders().find(s => s.track?.kind === track.kind);
                        if (!sender) pc.addTrack(track, stream);
                        else sender.replaceTrack(track);
                    });
                });
            })
            .catch(err => {
                console.error("[WebRTC] Media Error:", err);
                if (isVideoEnabled) {
                    setIsVideoEnabled(false);
                    setError("Camera not found.");
                } else setError("Mic required.");
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
            } catch (e) { console.warn("[WebRTC] Negotiation Error:", e); }
        };

        pc.ontrack = (event) => {
            const stream = event.streams[0] || new MediaStream([event.track]);
            const isVideo = event.track.kind === 'video';
            const label = event.track.label.toLowerCase();
            const isScreen = label.includes('screen') || label.includes('monitor') || label.includes('display');

            if (isVideo) {
                setPeers(prev => ({
                    ...prev,
                    [remoteId]: {
                        ...prev[remoteId],
                        [isScreen ? 'remoteScreenStream' : 'remoteVideoStream']: stream,
                        isTalking: !isScreen ? true : prev[remoteId]?.isTalking
                    }
                }));
                return;
            }

            let audioEl = document.getElementById(`audio-${remoteId}`);
            if (!audioEl) {
                audioEl = document.createElement('audio');
                audioEl.id = `audio-${remoteId}`;
                audioEl.autoplay = true;
                document.body.appendChild(audioEl);
            }
            audioEl.srcObject = stream;
            setPeers(prev => ({ ...prev, [remoteId]: { ...prev[remoteId], isTalking: true } }));
        };

        // Handle connection closure cleanup
        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                setPeers(prev => ({ ...prev, [remoteId]: { ...prev[remoteId], isTalking: false, remoteScreenStream: null, remoteVideoStream: null } }));
            }
        };

        return pc;
    }, [roomId, myId, setupDataChannel, localScreenStream]);

    const flushCandidates = useCallback(async (peerId) => {
        const pc = peerConnections.current[peerId];
        if (!pc || !pc.remoteDescription || !signalsQueue.current[peerId]) return;
        while (signalsQueue.current[peerId].length > 0) {
            const candidate = signalsQueue.current[peerId].shift();
            try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) { }
        }
    }, []);

    // Presence Broadcast
    const broadcastPresence = useCallback(() => {
        if (!mqttRef.current || !mqttRef.current.connected) return;
        mqttRef.current.publish(`vo/room/${roomId}/${myId}/pres`, JSON.stringify({
            id: myId, name: userName, status: myStatus, isLocked, isSharing: !!localScreenStream, sessionStartTime, lastSeen: Date.now()
        }), { retain: true, qos: 1 });
    }, [roomId, myId, userName, myStatus, isLocked, !!localScreenStream, sessionStartTime]);

    // Signaling
    useEffect(() => {
        if (!isJoined || !roomId) return;
        setPeers({});

        const client = mqtt.connect('wss://broker.emqx.io:8084/mqtt', { clientId: `vo_${myId}`, clean: true });
        mqttRef.current = client;

        client.on('connect', () => {
            client.subscribe(`vo/room/${roomId}/+/pres`);
            client.subscribe(`vo/room/${roomId}/${myId}/sig`);
            broadcastPresence();
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
                    if (payload.type === 'req') setJoinRequests(prev => [...prev, { peerId: payload.from, peerName: payload.name }]);
                    else if (payload.type === 'acc') pc.onnegotiationneeded();
                    else if (payload.type === 'off') {
                        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                        flushCandidates(payload.from);
                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);
                        client.publish(`vo/room/${roomId}/${payload.from}/sig`, JSON.stringify({ type: 'ans', from: myId, sdp: answer }));
                    } else if (payload.type === 'ans') {
                        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                        flushCandidates(payload.from);
                    } else if (payload.type === 'bye') {
                        if (peerConnections.current[payload.from]) {
                            peerConnections.current[payload.from].close();
                            delete peerConnections.current[payload.from];
                        }
                        setPeers(prev => ({ ...prev, [payload.from]: { ...prev[payload.from], isTalking: false, remoteScreenStream: null, remoteVideoStream: null } }));
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
    }, [isJoined, roomId, myId, getPeerConnection, flushCandidates, broadcastPresence]);

    // Presence & Pruning
    useEffect(() => {
        const timer = setInterval(broadcastPresence, 15000);
        return () => clearInterval(timer);
    }, [broadcastPresence]);

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

    const callPeer = useCallback((id) => {
        const pc = getPeerConnection(id);
        pc.onnegotiationneeded();
    }, [getPeerConnection]);

    const stopScreenShare = useCallback(() => {
        if (localScreenStream) {
            localScreenStream.getTracks().forEach(t => t.stop());
            setLocalScreenStream(null);
            setTimeout(broadcastPresence, 100);
        }
    }, [localScreenStream, broadcastPresence]);

    const startScreenShare = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            setLocalScreenStream(stream);
            Object.keys(peers).forEach(peerId => {
                const pc = getPeerConnection(peerId);
                stream.getTracks().forEach(t => pc.addTrack(t, stream));
                pc.onnegotiationneeded(); // Triggers a new offer including screen share
            });
            stream.getVideoTracks()[0].onended = () => stopScreenShare();
            setTimeout(broadcastPresence, 100);
        } catch (e) { }
    }, [peers, getPeerConnection, stopScreenShare, broadcastPresence]);

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
        joinRequests, acceptJoinRequest: (id) => mqttRef.current.publish(`vo/room/${roomId}/${id}/sig`, JSON.stringify({ type: 'acc', from: myId })),
        declineJoinRequest: (id) => setJoinRequests(prev => prev.filter(r => r.peerId !== id)),
        callPeer,
        hangUpPeer: (id) => {
            if (peerConnections.current[id]) {
                peerConnections.current[id].close();
                delete peerConnections.current[id];
            }
            if (mqttRef.current) mqttRef.current.publish(`vo/room/${roomId}/${id}/sig`, JSON.stringify({ type: 'bye', from: myId }));
            setPeers(prev => ({ ...prev, [id]: { ...prev[id], isTalking: false, remoteScreenStream: null, remoteVideoStream: null } }));
        },
        startScreenShare, stopScreenShare, localVideoStream, localScreenStream,
        canScreenShare: !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia),
        sendFile: (peerId, file) => { alert("P2P File Transfer not implemented."); }
    };
}
