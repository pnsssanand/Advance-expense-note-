import { useState, useEffect, useCallback } from 'react';
import {
  isNotificationSupported,
  getNotificationPermission,
  enablePushNotifications,
  initializePushNotifications,
  getSubscriptionStatus,
  showLocalNotification,
  registerServiceWorker
} from '@/lib/notifications';
import { useAuth } from '@/contexts/AuthContext';

interface NotificationState {
  isSupported: boolean;
  permission: NotificationPermission | 'unsupported';
  isSubscribed: boolean;
  isLoading: boolean;
}

export function useNotifications() {
  const { user } = useAuth();
  const [state, setState] = useState<NotificationState>({
    isSupported: false,
    permission: 'default',
    isSubscribed: false,
    isLoading: true
  });

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      const supported = isNotificationSupported();
      
      if (!supported) {
        setState({
          isSupported: false,
          permission: 'unsupported',
          isSubscribed: false,
          isLoading: false
        });
        return;
      }

      // Register service worker first
      await registerServiceWorker();

      const permission = getNotificationPermission();
      const { hasSubscription } = await getSubscriptionStatus();

      setState({
        isSupported: true,
        permission: permission === 'unsupported' ? 'default' : permission,
        isSubscribed: hasSubscription,
        isLoading: false
      });

      // If user is logged in and permission granted, ensure subscription
      if (user && permission === 'granted' && !hasSubscription) {
        await initializePushNotifications(user.uid);
        const { hasSubscription: newStatus } = await getSubscriptionStatus();
        setState(prev => ({ ...prev, isSubscribed: newStatus }));
      }
    };

    init();
  }, [user]);

  // Enable notifications
  const enableNotifications = useCallback(async (): Promise<boolean> => {
    if (!user) {
      console.warn('User must be logged in to enable notifications');
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const result = await enablePushNotifications(user.uid);
      
      setState(prev => ({
        ...prev,
        permission: result.permission === 'unsupported' ? 'default' : result.permission,
        isSubscribed: result.success,
        isLoading: false
      }));

      return result.success;
    } catch (error) {
      console.error('Error enabling notifications:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [user]);

  // Send a test notification
  const sendTestNotification = useCallback(async () => {
    if (state.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    await showLocalNotification('Test Notification', {
      body: 'Push notifications are working! 🎉',
      tag: 'test',
      data: { type: 'test' }
    });
  }, [state.permission]);

  return {
    ...state,
    enableNotifications,
    sendTestNotification,
    shouldShowPrompt: state.isSupported && state.permission === 'default' && !state.isLoading
  };
}
