import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MicVocal, Play, Square, Mic, MicOff, Copy, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useWebRTC } from '@/hooks/useWebRTC';
import { apiRequest } from '@/lib/queryClient';

interface BroadcasterPanelProps {
  onBroadcastStart: (roomId: string) => void;
  onBroadcastStop: () => void;
}

export function BroadcasterPanel({ onBroadcastStart, onBroadcastStop }: BroadcasterPanelProps) {
  const [isLive, setIsLive] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [audioQuality, setAudioQuality] = useState('high');
  const [listenerCount, setListenerCount] = useState(0);
  const { toast } = useToast();

  const {
    isConnected,
    audioDevices,
    selectedDevice,
    setSelectedDevice,
    isMuted,
    startBroadcast,
    stopBroadcast,
    toggleMute,
  } = useWebRTC({ roomId, isBroadcaster: true });

  const generateRoomId = () => {
    return Math.random().toString(36).substr(2, 9);
  };

  const handleStartBroadcast = async () => {
    try {
      const newRoomId = generateRoomId();
      
      // Create broadcast record
      await apiRequest('POST', '/api/broadcasts', {
        roomId: newRoomId,
        title: `Broadcast ${newRoomId}`,
        audioQuality,
      });

      setRoomId(newRoomId);
      await startBroadcast();
      setIsLive(true);
      onBroadcastStart(newRoomId);

      toast({
        title: "Broadcast Started",
        description: "Your broadcast is now live and listeners can join.",
      });
    } catch (error) {
      toast({
        title: "Broadcast Failed",
        description: "Unable to start broadcast. Please check your microphone permissions.",
        variant: "destructive",
      });
    }
  };

  const handleStopBroadcast = async () => {
    if (roomId) {
      try {
        await apiRequest('PATCH', `/api/broadcasts/${roomId}`, {
          isActive: false,
        });
        
        stopBroadcast();
        setIsLive(false);
        setRoomId(null);
        setListenerCount(0);
        onBroadcastStop();

        toast({
          title: "Broadcast Stopped",
          description: "Your broadcast has ended.",
        });
      } catch (error) {
        console.error('Failed to stop broadcast:', error);
      }
    }
  };

  const copyBroadcastLink = () => {
    if (roomId) {
      const link = `${window.location.origin}/listen/${roomId}`;
      navigator.clipboard.writeText(link);
      toast({
        title: "Link Copied",
        description: "Broadcast link copied to clipboard.",
      });
    }
  };

  const getBroadcastLink = () => {
    if (!roomId) return '';
    return `${window.location.origin}/listen/${roomId}`;
  };

  return (
    <Card className="mb-8">
      <CardHeader className="bg-gradient-to-r from-primary to-blue-600 text-white">
        <CardTitle className="flex items-center space-x-3">
          <MicVocal className="h-6 w-6" />
          <span>Broadcast Control Panel</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6">
        {/* Broadcast Status */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className="font-medium text-gray-700">
                {isLive ? 'Broadcasting Live' : 'Not Broadcasting'}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Users className="h-4 w-4" />
              <span>{listenerCount} listeners</span>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            {isLive ? 'Your broadcast is live and listeners can join' : 'Ready to start your broadcast'}
          </div>
        </div>

        {/* Audio Device Selection */}
        <div className="mb-6">
          <Label className="block text-sm font-medium text-gray-700 mb-2">
            Audio Input Device
          </Label>
          <Select value={selectedDevice} onValueChange={setSelectedDevice}>
            <SelectTrigger>
              <SelectValue placeholder="Select microphone" />
            </SelectTrigger>
            <SelectContent>
              {audioDevices.map((device) => (
                <SelectItem key={device.deviceId} value={device.deviceId || 'default'}>
                  {device.label || `Microphone ${device.deviceId?.slice(0, 8) || 'Default'}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Audio Quality Selection */}
        <div className="mb-6">
          <Label className="block text-sm font-medium text-gray-700 mb-2">
            Audio Quality
          </Label>
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant={audioQuality === 'high' ? 'default' : 'outline'}
              onClick={() => setAudioQuality('high')}
              className="text-sm"
            >
              High (128kbps)
            </Button>
            <Button
              variant={audioQuality === 'medium' ? 'default' : 'outline'}
              onClick={() => setAudioQuality('medium')}
              className="text-sm"
            >
              Medium (64kbps)
            </Button>
            <Button
              variant={audioQuality === 'low' ? 'default' : 'outline'}
              onClick={() => setAudioQuality('low')}
              className="text-sm"
            >
              Low (32kbps)
            </Button>
          </div>
        </div>

        {/* Broadcast Controls */}
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 mb-6">
          <Button
            onClick={handleStartBroadcast}
            disabled={isLive}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            <Play className="h-4 w-4 mr-2" />
            Start Broadcast
          </Button>
          <Button
            onClick={handleStopBroadcast}
            disabled={!isLive}
            variant="destructive"
            className="flex-1"
          >
            <Square className="h-4 w-4 mr-2" />
            Stop Broadcast
          </Button>
          <Button
            onClick={toggleMute}
            disabled={!isLive}
            variant="outline"
            className="flex items-center justify-center"
          >
            {isMuted ? <MicOff className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
            {isMuted ? 'Unmute' : 'Mute'}
          </Button>
        </div>

        {/* Shareable Link */}
        {roomId && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <Label className="block text-sm font-medium text-gray-700 mb-2">
              Broadcast Link
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
              Share this link with listeners to join your broadcast
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
