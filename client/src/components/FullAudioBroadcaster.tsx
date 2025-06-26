import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, Play, Square, Copy, Users, Signal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface FullAudioBroadcasterProps {
  onBroadcastStart: (roomId: string) => void;
  onBroadcastStop: () => void;
}

export function FullAudioBroadcaster({ onBroadcastStart, onBroadcastStop }: FullAudioBroadcasterProps) {
  const [isLive, setIsLive] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [listenerCount, setListenerCount] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const { toast } = useToast();

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 11);
  };

  const getBroadcastLink = () => {
    if (!roomId) return '';
    return `${window.location.origin}/listen/${roomId}`;
  };

  const copyBroadcastLink = () => {
    if (roomId) {
      navigator.clipboard.writeText(getBroadcastLink());
      toast({
        title: "Link Copied",
        description: "Broadcast link copied to clipboard.",
      });
    }
  };

  const setupAudioAnalyzer = (stream: MediaStream) => {
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    
    analyser.fftSize = 256;
    source.connect(analyser);
    
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    
    const updateAudioLevel = () => {
      if (analyser) {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);
        
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        setAudioLevel(average);
        
        if (isLive) {
          requestAnimationFrame(updateAudioLevel);
        }
      }
    };
    
    updateAudioLevel();
  };

  const initializeWebSocket = (roomId: string) => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Broadcaster WebSocket connected');
      ws.send(JSON.stringify({
        type: 'join-room',
        roomId: roomId
      }));
    };

    ws.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'room-update') {
        setListenerCount(Math.max(0, message.data.listenerCount - 1));
      }
      
      // Handle new listener joining
      if (message.type === 'listener-joined' && mediaStreamRef.current) {
        await createOfferForListener(message.sessionId, roomId);
      }
      
      // Handle WebRTC signaling from listeners
      if (message.type === 'answer') {
        const pc = peerConnectionsRef.current.get(message.sessionId);
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(message.data));
        }
      }
      
      if (message.type === 'ice-candidate') {
        const pc = peerConnectionsRef.current.get(message.sessionId);
        if (pc) {
          await pc.addIceCandidate(new RTCIceCandidate(message.data));
        }
      }
    };

    ws.onerror = (error) => {
      console.error('Broadcaster WebSocket error:', error);
    };

    return ws;
  };

  const createOfferForListener = async (sessionId: string, roomId: string) => {
    if (!mediaStreamRef.current || !wsRef.current) return;

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'ice-candidate',
          roomId: roomId,
          sessionId: sessionId,
          data: event.candidate
        }));
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`Connection to ${sessionId}:`, pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        peerConnectionsRef.current.delete(sessionId);
      }
    };

    // Add audio track to peer connection
    mediaStreamRef.current.getTracks().forEach(track => {
      pc.addTrack(track, mediaStreamRef.current!);
    });

    peerConnectionsRef.current.set(sessionId, pc);

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      wsRef.current.send(JSON.stringify({
        type: 'offer',
        roomId: roomId,
        sessionId: sessionId,
        data: offer
      }));
    } catch (error) {
      console.error('Error creating offer:', error);
      peerConnectionsRef.current.delete(sessionId);
    }
  };

  const handleStartBroadcast = async () => {
    try {
      const newRoomId = generateRoomId();
      
      // Create broadcast record
      const response = await fetch('/api/broadcasts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: newRoomId,
          title: `Live Broadcast ${newRoomId}`,
          audioQuality: 'high',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create broadcast');
      }

      // Get user media with high quality settings
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 2
        }
      });

      mediaStreamRef.current = stream;
      setupAudioAnalyzer(stream);

      // Initialize WebSocket
      initializeWebSocket(newRoomId);

      setRoomId(newRoomId);
      setIsLive(true);
      onBroadcastStart(newRoomId);

      toast({
        title: "Broadcast Started",
        description: "Your live broadcast is now active. Share the link with listeners.",
      });

    } catch (error) {
      console.error('Error starting broadcast:', error);
      toast({
        title: "Broadcast Failed",
        description: "Unable to start broadcast. Please check your microphone permissions.",
        variant: "destructive",
      });
    }
  };

  const handleStopBroadcast = async () => {
    try {
      // Stop media stream
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }

      // Close all peer connections
      peerConnectionsRef.current.forEach(pc => pc.close());
      peerConnectionsRef.current.clear();

      // Close audio context
      if (audioContextRef.current) {
        await audioContextRef.current.close();
        audioContextRef.current = null;
      }

      // Close WebSocket
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      // Update broadcast status
      if (roomId) {
        await fetch(`/api/broadcasts/${roomId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ isActive: false }),
        });
      }

      setIsLive(false);
      setListenerCount(0);
      setRoomId(null);
      setAudioLevel(0);
      onBroadcastStop();

      toast({
        title: "Broadcast Stopped",
        description: "Your broadcast has ended.",
      });

    } catch (error) {
      console.error('Error stopping broadcast:', error);
    }
  };

  const renderAudioIndicator = () => {
    if (!isLive) {
      return Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="w-2 h-4 bg-gray-300 rounded" />
      ));
    }

    return Array.from({ length: 5 }, (_, i) => (
      <div
        key={i}
        className={`w-2 bg-red-500 rounded transition-all duration-75`}
        style={{
          height: `${Math.max(4, (audioLevel / 255) * 24 + Math.random() * 4)}px`,
        }}
      />
    ));
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      peerConnectionsRef.current.forEach(pc => pc.close());
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <Card className="mb-8">
      <CardHeader className="bg-gradient-to-r from-red-600 to-red-700 text-white">
        <CardTitle className="flex items-center space-x-3">
          <Mic className="h-6 w-6" />
          <span>Live Audio Broadcaster</span>
          {isLive && <Signal className="h-5 w-5 animate-pulse" />}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6">
        {/* Status */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className="font-medium text-gray-700">
                {isLive ? 'Broadcasting Live' : 'Ready to Broadcast'}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Users className="h-4 w-4" />
                <span>{listenerCount} listeners</span>
              </div>
              <div className="flex items-end space-x-1 h-6">
                {renderAudioIndicator()}
              </div>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            {isLive ? 'Your audio is being streamed live via WebRTC to all connected listeners' : 'Click Start to begin broadcasting your audio live'}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 mb-6">
          {!isLive ? (
            <Button
              onClick={handleStartBroadcast}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Live Broadcast
            </Button>
          ) : (
            <Button
              onClick={handleStopBroadcast}
              variant="destructive"
              className="flex-1"
            >
              <Square className="h-4 w-4 mr-2" />
              Stop Broadcast
            </Button>
          )}
        </div>

        {/* Broadcast Link */}
        {roomId && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <Label className="block text-sm font-medium text-gray-700 mb-2">
              Share This Link with Listeners
            </Label>
            <div className="flex">
              <Input
                type="text"
                value={getBroadcastLink()}
                readOnly
                className="flex-1 bg-gray-50 text-gray-600 text-sm rounded-r-none"
              />
              <Button
                onClick={copyBroadcastLink}
                className="rounded-l-none"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Listeners can join your live audio broadcast using this link
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}