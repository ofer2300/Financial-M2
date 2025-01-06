import React, { useEffect, useRef, useState } from 'react';
import { WebRTCManager, WebRTCConfig, WebRTCError } from './WebRTCManager';

interface Participant {
  id: string;
  name: string;
  videoTrack?: MediaStreamTrack;
  audioTrack?: MediaStreamTrack;
  isScreenSharing: boolean;
}

interface VideoConferenceRoomProps {
  roomId: string;
  userId: string;
  userName: string;
  onError: (error: Error) => void;
}

export function VideoConferenceRoom({ roomId, userId, userName, onError }: VideoConferenceRoomProps) {
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  
  const webrtcManagerRef = useRef<WebRTCManager | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    initializeConference();
    return () => {
      cleanup();
    };
  }, [roomId]);

  const initializeConference = async () => {
    try {
      const config: WebRTCConfig = {
        routerRtpCapabilities: await fetchRouterCapabilities(),
        iceServers: await fetchIceServers(),
        producerTransportOptions: await fetchProducerTransportOptions(),
        consumerTransportOptions: await fetchConsumerTransportOptions(),
      };

      webrtcManagerRef.current = new WebRTCManager(config);
      await webrtcManagerRef.current.initialize();
      
      await setupLocalMedia();
      await joinRoom();
      
      setIsConnected(true);
    } catch (error) {
      if (error instanceof WebRTCError) {
        onError(error);
      } else {
        onError(new Error('Failed to initialize conference'));
      }
    }
  };

  const setupLocalMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // יצירת producers עבור וידאו ואודיו
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];

      if (webrtcManagerRef.current) {
        await webrtcManagerRef.current.createProducerTransport();
        await webrtcManagerRef.current.produce(videoTrack);
        await webrtcManagerRef.current.produce(audioTrack);
      }
    } catch (error) {
      throw new WebRTCError('Failed to setup local media', error);
    }
  };

  const startScreenSharing = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });

      const screenTrack = screenStream.getVideoTracks()[0];
      
      if (webrtcManagerRef.current) {
        await webrtcManagerRef.current.produce(screenTrack);
      }

      screenTrack.onended = () => {
        stopScreenSharing();
      };

      setIsSharingScreen(true);
    } catch (error) {
      throw new WebRTCError('Failed to start screen sharing', error);
    }
  };

  const stopScreenSharing = () => {
    setIsSharingScreen(false);
    // כאן צריך להוסיף לוגיקה לסגירת ה-producer של שיתוף המסך
  };

  const joinRoom = async () => {
    try {
      await webrtcManagerRef.current?.createConsumerTransport();
      // כאן צריך להוסיף לוגיקה להצטרפות לחדר ויצירת consumers עבור משתתפים קיימים
    } catch (error) {
      throw new WebRTCError('Failed to join room', error);
    }
  };

  const cleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.close();
    }

    setIsConnected(false);
    setIsSharingScreen(false);
    setParticipants(new Map());
  };

  // פונקציות עזר לקבלת נתוני תצורה מהשרת
  const fetchRouterCapabilities = async () => {
    // כאן צריך להוסיף לוגיקה לקבלת יכולות ה-router מהשרת
    return {};
  };

  const fetchIceServers = async () => {
    // כאן צריך להוסיף לוגיקה לקבלת שרתי ICE מהשרת
    return [
      { urls: 'stun:stun.l.google.com:19302' },
    ];
  };

  const fetchProducerTransportOptions = async () => {
    // כאן צריך להוסיף לוגיקה לקבלת אפשרויות ה-producer transport מהשרת
    return {};
  };

  const fetchConsumerTransportOptions = async () => {
    // כאן צריך להוסיף לוגיקה לקבלת אפשרויות ה-consumer transport מהשרת
    return {};
  };

  return (
    <div className="video-conference-room">
      <div className="controls">
        <button
          onClick={startScreenSharing}
          disabled={!isConnected || isSharingScreen}
        >
          {isSharingScreen ? 'הפסק שיתוף מסך' : 'שתף מסך'}
        </button>
      </div>

      <div className="video-grid">
        <div className="video-container local">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
          />
          <div className="participant-name">
            {userName} (את/ה)
          </div>
        </div>

        {Array.from(participants.values()).map((participant) => (
          <div key={participant.id} className="video-container remote">
            <video
              id={`video-${participant.id}`}
              autoPlay
              playsInline
            />
            <div className="participant-name">
              {participant.name}
              {participant.isScreenSharing && ' (משתף מסך)'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 