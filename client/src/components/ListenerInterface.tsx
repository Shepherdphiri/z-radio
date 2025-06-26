import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Headphones, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useWebRTC } from '@/hooks/useWebRTC';
import { apiRequest } from '@/lib/queryClient';

export function ListenerInterface() {
  const [broadcastUrl, setBroadcastUrl] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([50]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  const { isConnected, audioStream, joinBroadcast } = useWebRTC({
    roomId: currentRoomId,
    isBroadcaster: false,
  });

  // Set up audio stream when received
  useEffect(() => {
    if (audioStream && audioRef.current) {
      audioRef.current.srcObject = audioStream;
      audioRef.current.volume = volume[0] / 100;
    }
  }, [audioStream, volume]);

  const handleJoinBroadcast = async () => {
    try {
      // Extract room ID from URL
      const url = new URL(broadcastUrl);
      const roomId = url.pathname.split('/').pop();
      
      if (!roomId) {
        throw new Error('Invalid broadcast URL');
      }

      // Check if broadcast exists and is active
      const response = await apiRequest('GET', `/api/broadcasts/room/${roomId}`);
      const broadcast = await response.json();

      if (!broadcast.isActive) {
        throw new Error('This broadcast is no longer active');
      }

      setCurrentRoomId(roomId);
      await joinBroadcast(roomId);

      toast({
        title: "Joined Broadcast",
        description: "Successfully connected to the broadcast.",
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
        <div key={i} className="w-1 h-2 bg-gray-300 rounded" />
      ));
    }

    return Array.from({ length: 5 }, (_, i) => (
      <div
        key={i}
        className={`w-1 bg-primary rounded animate-pulse`}
        style={{
          height: `${Math.random() * 16 + 8}px`,
          animationDelay: `${i * 0.1}s`,
        }}
      />
    ));
  };

  return (
    <Card className="mb-8">
      <CardHeader className="bg-gradient-to-r from-secondary to-gray-600 text-white">
        <CardTitle className="flex items-center space-x-3">
          <Headphones className="h-6 w-6" />
          <span>Listener Interface</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6">
        {/* Connection Status */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3 mb-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span className="font-medium text-gray-700">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="text-sm text-gray-600">
            {isConnected ? 'Receiving audio stream' : 'Enter a broadcast link to join a stream'}
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
              placeholder="Enter broadcast link..."
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
            <div className="flex items-center space-x-1">
              {renderAudioIndicator()}
            </div>
          </div>

          <div className="text-center mt-4 text-sm text-gray-600">
            {isConnected ? 
              (isPlaying ? 'Playing live audio' : 'Audio ready - click play') : 
              'No active broadcast'
            }
          </div>
        </div>

        {/* Hidden audio element */}
        <audio
          ref={audioRef}
          autoPlay
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          className="hidden"
        />
      </CardContent>
    </Card>
  );
}
