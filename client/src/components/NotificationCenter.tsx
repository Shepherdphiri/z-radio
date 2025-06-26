import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertTriangle, X } from 'lucide-react';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string;
  dismissible?: boolean;
}

interface NotificationCenterProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
  onRetry?: () => void;
}

export function NotificationCenter({ notifications, onDismiss, onRetry }: NotificationCenterProps) {
  const [visibleNotifications, setVisibleNotifications] = useState<string[]>([]);

  useEffect(() => {
    const newNotifications = notifications
      .filter(n => !visibleNotifications.includes(n.id))
      .map(n => n.id);
    
    if (newNotifications.length > 0) {
      setVisibleNotifications(prev => [...prev, ...newNotifications]);
    }
  }, [notifications, visibleNotifications]);

  const handleDismiss = (id: string) => {
    setVisibleNotifications(prev => prev.filter(nId => nId !== id));
    onDismiss(id);
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getAlertVariant = (type: Notification['type']) => {
    switch (type) {
      case 'error':
        return 'destructive' as const;
      default:
        return 'default' as const;
    }
  };

  const getAlertClasses = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      default:
        return '';
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className="mb-8 space-y-4">
      {notifications.map((notification) => (
        <Alert
          key={notification.id}
          variant={getAlertVariant(notification.type)}
          className={getAlertClasses(notification.type)}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-0.5">
                {getIcon(notification.type)}
              </div>
              <div className="flex-1">
                <AlertTitle className="text-sm font-medium">
                  {notification.title}
                </AlertTitle>
                <AlertDescription className="text-sm mt-1">
                  {notification.message}
                </AlertDescription>
                {notification.type === 'error' && onRetry && (
                  <div className="mt-3 space-x-3">
                    <Button
                      onClick={onRetry}
                      size="sm"
                      variant="outline"
                      className="text-xs"
                    >
                      Try Again
                    </Button>
                    <Button
                      onClick={() => handleDismiss(notification.id)}
                      size="sm"
                      variant="ghost"
                      className="text-xs"
                    >
                      Dismiss
                    </Button>
                  </div>
                )}
              </div>
            </div>
            {notification.dismissible !== false && (
              <Button
                onClick={() => handleDismiss(notification.id)}
                variant="ghost"
                size="sm"
                className="p-1 h-auto"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </Alert>
      ))}
    </div>
  );
}
