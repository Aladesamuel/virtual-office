import { useState, useEffect, useRef, useCallback } from 'react';
import mqtt from 'mqtt';

// Global WebRTC Configuration (Expanded for NAT Traversal)
const pcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        { urls: 'stun:stun.ekiga.net' },
        { urls: 'stun:stun.ideasip.com' },
        { urls: 'stun:stun.schlund.de' }
    ],
    iceCandidatePoolSize: 10
};

/**
 * useWebRTC - Global P2P Networking (Optimized for Cross-Network)
 */
export function useWebRTC(roomId, userName, isJoined) {
    const [peers, setPeers] = useState({});
    const [myId] = useState(() => `u_${Math.random().toString(36).substr(2, 6)}`);
    const [error, setError] = useState(null);
    const [myStatus, setMyStatus] = useState('Available');
    const [isMuted, setIsMuted] = useState(true);
    const [isLocked, setIsLocked] = useState(false);
    const [joinRequests, setJoinRequests] = useState([]);

    const mqttRef = useRef(null);
    const localStreamRef = useRef(null);
    const peerConnections = useRef({}); // { [peerId]: RTCPeerConnection }
    const signalsQueue = useRef({}); // { [peerId]: [candidates] }

    // -----------------------------------------------------------------
    // 1. Media Setup (Stable & High Quality)
    // -----------------------------------------------------------------
    useEffect(() => {
        if (!isJoined) return;

        const constraints = {
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                sampleSize: 16,
                channelCount: 1
            },
            video: false
        };

        navigator.mediaDevices.getUserMedia(constraints)
            .then(stream => {
                stream.getAudioTracks().forEach(t => t.enabled = false);
                localStreamRef.current = stream;
                console.log("[WebRTC] HQ Audio stream ready.");

                // DYNAMIC INJECTION: If any peer connections were made while stream was loading, add tracks now.
                Object.values(peerConnections.current).forEach(pc => {
                    const sender = pc.getSenders().find(s => s.track?.kind === 'audio');
                    if (!sender) {
                        stream.getAudioTracks().forEach(track => pc.addTrack(track, stream));
                    }
                });
            })
            .catch(err => {
                console.error("[WebRTC] Media Error:", err);
                setError("Microphone access is required for audio calls.");
            });

        return () => {
            if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
        };
    }, [isJoined]);

    // -----------------------------------------------------------------
    // 2. Peer Connection Logic (Core P2P)
    // -----------------------------------------------------------------
    const getPeerConnection = useCallback((remoteId) => {
        if (peerConnections.current[remoteId]) return peerConnections.current[remoteId];

        const pc = new RTCPeerConnection(pcConfig);
        peerConnections.current[remoteId] = pc;
        signalsQueue.current[remoteId] = [];

        // Add local tracks to established connection
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, localStreamRef.current);
            });
        }

        pc.onicecandidate = (event) => {
            if (event.candidate && mqttRef.current) {
                mqttRef.current.publish(`vo/room/${roomId}/${remoteId}/sig`, JSON.stringify({
                    type: 'ice', from: myId, candidate: event.candidate
                }));
            }
        };

        pc.ontrack = (event) => {
            console.log(`[WebRTC] Audio track received from ${remoteId}`);
            let audioEl = document.getElementById(`audio-${remoteId}`);
            if (!audioEl) {
                audioEl = document.createElement('audio');
                audioEl.id = `audio-${remoteId}`;
                audioEl.autoplay = true;
                // Important for mobile and some desktop browsers
                audioEl.playsInline = true;
                document.body.appendChild(audioEl);
            }
            audioEl.srcObject = event.streams[0];

            // Bypass autoplay restrictions - force play and add interaction backup
            const playAudio = () => {
                if (audioEl.paused) audioEl.play().catch(e => console.warn("[WebRTC] Autoplay pending interaction"));
            };
            playAudio();
            document.addEventListener('click', playAudio, { once: true });
            document.addEventListener('touchstart', playAudio, { once: true });

            setPeers(prev => ({ ...prev, [remoteId]: { ...prev[remoteId], isTalking: true } }));
        };

        pc.onconnectionstatechange = () => {
            console.log(`[WebRTC] ${remoteId} state: ${pc.connectionState}`);
            if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) {
                setPeers(prev => ({ ...prev, [remoteId]: { ...prev[remoteId], isTalking: false } }));
                const el = document.getElementById(`audio-${remoteId}`);
                if (el) el.remove();
            }
        };

        return pc;
    }, [roomId, myId]);

    const processQueue = useCallback(async (remoteId, pc) => {
        const queue = signalsQueue.current[remoteId];
        if (!queue) return;
        while (queue.length > 0) {
            const candidate = queue.shift();
            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
                console.error("[WebRTC] Queue Error:", e);
            }
        }
    }, []);

    // -----------------------------------------------------------------
    // 3. Network Lifecycle (MQTT Signaling)
    // -----------------------------------------------------------------
    useEffect(() => {
        if (!isJoined || !roomId) return;

        console.log(`[Network] Connecting as ${myId} to room ${roomId}`);

        // Use standard WSS for better firewall compatibility
        const client = mqtt.connect('wss://broker.emqx.io:8084/mqtt', {
            clientId: `vo_${myId}`,
            clean: true,
            connectTimeout: 4000,
            will: {
                topic: `vo/room/${roomId}/${myId}/pres`,
                payload: '', // Empty payload clears retained message on broker
                retain: true,
                qos: 1
            }
        });
        mqttRef.current = client;

        client.on('connect', () => {
            console.log("[Network] Link established.");
            client.subscribe(`vo/room/${roomId}/+/pres`);
            client.subscribe(`vo/room/${roomId}/${myId}/sig`);

            // Initial Presence
            client.publish(`vo/room/${roomId}/${myId}/pres`, JSON.stringify({
                id: myId, name: userName, status: myStatus, isLocked: isLocked
            }), { retain: true, qos: 1 });
        });

        client.on('message', async (topic, message) => {
            const msgStr = message.toString();

            // Handle Presence
            if (topic.endsWith('/pres')) {
                const remoteId = topic.split('/')[3]; // Extract ID from path
                if (remoteId === myId) return;

                if (!msgStr) { // Empty message = Peer Left
                    console.log(`[Network] Peer left: ${remoteId}`);
                    setPeers(prev => {
                        const n = { ...prev };
                        delete n[remoteId];
                        return n;
                    });
                    if (peerConnections.current[remoteId]) {
                        peerConnections.current[remoteId].close();
                        delete peerConnections.current[remoteId];
                    }
                    const el = document.getElementById(`audio-${remoteId}`);
                    if (el) el.remove();
                    return;
                }

                const payload = JSON.parse(msgStr);
                setPeers(prev => ({
                    ...prev,
                    [remoteId]: { ...prev[remoteId], ...payload }
                }));
                return;
            }

            // Handle Signaling
            if (topic.endsWith('/sig')) {
                const payload = JSON.parse(msgStr);
                const fromId = payload.from;
                const pc = getPeerConnection(fromId);

                try {
                    if (payload.type === 'req') {
                        setJoinRequests(prev => [...prev, { peerId: fromId, peerName: payload.name }]);
                    } else if (payload.type === 'acc') {
                        const offer = await pc.createOffer();
                        await pc.setLocalDescription(offer);
                        client.publish(`vo/room/${roomId}/${fromId}/sig`, JSON.stringify({
                            type: 'off', from: myId, sdp: offer
                        }));
                        await processQueue(fromId, pc);
                    } else if (payload.type === 'off') {
                        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);
                        client.publish(`vo/room/${roomId}/${fromId}/sig`, JSON.stringify({
                            type: 'ans', from: myId, sdp: answer
                        }));
                        await processQueue(fromId, pc);
                    } else if (payload.type === 'ans') {
                        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                        await processQueue(fromId, pc);
                    } else if (payload.type === 'ice') {
                        if (pc.remoteDescription) {
                            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
                        } else {
                            signalsQueue.current[fromId].push(payload.candidate);
                        }
                    }
                } catch (e) {
                    console.error("[WebRTC] Signal Error:", e);
                }
            }
        });

        return () => {
            console.log("[Network] Terminating connections.");
            if (mqttRef.current) {
                // Clear presence immediately (retained message)
                mqttRef.current.publish(`vo/room/${roomId}/${myId}/pres`, '', { retain: true, qos: 1 });
                mqttRef.current.end();
            }
            Object.values(peerConnections.current).forEach(p => p.close());
        };
        // Dependency array intentionally minimal to prevent reconnect loops
    }, [isJoined, roomId, myId, getPeerConnection, processQueue]);

    // -----------------------------------------------------------------
    // 4. Updates (Presence & Controls)
    // -----------------------------------------------------------------
    // Sync Presence when local state changes WITHOUT resetting MQTT
    useEffect(() => {
        if (mqttRef.current && mqttRef.current.connected) {
            mqttRef.current.publish(`vo/room/${roomId}/${myId}/pres`, JSON.stringify({
                id: myId, name: userName, status: myStatus, isLocked: isLocked
            }), { retain: true, qos: 1 });
        }
    }, [userName, myStatus, isLocked, roomId, myId]);

    const toggleMute = useCallback(() => {
        if (localStreamRef.current) {
            const track = localStreamRef.current.getAudioTracks()[0];
            if (track) {
                track.enabled = !track.enabled;
                setIsMuted(!track.enabled);
            }
        }
    }, []);

    const callPeer = useCallback(async (targetId) => {
        const target = peers[targetId];
        if (!target || !mqttRef.current) return;

        if (target.isLocked) {
            mqttRef.current.publish(`vo/room/${roomId}/${targetId}/sig`, JSON.stringify({
                type: 'req', from: myId, name: userName
            }));
        } else {
            // Direct Start: Trigger other side to accept a call
            const pc = getPeerConnection(targetId);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            mqttRef.current.publish(`vo/room/${roomId}/${targetId}/sig`, JSON.stringify({
                type: 'off', from: myId, sdp: offer
            }));
        }
    }, [myId, roomId, userName, peers, getPeerConnection]);

    const acceptJoinRequest = useCallback((remoteId) => {
        if (mqttRef.current) {
            mqttRef.current.publish(`vo/room/${roomId}/${remoteId}/sig`, JSON.stringify({
                type: 'acc', from: myId
            }));
        }
        setJoinRequests(prev => prev.filter(r => r.peerId !== remoteId));
    }, [myId, roomId]);

    const declineJoinRequest = useCallback((remoteId) => {
        setJoinRequests(prev => prev.filter(r => r.peerId !== remoteId));
    }, []);

    const hangUpPeer = useCallback((id) => {
        if (peerConnections.current[id]) {
            peerConnections.current[id].close();
            delete peerConnections.current[id];
            setPeers(prev => ({ ...prev, [id]: { ...prev[id], isTalking: false } }));
        }
    }, []);

    return {
        peers, myId, error, myStatus, setMyStatus,
        isMuted, toggleMute, isLocked, toggleLock: () => setIsLocked(!isLocked),
        joinRequests, acceptJoinRequest, declineJoinRequest,
        callPeer, hangUpPeer
    };
}
