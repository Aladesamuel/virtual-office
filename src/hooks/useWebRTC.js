import { useState, useEffect, useRef, useCallback } from 'react';
import mqtt from 'mqtt';

const pcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

export function useWebRTC(roomId, userName, isJoined) {
    const [peers, setPeers] = useState({});
    const [myId] = useState(() => {
        const saved = localStorage.getItem('vo_my_id');
        if (saved) return saved;
        const newId = `u_${Math.random().toString(36).substr(2, 6)}`;
        localStorage.setItem('vo_my_id', newId);
        return newId;
    });
    const [myStatus, setMyStatus] = useState('Available');
    const [isMuted, setIsMuted] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [joinRequests, setJoinRequests] = useState([]);

    const mqttRef = useRef(null);
    const localStreamRef = useRef(null);
    const peerConnections = useRef({});
    const signalsQueue = useRef({});
    const callbacksRef = useRef({});

    // 1. Audio-Only Media Management
    useEffect(() => {
        if (!isJoined) return;

        navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true }
        })
            .then(stream => {
                localStreamRef.current = stream;
                stream.getAudioTracks().forEach(t => t.enabled = !isMuted);

                // Re-sync tracks to active connections
                Object.values(peerConnections.current).forEach(pc => {
                    stream.getTracks().forEach(track => {
                        const sender = pc.getSenders().find(s => s.track?.kind === track.kind);
                        if (sender) sender.replaceTrack(track).catch(err => console.error('Replace track error:', err));
                        else pc.addTrack(track, stream);
                    });
                });
            })
            .catch(err => {
                console.error("Media Error:", err.name, err.message);
                if (err.name === 'NotAllowedError') {
                    console.error('Microphone permission denied');
                } else if (err.name === 'NotFoundError') {
                    console.error('No microphone found');
                }
            });

        return () => {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(t => {
                    try {
                        t.stop();
                    } catch (err) {
                        console.error('Error stopping track:', err);
                    }
                });
            }
        };
    }, [isJoined]);

    // 2. Peer Connection Factory
    const getPeerConnection = useCallback((remoteId) => {
        if (peerConnections.current[remoteId]) return peerConnections.current[remoteId];

        const pc = new RTCPeerConnection(pcConfig);
        peerConnections.current[remoteId] = pc;
        signalsQueue.current[remoteId] = [];

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current));
        }

        pc.onicecandidate = (e) => {
            if (e.candidate && mqttRef.current) {
                mqttRef.current.publish(`vo/${roomId}/${remoteId}/sig`, JSON.stringify({
                    type: 'ice', from: myId, candidate: e.candidate
                }));
            }
        };

        pc.ontrack = (e) => {
            const stream = e.streams[0];
            setPeers(prev => ({
                ...prev,
                [remoteId]: { ...prev[remoteId], remoteStream: stream }
            }));

            // Talking indicator logic (VAD)
            if (e.track.kind === 'audio') {
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const source = audioCtx.createMediaStreamSource(stream);
                const analyzer = audioCtx.createAnalyser();
                source.connect(analyzer);
                const dataArray = new Uint8Array(analyzer.frequencyBinCount);

                const check = () => {
                    if (pc.signalingState === 'closed') return audioCtx.close();
                    analyzer.getByteFrequencyData(dataArray);
                    const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
                    const talking = avg > 10;
                    setPeers(prev => (prev[remoteId]?.isTalking === talking ? prev : { ...prev, [remoteId]: { ...prev[remoteId], isTalking: talking } }));
                    setTimeout(check, 200);
                };
                check();
            }
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                setPeers(prev => { const n = { ...prev }; delete n[remoteId]; return n; });
                pc.close();
                delete peerConnections.current[remoteId];
            }
        };

        return pc;
    }, [roomId, myId]);

    // Prune stale peers
    useEffect(() => {
        const interval = setInterval(() => {
            setPeers(prev => {
                const now = Date.now();
                const next = { ...prev };
                let changed = false;
                Object.keys(next).forEach(id => {
                    // If we haven't heard from them in 25 seconds, they probably closed the tab
                    if (now - next[id].lastSeen > 25000) {
                        delete next[id];
                        changed = true;
                    }
                });
                return changed ? next : prev;
            });
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    // 3. Signaling & Presence
    useEffect(() => {
        if (!isJoined) return;

        const presenceTopic = `vo/${roomId}/${myId}/pres`;
        const client = mqtt.connect('wss://broker.emqx.io:8084/mqtt', {
            clientId: `vo_${myId}`,
            clean: true,
            will: {
                topic: presenceTopic,
                payload: '',
                retain: true,
                qos: 1
            }
        });
        mqttRef.current = client;

        client.on('connect', () => {
            client.subscribe(`vo/${roomId}/+/pres`);
            client.subscribe(`vo/${roomId}/${myId}/sig`);

            // Broadcast presence
            const broadcast = () => {
                client.publish(presenceTopic, JSON.stringify({
                    id: myId, name: userName, status: myStatus, isLocked, isMuted, t: Date.now()
                }), { retain: true, qos: 1 });
            };

            broadcast();
            const interval = setInterval(broadcast, 10000);
            return () => clearInterval(interval);
        });

        client.on('message', async (topic, message) => {
            const senderId = topic.split('/')[2];

            if (topic.endsWith('/pres')) {
                if (senderId === myId) return;

                const msgStr = message.toString();
                if (!msgStr) {
                    setPeers(prev => {
                        const n = { ...prev };
                        delete n[senderId];
                        return n;
                    });
                    return;
                }

                try {
                    const data = JSON.parse(msgStr);
                    setPeers(prev => ({
                        ...prev,
                        [senderId]: { ...prev[senderId], ...data, lastSeen: Date.now() }
                    }));
                } catch (e) {
                    console.warn("[WebRTC] Presence Parse Error:", e);
                }
            }

            if (topic.endsWith('/sig')) {
                const data = JSON.parse(message.toString());
                const pc = getPeerConnection(data.from);

                if (data.type === 'off') {
                    if (isLocked) {
                        setJoinRequests(prev => prev.find(r => r.id === data.from) ? prev : [...prev, { id: data.from, name: data.name }]);
                        return;
                    }
                    await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    client.publish(`vo/${roomId}/${data.from}/sig`, JSON.stringify({ type: 'ans', from: myId, sdp: answer }));
                } else if (data.type === 'ans') {
                    await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
                } else if (data.type === 'ice') {
                    if (pc.remoteDescription) await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                } else if (data.type === 'knock') {
                    setJoinRequests(prev => prev.find(r => r.id === data.from) ? prev : [...prev, { id: data.from, name: data.name }]);
                }
            }
        });

        return () => {
            if (client) {
                client.publish(presenceTopic, '', { retain: true, qos: 1 }, () => {
                    client.end();
                });
            }
        };
    }, [isJoined, roomId, myId, userName, myStatus, isLocked, isMuted, getPeerConnection]);

    // Actions
    const callPeer = async (id) => {
        const pc = getPeerConnection(id);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        mqttRef.current.publish(`vo/${roomId}/${id}/sig`, JSON.stringify({ type: 'off', from: myId, name: userName, sdp: offer }));
    };

    const knockPeer = (id) => {
        mqttRef.current.publish(`vo/${roomId}/${id}/sig`, JSON.stringify({ type: 'knock', from: myId, name: userName }));
    };

    const hangUp = (id) => {
        if (peerConnections.current[id]) {
            peerConnections.current[id].close();
            delete peerConnections.current[id];
            setPeers(prev => { const n = { ...prev }; delete n[id]; return n; });
        }
    };

    return {
        peers, myId, myStatus, setMyStatus,
        isMuted, setIsMuted: (v) => { setIsMuted(v); if (localStreamRef.current) localStreamRef.current.getAudioTracks().forEach(t => t.enabled = !v); },
        isLocked, setIsLocked,
        joinRequests, acceptRequest: (id) => { setJoinRequests(r => r.filter(x => x.id !== id)); callPeer(id); },
        callPeer, knockPeer, hangUp,
        localStream: localStreamRef.current
    };
}
