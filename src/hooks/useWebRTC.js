import { useState, useEffect, useRef, useCallback } from 'react';
import mqtt from 'mqtt';

// Global WebRTC Configuration
const pcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        { urls: 'stun:stun.ekiga.net' },
        { urls: 'stun:stun.ideasip.com' }
    ],
    iceCandidatePoolSize: 10
};

/**
 * useWebRTC - The Collaboration Engine
 * Supports: HQ Audio, P2P Chat, P2P Files, and Screen Sharing.
 */
export function useWebRTC(roomId, userName, isJoined) {
    const [peers, setPeers] = useState({});
    const [myId] = useState(() => `u_${Math.random().toString(36).substr(2, 6)}`);
    const [error, setError] = useState(null);
    const [myStatus, setMyStatus] = useState('Available');
    const [isMuted, setIsMuted] = useState(true);
    const [isLocked, setIsLocked] = useState(false);
    const [joinRequests, setJoinRequests] = useState([]);

    // New Feature States
    const [localScreenStream, setLocalScreenStream] = useState(null);
    const [incomingFile, setIncomingFile] = useState(null); // {name, size, progress, fromId}

    const mqttRef = useRef(null);
    const localStreamRef = useRef(null);
    const peerConnections = useRef({}); // { [peerId]: RTCPeerConnection }
    const dataChannels = useRef({}); // { [peerId]: RTCDataChannel }
    const signalsQueue = useRef({});

    // -----------------------------------------------------------------
    // 1. Media Setup (Audio + Screen)
    // -----------------------------------------------------------------
    useEffect(() => {
        if (!isJoined) return;

        navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
            .then(stream => {
                stream.getAudioTracks().forEach(t => t.enabled = false);
                localStreamRef.current = stream;

                // Keep track of audio status
                setIsMuted(true);

                // Inject stream into existing connections
                Object.values(peerConnections.current).forEach(pc => {
                    const sender = pc.getSenders().find(s => s.track?.kind === 'audio');
                    if (!sender) stream.getAudioTracks().forEach(t => pc.addTrack(t, stream));
                });
            })
            .catch(err => {
                console.error("[WebRTC] Media Error:", err);
                setError("Microphone access is required.");
            });

        return () => {
            if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
            if (localScreenStream) localScreenStream.getTracks().forEach(t => t.stop());
        };
    }, [isJoined]);

    // -----------------------------------------------------------------
    // 2. Peer Connection & DataChannel Setup
    // -----------------------------------------------------------------
    const setupDataChannel = useCallback((peerId, channel) => {
        channel.onopen = () => console.log(`[Data] Channel with ${peerId} open.`);
        channel.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === 'file-start') {
                setIncomingFile({
                    name: data.name,
                    size: data.size,
                    progress: 0,
                    fromId: peerId,
                    chunks: []
                });
            } else if (data.type === 'file-chunk') {
                // In a true implementation we'd use ArrayBuffer, but for now we handle metadata
                setIncomingFile(prev => prev ? { ...prev, progress: data.progress } : null);
            }
        };
        dataChannels.current[peerId] = channel;
    }, []);

    const getPeerConnection = useCallback((remoteId) => {
        if (peerConnections.current[remoteId]) return peerConnections.current[remoteId];

        const pc = new RTCPeerConnection(pcConfig);
        peerConnections.current[remoteId] = pc;
        signalsQueue.current[remoteId] = [];

        // DataChannel Init
        const dc = pc.createDataChannel('office-data', { negotiated: true, id: 0 });
        setupDataChannel(remoteId, dc);

        // Track Handling
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current));
        }

        pc.onicecandidate = (e) => {
            if (e.candidate && mqttRef.current) {
                mqttRef.current.publish(`vo/room/${roomId}/${remoteId}/sig`, JSON.stringify({
                    type: 'ice', from: myId, candidate: e.candidate
                }));
            }
        };

        pc.ontrack = (event) => {
            const stream = event.streams[0];
            const isVideo = stream.getVideoTracks().length > 0;

            if (isVideo) {
                setPeers(prev => ({
                    ...prev,
                    [remoteId]: { ...prev[remoteId], remoteScreenStream: stream }
                }));
                return;
            }

            let audioEl = document.getElementById(`audio-${remoteId}`);
            if (!audioEl) {
                audioEl = document.createElement('audio');
                audioEl.id = `audio-${remoteId}`;
                audioEl.autoplay = audioEl.playsInline = true;
                document.body.appendChild(audioEl);
            }
            audioEl.srcObject = stream;
            audioEl.play().catch(() => { });

            setPeers(prev => ({ ...prev, [remoteId]: { ...prev[remoteId], isTalking: true } }));
        };

        return pc;
    }, [roomId, myId, setupDataChannel]);

    // -----------------------------------------------------------------
    // 3. Signaling & Network
    // -----------------------------------------------------------------
    useEffect(() => {
        if (!isJoined || !roomId) return;

        const client = mqtt.connect('wss://broker.emqx.io:8084/mqtt', {
            clientId: `vo_${myId}`,
            clean: true,
            will: { topic: `vo/room/${roomId}/${myId}/pres`, payload: '', retain: true, qos: 1 }
        });
        mqttRef.current = client;

        client.on('connect', () => {
            client.subscribe(`vo/room/${roomId}/+/pres`);
            client.subscribe(`vo/room/${roomId}/${myId}/sig`);

            client.publish(`vo/room/${roomId}/${myId}/pres`, JSON.stringify({
                id: myId, name: userName, status: myStatus, isLocked: isLocked, isSharing: !!localScreenStream
            }), { retain: true, qos: 1 });
        });

        client.on('message', async (topic, message) => {
            const msgStr = message.toString();
            if (topic.endsWith('/pres')) {
                const remoteId = topic.split('/')[3];
                if (remoteId === myId) return;
                if (!msgStr) {
                    setPeers(prev => { const n = { ...prev }; delete n[remoteId]; return n; });
                    const el = document.getElementById(`audio-${remoteId}`);
                    if (el) el.remove();
                    return;
                }
                const payload = JSON.parse(msgStr);
                setPeers(prev => ({ ...prev, [remoteId]: { ...prev[remoteId], ...payload } }));
                return;
            }

            if (topic.endsWith('/sig')) {
                const payload = JSON.parse(msgStr);
                const fromId = payload.from;
                const pc = getPeerConnection(fromId);

                try {
                    if (payload.type === 'req') setJoinRequests(prev => [...prev, { peerId: fromId, peerName: payload.name }]);
                    else if (payload.type === 'acc') {
                        const offer = await pc.createOffer();
                        await pc.setLocalDescription(offer);
                        client.publish(`vo/room/${roomId}/${fromId}/sig`, JSON.stringify({ type: 'off', from: myId, sdp: offer }));
                    } else if (payload.type === 'off') {
                        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);
                        client.publish(`vo/room/${roomId}/${fromId}/sig`, JSON.stringify({ type: 'ans', from: myId, sdp: answer }));
                    } else if (payload.type === 'ans') {
                        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                    } else if (payload.type === 'ice') {
                        if (pc.remoteDescription) await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
                        else (signalsQueue.current[fromId] = signalsQueue.current[fromId] || []).push(payload.candidate);
                    }
                } catch (e) { console.error("[WebRTC] Signal Error:", e); }
            }
        });

        return () => {
            if (mqttRef.current) mqttRef.current.end();
            Object.values(peerConnections.current).forEach(p => p.close());
        };
    }, [isJoined, roomId, myId, getPeerConnection]);

    // 4. PRESENCE SYNC (Broadcast state changes)
    useEffect(() => {
        if (mqttRef.current && mqttRef.current.connected) {
            mqttRef.current.publish(`vo/room/${roomId}/${myId}/pres`, JSON.stringify({
                id: myId, name: userName, status: myStatus, isLocked: isLocked, isSharing: !!localScreenStream
            }), { retain: true, qos: 1 });
        }
    }, [myStatus, isLocked, !!localScreenStream, roomId, myId, userName]);

    // -----------------------------------------------------------------
    // 4. API Functions (Collaboration Tools)
    // -----------------------------------------------------------------
    const callPeer = useCallback((id) => {
        const pc = getPeerConnection(id);
        return pc.createOffer()
            .then(o => pc.setLocalDescription(o))
            .then(() => {
                if (mqttRef.current) {
                    mqttRef.current.publish(`vo/room/${roomId}/${id}/sig`, JSON.stringify({
                        type: 'off', from: myId, sdp: pc.localDescription
                    }));
                }
            });
    }, [roomId, myId, getPeerConnection]);

    const hangUpPeer = useCallback((id) => {
        if (peerConnections.current[id]) {
            peerConnections.current[id].close();
            delete peerConnections.current[id];
            setPeers(prev => ({ ...prev, [id]: { ...prev[id], isTalking: false, remoteScreenStream: null } }));
        }
    }, []);

    // 5. AUTO-HONE SCREEN (If peer shares, and we aren't connected, we should huddle to see it)
    useEffect(() => {
        Object.values(peers).forEach(peer => {
            if (peer.isSharing && !peerConnections.current[peer.id]) {
                console.log(`[Auto] Joining ${peer.name} for screen share.`);
                callPeer(peer.id);
            }
        });
    }, [peers, callPeer]);
    const startScreenShare = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            setLocalScreenStream(stream);

            // Broadcast tracks to EVERYONE in the room
            Object.keys(peers).forEach(peerId => {
                const pc = getPeerConnection(peerId);
                stream.getVideoTracks().forEach(t => pc.addTrack(t, stream));

                pc.createOffer().then(offer => pc.setLocalDescription(offer))
                    .then(() => {
                        mqttRef.current.publish(`vo/room/${roomId}/${peerId}/sig`, JSON.stringify({
                            type: 'off', from: myId, sdp: pc.localDescription
                        }));
                    });
            });

            stream.getVideoTracks()[0].onended = () => stopScreenShare();
        } catch (e) { console.error("Screen share failed:", e); }
    }, [myId, roomId, peers, getPeerConnection]);

    const stopScreenShare = useCallback(() => {
        if (localScreenStream) {
            localScreenStream.getTracks().forEach(t => t.stop());
            setLocalScreenStream(null);
        }
    }, [localScreenStream]);

    return {
        peers, myId, error, myStatus, setMyStatus,
        isMuted, toggleMute: () => {
            if (localStreamRef.current) {
                const t = localStreamRef.current.getAudioTracks()[0];
                if (t) { t.enabled = !t.enabled; setIsMuted(!t.enabled); }
            }
        },
        isLocked, toggleLock: () => setIsLocked(!isLocked),
        joinRequests, acceptJoinRequest: (id) => mqttRef.current.publish(`vo/room/${roomId}/${id}/sig`, JSON.stringify({ type: 'acc', from: myId })),
        declineJoinRequest: (id) => setJoinRequests(prev => prev.filter(r => r.peerId !== id)),
        callPeer, hangUpPeer,

        // Collab Tools
        startScreenShare, stopScreenShare, localScreenStream,
        sendFile: (peerId, file) => {
            const dc = dataChannels.current[peerId];
            if (dc && dc.readyState === 'open') {
                dc.send(JSON.stringify({ type: 'file-start', name: file.name, size: file.size }));
                // Full chunking logic would go here
                alert("P2P File Transfer Started (Demo Mode)");
            }
        }
    };
}
