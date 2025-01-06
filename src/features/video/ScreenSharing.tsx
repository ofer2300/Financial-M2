import React, { useEffect, useRef, useState } from 'react';
import { WebRTCManager, WebRTCError } from './WebRTCManager';

interface ScreenSharingProps {
  webrtcManager: WebRTCManager;
  onStart: () => void;
  onStop: () => void;
  onError: (error: Error) => void;
}

export function ScreenSharing({ webrtcManager, onStart, onStop, onError }: ScreenSharingProps) {
  const [isSharing, setIsSharing] = useState(false);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const producerIdRef = useRef<string | null>(null);

  const startSharing = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      screenTrackRef.current = screenStream.getVideoTracks()[0];
      
      // הוספת מאזין לסיום שיתוף המסך
      screenTrackRef.current.onended = () => {
        stopSharing();
      };

      // יצירת producer עבור שיתוף המסך
      producerIdRef.current = await webrtcManager.produce(screenTrackRef.current);

      setIsSharing(true);
      onStart();
    } catch (error) {
      if (error instanceof WebRTCError) {
        onError(error);
      } else {
        onError(new Error('Failed to start screen sharing'));
      }
    }
  };

  const stopSharing = async () => {
    try {
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
        screenTrackRef.current = null;
      }

      if (producerIdRef.current) {
        webrtcManager.closeProducer(producerIdRef.current);
        producerIdRef.current = null;
      }

      setIsSharing(false);
      onStop();
    } catch (error) {
      if (error instanceof WebRTCError) {
        onError(error);
      } else {
        onError(new Error('Failed to stop screen sharing'));
      }
    }
  };

  useEffect(() => {
    return () => {
      if (isSharing) {
        stopSharing();
      }
    };
  }, []);

  return (
    <div className="screen-sharing">
      <button
        onClick={isSharing ? stopSharing : startSharing}
        className={`screen-sharing-button ${isSharing ? 'active' : ''}`}
      >
        {isSharing ? 'הפסק שיתוף מסך' : 'שתף מסך'}
      </button>

      {isSharing && (
        <div className="screen-sharing-indicator">
          משתף מסך...
        </div>
      )}
    </div>
  );
}

// סגנונות CSS
const styles = `
.screen-sharing {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.screen-sharing-button {
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  border: none;
  background-color: #2563eb;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s;
}

.screen-sharing-button:hover:not(:disabled) {
  background-color: #1d4ed8;
}

.screen-sharing-button.active {
  background-color: #dc2626;
}

.screen-sharing-button.active:hover {
  background-color: #b91c1c;
}

.screen-sharing-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #22c55e;
  font-size: 0.875rem;
}

.screen-sharing-indicator::before {
  content: '';
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background-color: currentColor;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
}
`;

// הוספת הסגנונות לדף
const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet); 