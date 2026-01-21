// Push Notification Service
import { db } from './firebase';
import { doc, setDoc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Check if browser supports notifications
export const isNotificationSupported = (): boolean => {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
};

// Get current notification permission status
export const getNotificationPermission = (): NotificationPermission | 'unsupported' => {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission;
};

// Request notification permission
export const requestNotificationPermission = async (): Promise<NotificationPermission | 'unsupported'> => {
  if (!isNotificationSupported()) {
    console.warn('Push notifications are not supported in this browser');
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    console.log('[Notifications] Permission:', permission);
    return permission;
  } catch (error) {
    console.error('[Notifications] Error requesting permission:', error);
    return 'denied';
  }
};

// Register service worker
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker is not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    console.log('[SW] Registered successfully:', registration.scope);
    
    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready;
    console.log('[SW] Service Worker is ready');
    
    return registration;
  } catch (error) {
    console.error('[SW] Registration failed:', error);
    return null;
  }
};

// Subscribe to push notifications
export const subscribeToPush = async (
  registration: ServiceWorkerRegistration,
  userId: string
): Promise<PushSubscription | null> => {
  try {
    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      console.log('[Push] Already subscribed');
      // Save subscription to Firestore
      await saveSubscriptionToFirestore(userId, subscription);
      return subscription;
    }

    // For demo purposes, we'll use a placeholder VAPID key
    // In production, you should generate your own VAPID keys
    // You can generate them at: https://vapidkeys.com/
    const vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
    
    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
    
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey
    });

    console.log('[Push] Subscribed successfully');
    
    // Save subscription to Firestore
    await saveSubscriptionToFirestore(userId, subscription);
    
    return subscription;
  } catch (error) {
    console.error('[Push] Subscription failed:', error);
    return null;
  }
};

// Convert VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}

// Save subscription to Firestore
const saveSubscriptionToFirestore = async (
  userId: string,
  subscription: PushSubscription
): Promise<void> => {
  try {
    const subscriptionData = subscription.toJSON();
    await setDoc(doc(db, 'users', userId, 'pushSubscriptions', 'web'), {
      endpoint: subscriptionData.endpoint,
      keys: subscriptionData.keys,
      createdAt: serverTimestamp(),
      userAgent: navigator.userAgent,
      platform: navigator.platform
    });
    console.log('[Push] Subscription saved to Firestore');
  } catch (error) {
    console.error('[Push] Error saving subscription:', error);
  }
};

// Unsubscribe from push notifications
export const unsubscribeFromPush = async (
  registration: ServiceWorkerRegistration,
  userId: string
): Promise<boolean> => {
  try {
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      // Remove from Firestore
      await setDoc(doc(db, 'users', userId, 'pushSubscriptions', 'web'), {
        unsubscribed: true,
        unsubscribedAt: serverTimestamp()
      });
      console.log('[Push] Unsubscribed successfully');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('[Push] Unsubscribe failed:', error);
    return false;
  }
};

// Show a local notification (for testing or when app is in foreground)
export const showLocalNotification = async (
  title: string,
  options?: NotificationOptions
): Promise<void> => {
  if (!isNotificationSupported()) {
    console.warn('Notifications not supported');
    return;
  }

  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      ...options
    });
  } catch (error) {
    console.error('[Notification] Error showing notification:', error);
  }
};

// Schedule a notification (uses local storage for persistence)
export interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  scheduledFor: number; // timestamp
  tag?: string;
  data?: Record<string, unknown>;
}

export const scheduleNotification = async (
  userId: string,
  notification: Omit<ScheduledNotification, 'id'>
): Promise<string> => {
  try {
    const docRef = await addDoc(
      collection(db, 'users', userId, 'scheduledNotifications'),
      {
        ...notification,
        createdAt: serverTimestamp(),
        sent: false
      }
    );
    console.log('[Notification] Scheduled notification:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('[Notification] Error scheduling notification:', error);
    throw error;
  }
};

// Initialize push notifications
export const initializePushNotifications = async (
  userId: string
): Promise<{
  permission: NotificationPermission | 'unsupported';
  subscription: PushSubscription | null;
}> => {
  // Check support
  if (!isNotificationSupported()) {
    return { permission: 'unsupported', subscription: null };
  }

  // Register service worker
  const registration = await registerServiceWorker();
  if (!registration) {
    return { permission: 'default', subscription: null };
  }

  // Get current permission
  let permission = Notification.permission;

  // If not decided yet, we don't auto-request (let the UI handle it)
  if (permission === 'default') {
    return { permission, subscription: null };
  }

  // If granted, subscribe to push
  if (permission === 'granted') {
    const subscription = await subscribeToPush(registration, userId);
    return { permission, subscription };
  }

  return { permission, subscription: null };
};

// Request permission and subscribe (called from UI)
export const enablePushNotifications = async (
  userId: string
): Promise<{
  success: boolean;
  permission: NotificationPermission | 'unsupported';
  subscription: PushSubscription | null;
}> => {
  if (!isNotificationSupported()) {
    return { success: false, permission: 'unsupported', subscription: null };
  }

  // Request permission
  const permission = await requestNotificationPermission();
  
  if (permission !== 'granted') {
    return { success: false, permission, subscription: null };
  }

  // Register service worker and subscribe
  const registration = await registerServiceWorker();
  if (!registration) {
    return { success: false, permission, subscription: null };
  }

  const subscription = await subscribeToPush(registration, userId);
  
  return {
    success: subscription !== null,
    permission,
    subscription
  };
};

// Check subscription status
export const getSubscriptionStatus = async (): Promise<{
  hasSubscription: boolean;
  permission: NotificationPermission | 'unsupported';
}> => {
  if (!isNotificationSupported()) {
    return { hasSubscription: false, permission: 'unsupported' };
  }

  const permission = Notification.permission;
  
  if (permission !== 'granted') {
    return { hasSubscription: false, permission };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return { hasSubscription: subscription !== null, permission };
  } catch {
    return { hasSubscription: false, permission };
  }
};
