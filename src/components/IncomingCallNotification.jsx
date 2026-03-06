import React from 'react';
import { Phone, X } from 'lucide-react';

export function IncomingCallNotification({ callerName, onAccept, onDecline }) {
  return (
    <div className="incoming-call-notification">
      <div className="call-notification-content">
        <div className="notification-icon">
          <Phone size={20} color="white" />
        </div>
        <div className="notification-text">
          <span className="caller-name">{callerName}</span>
          <span className="call-status">is talking</span>
        </div>
      </div>

      <div className="notification-actions">
        <button
          className="notification-btn accept"
          onClick={onAccept}
          title="Accept call"
        >
          <Phone size={18} />
        </button>
        <button
          className="notification-btn decline"
          onClick={onDecline}
          title="Decline call"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
