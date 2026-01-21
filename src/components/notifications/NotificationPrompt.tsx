import { useState, useEffect } from 'react';
import { Bell, BellOff, X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useNotifications } from '@/hooks/use-notifications';
import { useToast } from '@/hooks/use-toast';

interface NotificationPromptProps {
  showOnMount?: boolean;
  delay?: number; // Delay in ms before showing prompt
}

export function NotificationPrompt({ showOnMount = true, delay = 3000 }: NotificationPromptProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { toast } = useToast();
  const {
    isSupported,
    permission,
    isLoading,
    enableNotifications,
    shouldShowPrompt
  } = useNotifications();

  // Check if user has previously dismissed the prompt
  useEffect(() => {
    const hasDismissed = localStorage.getItem('notification-prompt-dismissed');
    if (hasDismissed === 'true') {
      setDismissed(true);
    }
  }, []);

  // Show prompt after delay if conditions are met
  useEffect(() => {
    if (!showOnMount || dismissed || !shouldShowPrompt) return;

    const timer = setTimeout(() => {
      setShowDialog(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [showOnMount, delay, dismissed, shouldShowPrompt]);

  const handleEnable = async () => {
    const success = await enableNotifications();
    
    if (success) {
      toast({
        title: 'Notifications Enabled',
        description: 'You will now receive push notifications.',
      });
    } else {
      toast({
        title: 'Could not enable notifications',
        description: 'Please check your browser settings and try again.',
        variant: 'destructive'
      });
    }
    
    setShowDialog(false);
  };

  const handleDismiss = () => {
    setShowDialog(false);
    setDismissed(true);
    localStorage.setItem('notification-prompt-dismissed', 'true');
  };

  const handleLater = () => {
    setShowDialog(false);
    // Don't set dismissed, will show again on next visit
  };

  // Don't render if not supported or already granted/denied
  if (!isSupported || permission !== 'default' || isLoading) {
    return null;
  }

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
            <Bell className="h-8 w-8 text-white animate-pulse" />
          </div>
          <DialogTitle className="text-center text-xl">
            Stay Updated!
          </DialogTitle>
          <DialogDescription className="text-center">
            Enable push notifications to get reminders about:
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 py-4">
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
            <span className="text-sm">Credit card due date reminders</span>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
            <span className="text-sm">Expense tracking alerts</span>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
            <span className="text-sm">Savings goal updates</span>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button 
            onClick={handleEnable} 
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            <Bell className="mr-2 h-4 w-4" />
            Enable Notifications
          </Button>
          <div className="flex gap-2 w-full">
            <Button 
              variant="outline" 
              onClick={handleLater}
              className="flex-1"
            >
              Maybe Later
            </Button>
            <Button 
              variant="ghost" 
              onClick={handleDismiss}
              className="flex-1 text-muted-foreground"
            >
              Don't Ask Again
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Small banner for settings/profile section
export function NotificationBanner() {
  const { toast } = useToast();
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    enableNotifications,
    sendTestNotification
  } = useNotifications();

  if (!isSupported) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border">
        <BellOff className="h-5 w-5 text-muted-foreground" />
        <div className="flex-1">
          <p className="text-sm font-medium">Notifications not supported</p>
          <p className="text-xs text-muted-foreground">
            Your browser doesn't support push notifications
          </p>
        </div>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
        <BellOff className="h-5 w-5 text-destructive" />
        <div className="flex-1">
          <p className="text-sm font-medium">Notifications blocked</p>
          <p className="text-xs text-muted-foreground">
            Please enable notifications in your browser settings
          </p>
        </div>
      </div>
    );
  }

  if (permission === 'granted' && isSubscribed) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
        <Bell className="h-5 w-5 text-green-500" />
        <div className="flex-1">
          <p className="text-sm font-medium">Notifications enabled</p>
          <p className="text-xs text-muted-foreground">
            You will receive push notifications
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={async () => {
            await sendTestNotification();
            toast({
              title: 'Test notification sent!',
              description: 'Check your notification panel.',
            });
          }}
        >
          Test
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border">
      <Bell className="h-5 w-5 text-muted-foreground" />
      <div className="flex-1">
        <p className="text-sm font-medium">Enable notifications</p>
        <p className="text-xs text-muted-foreground">
          Get reminders for due dates and expenses
        </p>
      </div>
      <Button 
        size="sm"
        disabled={isLoading}
        onClick={async () => {
          const success = await enableNotifications();
          if (success) {
            toast({
              title: 'Notifications enabled!',
              description: 'You will now receive push notifications.',
            });
          }
        }}
      >
        {isLoading ? 'Enabling...' : 'Enable'}
      </Button>
    </div>
  );
}
