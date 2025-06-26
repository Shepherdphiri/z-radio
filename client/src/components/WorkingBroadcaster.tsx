import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, Play, Square, Copy, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface WorkingBroadcasterProps {
  onBroadcastStart: (roomId: string) => void;
  onBroadcastStop: () => void;
}

export function WorkingBroadcaster({ onBroadcastStart, onBroadcastStop }: WorkingBroadcasterProps) {
  const [isLive, setIsLive] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [listenerCount, setListenerCount] = useState(0);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
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

  const initializeWebSocket = (roomId: string) => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      ws.send(JSON.stringify({
        type: 'join-room',
        roomId: roomId
      }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'room-update') {
        setListenerCount(message.data.listenerCount - 1); // Subtract broadcaster
      }
      
      // Handle WebRTC signaling
      if (message.type === 'answer' && peerConnectionRef.current) {
        peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(message.data));
      }
      
      if (message.type === 'ice-candidate' && peerConnectionRef.current) {
        peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(message.data));
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return ws;
  };

  const createPeerConnection = (roomId: string, ws: WebSocket) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        ws.send(JSON.stringify({
          type: 'ice-candidate',
          roomId: roomId,
          data: event.candidate
        }));
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
    };

    peerConnectionRef.current = pc;
    return pc;
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

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });

      mediaStreamRef.current = stream;

      // Initialize WebSocket
      const ws = initializeWebSocket(newRoomId);

      // Wait for WebSocket to connect
      await new Promise((resolve) => {
        ws.onopen = resolve;
      });

      // Create peer connection
      const pc = createPeerConnection(newRoomId, ws);

      // Add stream to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

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

      // Close peer connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
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
      onBroadcastStop();

      toast({
        title: "Broadcast Stopped",
        description: "Your broadcast has ended.",
      });

    } catch (error) {
      console.error('Error stopping broadcast:', error);
    }
  };

  return (
    <Card className="mb-8">
      <CardHeader className="bg-gradient-to-r from-primary to-blue-600 text-white">
        <CardTitle className="flex items-center space-x-3">
          <Mic className="h-6 w-6" />
          <span>Live Audio Broadcaster</span>
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
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Users className="h-4 w-4" />
              <span>{listenerCount} listeners</span>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            {isLive ? 'Your audio is being streamed live via WebRTC' : 'Click Start to begin broadcasting'}
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
              Start Broadcast
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
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
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
              Listeners can join your broadcast using this link
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}