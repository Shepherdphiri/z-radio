import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Headphones, Play, Pause, Volume2, VolumeX, Signal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function WorkingListener() {
  const [broadcastUrl, setBroadcastUrl] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([50]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
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
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'offer' && peerConnectionRef.current) {
        handleOffer(message.data, roomId, ws);
      }
      
      if (message.type === 'ice-candidate' && peerConnectionRef.current) {
        peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(message.data));
      }
    };

    ws.onerror = (error) => {
      console.error('Listener WebSocket error:', error);
    };

    return ws;
  };

  const handleOffer = async (offer: RTCSessionDescriptionInit, roomId: string, ws: WebSocket) => {
    if (!peerConnectionRef.current) return;

    try {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
      
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);
      
      ws.send(JSON.stringify({
        type: 'answer',
        roomId: roomId,
        data: answer
      }));
    } catch (error) {
      console.error('Error handling offer:', error);
    }
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

    pc.ontrack = (event) => {
      console.log('Received audio track');
      if (audioRef.current) {
        audioRef.current.srcObject = event.streams[0];
        setIsPlaying(true);
        
        // Set up audio level monitoring
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(event.streams[0]);
        const analyser = audioContext.createAnalyser();
        source.connect(analyser);
        
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const updateAudioLevel = () => {
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / bufferLength;
          setAudioLevel(average);
          requestAnimationFrame(updateAudioLevel);
        };
        updateAudioLevel();
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Listener connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        toast({
          title: "Audio Connected",
          description: "Now receiving live audio stream.",
        });
      }
    };

    peerConnectionRef.current = pc;
    return pc;
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
        throw new Error('Broadcast not found');
      }

      const broadcast = await response.json();

      if (!broadcast.isActive) {
        throw new Error('This broadcast is no longer active');
      }

      // Initialize WebSocket
      const ws = initializeWebSocket(roomId);

      // Wait for WebSocket to connect
      await new Promise((resolve) => {
        ws.onopen = resolve;
      });

      // Create peer connection
      createPeerConnection(roomId, ws);

      setCurrentRoomId(roomId);
      setIsConnected(true);

      toast({
        title: "Connected to Broadcast",
        description: `Joined broadcast: ${broadcast.title}`,
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
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleVolumeChange = (newVolume: number[]) => {
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume[0] / 100;
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
          height: `${Math.max(4, (audioLevel / 255) * 24 + Math.random() * 4)}px`,
        }}
      />
    ));
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <Card className="mb-8">
      <CardHeader className="bg-gradient-to-r from-secondary to-gray-600 text-white">
        <CardTitle className="flex items-center space-x-3">
          <Headphones className="h-6 w-6" />
          <span>Listen to Live Broadcast</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6">
        {/* Connection Status */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3 mb-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span className="font-medium text-gray-700">
              {isConnected ? 'Connected to Broadcast' : 'Not Connected'}
            </span>
            {isConnected && (
              <Signal className="h-4 w-4 text-green-500" />
            )}
          </div>
          <div className="text-sm text-gray-600">
            {isConnected ? 'Receiving live audio via WebRTC' : 'Enter a broadcast link or room ID to join'}
          </div>
        </div>

        {/* Join Broadcast */}
        <div className="mb-6">
          <Label className="block text-sm font-medium text-gray-700 mb-2">
            Join Broadcast
          </Label>
          <div className="flex">
            <Input
              type="text"
              value={broadcastUrl}
              onChange={(e) => setBroadcastUrl(e.target.value)}
              placeholder="Enter broadcast link or room ID..."
              className="flex-1 rounded-r-none"
            />
            <Button
              onClick={handleJoinBroadcast}
              disabled={!broadcastUrl.trim()}
              className="rounded-l-none"
            >
              Join
            </Button>
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
              'No active broadcast'
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