import React, { useState, useEffect } from 'react';
import { Signal } from 'lucide-react';

export function ConnectionQuality({ peerConnection }) {
  const [quality, setQuality] = useState('excellent');

  useEffect(() => {
    if (!peerConnection) {
      setQuality('excellent');
      return;
    }

    const checkQuality = async () => {
      try {
        const stats = await peerConnection.getStats();
        let packetsLost = 0;
        let packetsReceived = 0;
        let currentRoundTripTime = 0;

        stats.forEach(report => {
          if (report.type === 'inbound-rtp' && report.kind === 'audio') {
            packetsLost = report.packetsLost || 0;
            packetsReceived = report.packetsReceived || 0;
          }
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            currentRoundTripTime = report.currentRoundTripTime || 0;
          }
        });

        // Calculate packet loss percentage
        const totalPackets = packetsLost + packetsReceived;
        const lossPercentage = totalPackets > 0 ? (packetsLost / totalPackets) * 100 : 0;

        // Determine quality based on loss percentage and RTT
        if (lossPercentage < 1 && currentRoundTripTime < 0.05) {
          setQuality('excellent');
        } else if (lossPercentage < 3 && currentRoundTripTime < 0.1) {
          setQuality('good');
        } else if (lossPercentage < 5 && currentRoundTripTime < 0.15) {
          setQuality('fair');
        } else {
          setQuality('poor');
        }
      } catch (err) {
        // Fallback if stats are unavailable
        setQuality('excellent');
      }
    };

    checkQuality();
    const interval = setInterval(checkQuality, 2000);
    return () => clearInterval(interval);
  }, [peerConnection]);

  const getQualityLabel = () => {
    switch (quality) {
      case 'excellent':
        return 'Excellent';
      case 'good':
        return 'Good';
      case 'fair':
        return 'Fair';
      case 'poor':
        return 'Poor';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className={`connection-indicator ${quality}`}>
      <div className="quality-bars">
        <div className="quality-bar bar-1"></div>
        <div className="quality-bar bar-2"></div>
        <div className="quality-bar bar-3"></div>
      </div>
      <span>{getQualityLabel()}</span>
    </div>
  );
}
