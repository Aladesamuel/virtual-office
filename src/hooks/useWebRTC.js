import { useState, useEffect, useRef, useCallback } from 'react';
import mqtt from 'mqtt';

// Config for WebRTC (Public STUN servers)
const pcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
    ]
};

export function useWebRTC(roomId, userName, isJoined) {
    const [peers, setPeers] = useState({});
    const [myId] = useState(() => `user_${Math.random().toString(36).substr(2, 9)}`);
    const [error, setError] = useState(null);
    const [myStatus, setMyStatus] = useState('Available');
    const [isMuted, setIsMuted] = useState(true);
    const [isLocked, setIsLocked] = useState(false);
    const [joinRequests, setJoinRequests] = useState([]);

    const mqttClient = useRef(null);
    const localStreamRef = useRef(null);
    const peerConnections = useRef({}); // { [peerId]: RTCPeerConnection }
    const idRef = useRef(null);



    // 1. Initialize Local Media
    useEffect(() => {
        if (!isJoined) return;
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            .then(stream => {
                stream.getAudioTracks().forEach(t => t.enabled = false);
                localStreamRef.current = stream;
            })
            .catch(err => setError("Mic access denied: " + err.message));

        return () => {
            if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
        };
    }, [isJoined]);

    // 2. Peer Connection Management
    const getPeerConnection = useCallback((remoteId) => {
        if (peerConnections.current[remoteId]) return peerConnections.current[remoteId];

        const pc = new RTCPeerConnection(pcConfig);
        peerConnections.current[remoteId] = pc;

        // Add local tracks
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, localStreamRef.current);
            });
        }

        pc.onicecandidate = (event) => {
            if (event.candidate && mqttClient.current) {
                mqttClient.current.publish(`vo/${roomId}/${remoteId}/signal`, JSON.stringify({
                    type: 'ice-candidate',
                    from: idRef.current,
                    candidate: event.candidate
                }));
            }
        };

        pc.ontrack = (event) => {
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
            if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                setPeers(prev => ({ ...prev, [remoteId]: { ...prev[remoteId], isTalking: false } }));
            }
        };

        return pc;
    }, [roomId]);

    // 3. MQTT Discovery & Signaling
    useEffect(() => {
        if (!isJoined || !roomId) return;

        idRef.current = myId;

        const client = mqtt.connect('wss://broker.emqx.io:8084/mqtt', {
            clientId: `vo_mqtt_${myId}`,
            will: {
                topic: `vo/${roomId}/${myId}/presence`,
                payload: '',
                retain: true,
                qos: 1
            }
        });
        mqttClient.current = client;

        client.on('connect', () => {
            // Subscribe to presence AND signaling
            client.subscribe(`vo/${roomId}/+/presence`);
            client.subscribe(`vo/${roomId}/${myId}/signal`);

            // Broadcast initial presence
            client.publish(`vo/${roomId}/${myId}/presence`, JSON.stringify({
                id: myId,
                name: userName,
                status: myStatus,
                isLocked: isLocked
            }), { retain: true, qos: 1 });
        });

        client.on('message', async (topic, message) => {
            const payloadStr = message.toString();

            // Presence Handling
            if (topic.includes('/presence')) {
                const remoteId = topic.split('/')[2];
                if (remoteId === myId) return;

                if (!payloadStr) {
                    setPeers(prev => {
                        const next = { ...prev };
                        delete next[remoteId];
                        return next;
                    });
                    if (peerConnections.current[remoteId]) {
                        peerConnections.current[remoteId].close();
                        delete peerConnections.current[remoteId];
                    }
                    return;
                }

                const state = JSON.parse(payloadStr);
                setPeers(prev => ({
                    ...prev,
                    [state.id]: { ...prev[state.id], ...state }
                }));
                return;
            }

            // Signaling Handling
            if (topic.includes('/signal')) {
                const data = JSON.parse(payloadStr);
                const fromId = data.from;
                const pc = getPeerConnection(fromId);

                if (data.type === 'join-request') {
                    setJoinRequests(prev => [...prev, { peerId: fromId, peerName: data.name }]);
                } else if (data.type === 'join-accepted') {
                    // Create Offer
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    client.publish(`vo/${roomId}/${fromId}/signal`, JSON.stringify({
                        type: 'offer',
                        from: myId,
                        offer: offer
                    }));
                } else if (data.type === 'offer') {
                    await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    client.publish(`vo/${roomId}/${fromId}/signal`, JSON.stringify({
                        type: 'answer',
                        from: myId,
                        answer: answer
                    }));
                } else if (data.type === 'answer') {
                    await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
                } else if (data.type === 'ice-candidate') {
                    try {
                        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                    } catch (e) {
                        console.error("Error adding ice candidate", e);
                    }
                }
            }
        });

        return () => {
            if (mqttClient.current) mqttClient.current.end();
            Object.values(peerConnections.current).forEach(pc => pc.close());
        };
    }, [isJoined, roomId, userName, myId, getPeerConnection, isLocked, myStatus]); // Stable deps

    // 4. API Functions
    const toggleMute = useCallback(() => {
        if (localStreamRef.current) {
            const track = localStreamRef.current.getAudioTracks()[0];
            track.enabled = !track.enabled;
            setIsMuted(!track.enabled);
        }
    }, []);

    const toggleLock = useCallback(() => {
        setIsLocked(prev => {
            const next = !prev;
            if (mqttClient.current) {
                mqttClient.current.publish(`vo/${roomId}/${myId}/presence`, JSON.stringify({
                    id: myId, name: userName, status: myStatus, isLocked: next
                }), { retain: true });
            }
            return next;
        });
    }, [myId, roomId, userName, myStatus]);

    const setStatus = useCallback((s) => {
        setMyStatus(s);
        if (mqttClient.current) {
            mqttClient.current.publish(`vo/${roomId}/${myId}/presence`, JSON.stringify({
                id: myId, name: userName, status: s, isLocked: isLocked
            }), { retain: true });
        }
    }, [myId, roomId, userName, isLocked]);

    const callPeer = useCallback(async (targetId) => {
        const target = peers[targetId];
        if (!target || !mqttClient.current) return;

        if (target.isLocked) {
            mqttClient.current.publish(`vo/${roomId}/${targetId}/signal`, JSON.stringify({
                type: 'join-request', from: myId, name: userName
            }));
        } else {
            // Direct call: Trigger the other side to accept a call (or we send offer)
            // To maintain compatibility with join-accepted flow, we'll send a virtual "accepted" signal
            mqttClient.current.publish(`vo/${roomId}/${myId}/signal`, JSON.stringify({
                type: 'join-accepted', from: targetId
            }));
            // NOTE: Actually simpler to just send OFFER directly
            const pc = getPeerConnection(targetId);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            mqttClient.current.publish(`vo/${roomId}/${targetId}/signal`, JSON.stringify({
                type: 'offer', from: myId, offer: offer
            }));
        }
    }, [myId, roomId, userName, peers, getPeerConnection]);

    const acceptJoinRequest = useCallback((remoteId) => {
        if (mqttClient.current) {
            mqttClient.current.publish(`vo/${roomId}/${remoteId}/signal`, JSON.stringify({
                type: 'join-accepted', from: myId
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
        peers, myId, error, myStatus, setMyStatus: setStatus,
        isMuted, toggleMute, isLocked, toggleLock,
        joinRequests, acceptJoinRequest, declineJoinRequest,
        callPeer, hangUpPeer
    };
}
