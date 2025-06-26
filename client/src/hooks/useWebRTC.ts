import { useEffect, useRef, useState } from 'react';
import { useWebSocket } from './useWebSocket';

interface UseWebRTCProps {
  roomId: string | null;
  isBroadcaster: boolean;
}

export function useWebRTC({ roomId, isBroadcaster }: UseWebRTCProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [isMuted, setIsMuted] = useState(false);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const { sendMessage, lastMessage, isConnected: wsConnected } = useWebSocket();

  // Get available audio devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        setAudioDevices(audioInputs);
        if (audioInputs.length > 0 && !selectedDevice) {
          setSelectedDevice(audioInputs[0].deviceId);
        }
      } catch (error) {
        console.error('Failed to get audio devices:', error);
      }
    };
    getDevices();
  }, [selectedDevice]);

  // Handle WebSocket messages for WebRTC signaling
  useEffect(() => {
    if (!lastMessage || !peerConnectionRef.current) return;

    const handleSignaling = async () => {
      const pc = peerConnectionRef.current!;

      switch (lastMessage.type) {
        case 'offer':
          if (!isBroadcaster) {
            await pc.setRemoteDescription(lastMessage.data);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sendMessage({ type: 'answer', roomId: roomId!, data: answer });
          }
          break;

        case 'answer':
          if (isBroadcaster) {
            await pc.setRemoteDescription(lastMessage.data);
          }
          break;

        case 'ice-candidate':
          await pc.addIceCandidate(lastMessage.data);
          break;
      }
    };

    handleSignaling().catch(console.error);
  }, [lastMessage, isBroadcaster, roomId, sendMessage]);

  const initializePeerConnection = () => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && roomId) {
        sendMessage({
          type: 'ice-candidate',
          roomId,
          data: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      if (!isBroadcaster) {
        setAudioStream(event.streams[0]);
        setIsConnected(true);
      }
    };

    pc.onconnectionstatechange = () => {
      setIsConnected(pc.connectionState === 'connected');
    };

    peerConnectionRef.current = pc;
    return pc;
  };

  const startBroadcast = async () => {
    if (!roomId) {
      throw new Error('No room ID provided');
    }

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: selectedDevice ? { exact: selectedDevice } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      setAudioStream(stream);
      
      // Wait for WebSocket connection
      if (!wsConnected) {
        // Give WebSocket time to connect
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const pc = initializePeerConnection();
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Join the room
      sendMessage({ type: 'join-room', roomId });

      setIsConnected(true);
    } catch (error) {
      console.error('Failed to start broadcast:', error);
      throw error;
    }
  };

  const stopBroadcast = () => {
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
      setAudioStream(null);
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (roomId) {
      sendMessage({ type: 'leave-room', roomId });
    }

    setIsConnected(false);
  };

  const joinBroadcast = async (broadcastRoomId: string) => {
    if (!wsConnected) return;

    try {
      const pc = initializePeerConnection();
      sendMessage({ type: 'join-room', roomId: broadcastRoomId });
    } catch (error) {
      console.error('Failed to join broadcast:', error);
      throw error;
    }
  };

  const toggleMute = () => {
    if (audioStream) {
      audioStream.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  return {
    isConnected,
    audioStream,
    audioDevices,
    selectedDevice,
    setSelectedDevice,
    isMuted,
    startBroadcast,
    stopBroadcast,
    joinBroadcast,
    toggleMute,
  };
}
