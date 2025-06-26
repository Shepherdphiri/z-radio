import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, MicOff, Play, Square, Users, Copy } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface SimpleAudioRecorderProps {
  onBroadcastStart: (roomId: string) => void;
  onBroadcastStop: () => void;
}

export function SimpleAudioRecorder({ onBroadcastStart, onBroadcastStop }: SimpleAudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [listenerCount, setListenerCount] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const newRoomId = generateRoomId();
      setRoomId(newRoomId);

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

      mediaRecorder.start();
      setIsRecording(true);
      onBroadcastStart(newRoomId);

      toast({
        title: "Broadcast Started",
        description: "Your live broadcast is now active. Share the link with listeners.",
      });

    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Microphone Access Denied",
        description: "Please allow microphone access to start broadcasting.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = async () => {
    if (mediaRecorderRef.current && streamRef.current) {
      mediaRecorderRef.current.stop();
      streamRef.current.getTracks().forEach(track => track.stop());
      
      setIsRecording(false);
      setListenerCount(0);
      onBroadcastStop();

      // Update broadcast status
      if (roomId) {
        try {
          await fetch(`/api/broadcasts/${roomId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ isActive: false }),
          });
        } catch (error) {
          console.error('Error updating broadcast:', error);
        }
      }

      setRoomId(null);
      
      toast({
        title: "Broadcast Stopped",
        description: "Your broadcast has ended.",
      });
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
              <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className="font-medium text-gray-700">
                {isRecording ? 'Broadcasting Live' : 'Ready to Broadcast'}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Users className="h-4 w-4" />
              <span>{listenerCount} listeners</span>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            {isRecording ? 'Your audio is being broadcast live' : 'Click Start to begin broadcasting'}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 mb-6">
          {!isRecording ? (
            <Button
              onClick={startRecording}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Broadcast
            </Button>
          ) : (
            <Button
              onClick={stopRecording}
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