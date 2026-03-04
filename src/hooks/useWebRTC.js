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
    ]
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
    const signalsQueue = useRef({}); // Buffer for signals that arrive before PC is ready

    // -----------------------------------------------------------------
    // 1. Media Setup (Stable)
    // -----------------------------------------------------------------
    useEffect(() => {
        if (!isJoined) return;

        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            .then(stream => {
                stream.getAudioTracks().forEach(t => t.enabled = false);
                localStreamRef.current = stream;
                console.log("[WebRTC] Local audio stream ready.");
            })
            .catch(err => {
                console.error("[WebRTC] Media Error:", err);
                setError("Microphone required for Virtual Office.");
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
                document.body.appendChild(audioEl);
            }
            audioEl.srcObject = event.streams[0];
            setPeers(prev => ({ ...prev, [remoteId]: { ...prev[remoteId], isTalking: true } }));
        };

        pc.onconnectionstatechange = () => {
            console.log(`[WebRTC] ${remoteId} state: ${pc.connectionState}`);
            if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                setPeers(prev => ({ ...prev, [remoteId]: { ...prev[remoteId], isTalking: false } }));
            }
        };

        return pc;
    }, [roomId, myId]);

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
            connectTimeout: 4000
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
            const payload = JSON.parse(message.toString());

            // Handle Presence
            if (topic.endsWith('/pres')) {
                const remoteId = payload.id;
                if (remoteId === myId) return;

                if (!message.toString()) { // Cleanup on empty message
                    setPeers(prev => { const n = { ...prev }; delete n[remoteId]; return n; });
                    return;
                }

                setPeers(prev => ({
                    ...prev,
                    [remoteId]: { ...prev[remoteId], ...payload }
                }));
                return;
            }

            // Handle Signaling
            if (topic.endsWith('/sig')) {
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
                    } else if (payload.type === 'off') {
                        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);
                        client.publish(`vo/room/${roomId}/${fromId}/sig`, JSON.stringify({
                            type: 'ans', from: myId, sdp: answer
                        }));
                    } else if (payload.type === 'ans') {
                        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                    } else if (payload.type === 'ice') {
                        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
                    }
                } catch (e) {
                    console.error("[WebRTC] Signal Error:", e);
                }
            }
        });

        return () => {
            console.log("[Network] Terminating connections.");
            if (mqttRef.current) mqttRef.current.end();
            Object.values(peerConnections.current).forEach(pc => pc.close());
        };
        // Dependency array intentionally minimal to prevent reconnect loops
    }, [isJoined, roomId, myId]);

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
