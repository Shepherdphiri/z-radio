import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Headphones, Play, Pause, Volume2, VolumeX, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function SimpleListener() {
  const [broadcastUrl, setBroadcastUrl] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([50]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

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

      setCurrentRoomId(roomId);
      setIsConnected(true);

      toast({
        title: "Connected to Broadcast",
        description: `Joined broadcast: ${broadcast.title}`,
      });

      // Simulate audio connection for demo
      if (audioRef.current) {
        // Create a simple tone for demonstration
        const audioContext = new AudioContext();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        
        oscillator.start();
        setIsPlaying(true);
        
        // Stop after demo
        setTimeout(() => {
          oscillator.stop();
          setIsPlaying(false);
        }, 5000);
      }

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
          </div>
          <div className="text-sm text-gray-600">
            {isConnected ? 'Listening to live audio stream' : 'Enter a broadcast link or room ID to join'}
          </div>
        </div>

        {/* Demo Notice */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Demo Mode</h4>
              <p className="text-sm text-blue-700">
                This is a demonstration version. Real audio streaming requires full WebRTC implementation.
              </p>
            </div>
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
            <div className="flex items-center space-x-1">
              {renderAudioIndicator()}
            </div>
          </div>

          <div className="text-center mt-4 text-sm text-gray-600">
            {isConnected ? 
              (isPlaying ? 'Playing live audio (demo)' : 'Audio ready - click play') : 
              'No active broadcast'
            }
          </div>
        </div>

        {/* Hidden audio element */}
        <audio
          ref={audioRef}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          className="hidden"
        />
      </CardContent>
    </Card>
  );
}