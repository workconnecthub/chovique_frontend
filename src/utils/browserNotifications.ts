/**
 * Browser & Web Push Notification Utility for Chovique
 * Provides native OS/mobile notification popups for internal alerts, order updates, and delivery assignments.
 */

export const isNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

export const getNotificationPermission = (): NotificationPermission => {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
};

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isNotificationSupported()) {
    return 'denied';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return Notification.permission;
  }
};

export interface PushNotificationOptions {
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  requireInteraction?: boolean;
  silent?: boolean;
}

/**
 * Triggers a native system notification on desktop or mobile
 */
export const sendBrowserNotification = (
  title: string,
  options: PushNotificationOptions = {}
): Notification | null => {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return null;
  }

  try {
    const notification = new Notification(title, {
      body: options.body || 'New update from Chovique',
      icon: options.icon || '/logo.png',
      badge: options.badge || '/logo.png',
      tag: options.tag || 'chovique-notification',
      requireInteraction: options.requireInteraction ?? false,
      silent: options.silent ?? false,
      data: options.data,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return notification;
  } catch (err) {
    console.warn('Failed to display native notification:', err);
    return null;
  }
};
