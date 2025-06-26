import { useState } from 'react';
import { BroadcasterPanel } from '@/components/BroadcasterPanel';
import { ListenerInterface } from '@/components/ListenerInterface';
import { StatusDashboard } from '@/components/StatusDashboard';
import { NotificationCenter } from '@/components/NotificationCenter';
import { Radio } from 'lucide-react';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string;
  dismissible?: boolean;
}

export default function BroadcastPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentBroadcast, setCurrentBroadcast] = useState<string | null>(null);

  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { ...notification, id }]);
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleBroadcastStart = (roomId: string) => {
    setCurrentBroadcast(roomId);
    addNotification({
      type: 'success',
      title: 'Broadcast Started Successfully',
      message: 'Your broadcast is now live and listeners can join using the shared link.',
    });
  };

  const handleBroadcastStop = () => {
    setCurrentBroadcast(null);
    addNotification({
      type: 'success',
      title: 'Broadcast Ended',
      message: 'Your broadcast has been stopped successfully.',
    });
  };

  const handleRetryConnection = () => {
    // Implement retry logic here
    console.log('Retrying connection...');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Radio className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">StreamCast</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span>System Online</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Notification Center */}
        <NotificationCenter
          notifications={notifications}
          onDismiss={dismissNotification}
          onRetry={handleRetryConnection}
        />

        {/* Broadcaster Panel */}
        <BroadcasterPanel
          onBroadcastStart={handleBroadcastStart}
          onBroadcastStop={handleBroadcastStop}
        />

        {/* Listener Interface */}
        <ListenerInterface />

        {/* Status Dashboard */}
        <StatusDashboard />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                <Radio className="h-3 w-3 text-white" />
              </div>
              <span className="text-gray-600 text-sm">StreamCast - Professional Audio Broadcasting</span>
            </div>
            <div className="text-sm text-gray-600">
              Developed by{' '}
              <a
                href="https://shepherd-portfolio.onrender.com"
                className="text-primary hover:text-blue-600 font-medium transition-colors duration-200"
                target="_blank"
                rel="noopener noreferrer"
              >
                Shepherd Zisper Phiri
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
