import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Headphones, Play, Pause, Volume2, VolumeX, Signal, Wifi } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function FullAudioListener() {
  const [broadcastUrl, setBroadcastUrl] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([50]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState('');
  const audioRef = useRef<HTMLAudioElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const { toast } = useToast();

  const initializeWebSocket = (roomId: string) => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Listener WebSocket connected');
      ws.send(JSON.stringify({
        type: 'join-room',
        roomId: roomId
      }));
      
      // Request audio stream from broadcaster
      ws.send(JSON.stringify({
        type: 'listener-joined',
        roomId: roomId,
        sessionId: Math.random().toString(36).substr(2, 9)
      }));
    };

    ws.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'offer' && !peerConnectionRef.current) {
        await handleOffer(message.data, roomId, ws, message.sessionId);
      }
      
      if (message.type === 'ice-candidate' && peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(message.data));
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      }
    };

    ws.onerror = (error) => {
      console.error('Listener WebSocket error:', error);
      setConnectionQuality('Poor');
    };

    ws.onclose = () => {
      setIsConnected(false);
      setConnectionQuality('Disconnected');
    };

    return ws;
  };

  const handleOffer = async (offer: RTCSessionDescriptionInit, roomId: string, ws: WebSocket, sessionId: string) => {
    try {
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
            sessionId: sessionId,
            data: event.candidate
          }));
        }
      };

      pc.ontrack = (event) => {
        console.log('Received audio track from broadcaster');
        if (audioRef.current) {
          audioRef.current.srcObject = event.streams[0];
          setIsPlaying(true);
          setupAudioAnalyzer(event.streams[0]);
          
          toast({
            title: "Audio Connected",
            description: "Now receiving live audio stream from broadcaster.",
          });
        }
      };

      pc.onconnectionstatechange = () => {
        console.log('Listener connection state:', pc.connectionState);
        switch (pc.connectionState) {
          case 'connected':
            setConnectionQuality('Excellent');
            break;
          case 'connecting':
            setConnectionQuality('Connecting...');
            break;
          case 'disconnected':
          case 'failed':
            setConnectionQuality('Poor');
            setIsPlaying(false);
            break;
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      ws.send(JSON.stringify({
        type: 'answer',
        roomId: roomId,
        sessionId: sessionId,
        data: answer
      }));

      peerConnectionRef.current = pc;
      setConnectionQuality('Good');

    } catch (error) {
      console.error('Error handling offer:', error);
      toast({
        title: "Connection Error",
        description: "Failed to establish audio connection.",
        variant: "destructive",
      });
    }
  };

  const setupAudioAnalyzer = (stream: MediaStream) => {
    try {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      const updateAudioLevel = () => {
        if (analyser && isConnected) {
          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          analyser.getByteFrequencyData(dataArray);
          
          const average = dataArray.reduce((a, b) => a + b) / bufferLength;
          setAudioLevel(average);
          
          requestAnimationFrame(updateAudioLevel);
        }
      };
      
      updateAudioLevel();
    } catch (error) {
      console.error('Error setting up audio analyzer:', error);
    }
  };

  const handleJoinBroadcast = async () => {
    try {
      // Extract room ID from URL or use direct room ID
      let roomId = broadcastUrl.trim();
      
      if (broadcastUrl.includes('/listen/')) {
        const url = new URL(broadcastUrl);
        roomId = url.pathname.split('/').pop() || '';
      }
      
      if (!roomId) {
        throw new Error('Invalid broadcast URL or room ID');
      }

      // Check if broadcast exists and is active
      const response = await fetch(`/api/broadcasts/room/${roomId}`);
      
      if (!response.ok) {
        throw new Error('Broadcast not found or is not active');
      }

      const broadcast = await response.json();

      if (!broadcast.isActive) {
        throw new Error('This broadcast is no longer active');
      }

      // Initialize WebSocket and WebRTC connections
      initializeWebSocket(roomId);

      setCurrentRoomId(roomId);
      setIsConnected(true);
      setConnectionQuality('Connecting...');

      toast({
        title: "Connecting to Broadcast",
        description: `Joining broadcast: ${broadcast.title}`,
      });

    } catch (error) {
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Unable to join broadcast.",
        variant: "destructive",
      });
    }
  };

  const handleTogglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(error => {
          console.error('Error playing audio:', error);
        });
      }
    }
  };

  const handleVolumeChange = (newVolume: number[]) => {
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume[0] / 100;
    }
  };

  const handleDisconnect = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    setIsConnected(false);
    setIsPlaying(false);
    setCurrentRoomId(null);
    setAudioLevel(0);
    setConnectionQuality('');
    
    if (audioRef.current) {
      audioRef.current.srcObject = null;
    }
  };

  const renderAudioIndicator = () => {
    if (!isConnected || !isPlaying) {
      return Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="w-2 h-4 bg-gray-300 rounded" />
      ));
    }

    return Array.from({ length: 5 }, (_, i) => (
      <div
        key={i}
        className={`w-2 bg-green-500 rounded transition-all duration-75`}
        style={{
          height: `${Math.max(4, (audioLevel / 255) * 24 + Math.random() * 2)}px`,
        }}
      />
    ));
  };

  const getConnectionIcon = () => {
    switch (connectionQuality) {
      case 'Excellent':
        return <Signal className="h-4 w-4 text-green-500" />;
      case 'Good':
        return <Wifi className="h-4 w-4 text-blue-500" />;
      case 'Poor':
        return <Signal className="h-4 w-4 text-yellow-500" />;
      default:
        return <Signal className="h-4 w-4 text-gray-400" />;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      handleDisconnect();
    };
  }, []);

  return (
    <Card className="mb-8">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <CardTitle className="flex items-center space-x-3">
          <Headphones className="h-6 w-6" />
          <span>Listen to Live Broadcast</span>
          {isConnected && getConnectionIcon()}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6">
        {/* Connection Status */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3 mb-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span className="font-medium text-gray-700">
              {isConnected ? 'Connected to Live Broadcast' : 'Not Connected'}
            </span>
            {connectionQuality && (
              <span className="text-sm text-gray-500">({connectionQuality})</span>
            )}
          </div>
          <div className="text-sm text-gray-600">
            {isConnected ? 'Receiving live audio via WebRTC connection' : 'Enter a broadcast link or room ID to join'}
          </div>
        </div>

        {/* Join Broadcast */}
        <div className="mb-6">
          <Label className="block text-sm font-medium text-gray-700 mb-2">
            Join Live Broadcast
          </Label>
          <div className="flex">
            <Input
              type="text"
              value={broadcastUrl}
              onChange={(e) => setBroadcastUrl(e.target.value)}
              placeholder="Enter broadcast link or room ID..."
              className="flex-1 rounded-r-none"
              disabled={isConnected}
            />
            {!isConnected ? (
              <Button
                onClick={handleJoinBroadcast}
                disabled={!broadcastUrl.trim()}
                className="rounded-l-none"
              >
                Join
              </Button>
            ) : (
              <Button
                onClick={handleDisconnect}
                variant="outline"
                className="rounded-l-none"
              >
                Leave
              </Button>
            )}
          </div>
        </div>

        {/* Audio Player Interface */}
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex items-center justify-center space-x-6">
            {/* Volume Control */}
            <div className="flex items-center space-x-2">
              <VolumeX className="h-4 w-4 text-gray-400" />
              <Slider
                value={volume}
                onValueChange={handleVolumeChange}
                max={100}
                step={1}
                className="w-20"
                disabled={!isConnected}
              />
              <Volume2 className="h-4 w-4 text-gray-400" />
            </div>

            {/* Play/Pause Control */}
            <Button
              onClick={handleTogglePlayback}
              disabled={!isConnected}
              size="lg"
              className="w-16 h-16 rounded-full"
            >
              {isPlaying ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6 ml-1" />
              )}
            </Button>

            {/* Audio Indicator */}
            <div className="flex items-end space-x-1 h-8">
              {renderAudioIndicator()}
            </div>
          </div>

          <div className="text-center mt-4 text-sm text-gray-600">
            {isConnected ? 
              (isPlaying ? 'Playing live audio stream' : 'Audio ready - click play') : 
              'No active broadcast connection'
            }
          </div>
        </div>

        {/* Audio element */}
        <audio
          ref={audioRef}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          autoPlay
          className="hidden"
        />
      </CardContent>
    </Card>
  );
}