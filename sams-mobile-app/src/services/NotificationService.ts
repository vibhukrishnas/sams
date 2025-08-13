import { Alert } from 'react-native';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: Date;
  read: boolean;
  priority: 'low' | 'normal' | 'high' | 'critical';
}

export class NotificationService {
  private notifications: Notification[] = [];
  private listeners: Set<(notifications: Notification[]) => void> = new Set();
  private soundEnabled: boolean = true;
  private vibrationEnabled: boolean = true;

  /**
   * Add a new notification
   */
  addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): void {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false
    };

    this.notifications.unshift(newNotification);
    
    // Keep only last 100 notifications
    if (this.notifications.length > 100) {
      this.notifications = this.notifications.slice(0, 100);
    }

    this.notifyListeners();
    this.handleNotificationDisplay(newNotification);
  }

  /**
   * Handle notification display based on priority
   */
  private handleNotificationDisplay(notification: Notification): void {
    if (notification.priority === 'critical') {
      Alert.alert(
        '🚨 Critical Alert',
        notification.message,
        [{ text: 'OK', onPress: () => this.markAsRead(notification.id) }]
      );
    } else if (notification.priority === 'high') {
      Alert.alert(
        notification.title,
        notification.message,
        [{ text: 'OK', onPress: () => this.markAsRead(notification.id) }]
      );
    }
    
    // In a real app, this would trigger system notifications
    console.log(`📱 Notification: ${notification.title} - ${notification.message}`);
  }

  /**
   * Mark notification as read
   */
  markAsRead(id: string): void {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      this.notifyListeners();
    }
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): void {
    this.notifications.forEach(n => n.read = true);
    this.notifyListeners();
  }

  /**
   * Remove notification
   */
  removeNotification(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notifyListeners();
  }

  /**
   * Clear all notifications
   */
  clearAll(): void {
    this.notifications = [];
    this.notifyListeners();
  }

  /**
   * Get all notifications
   */
  getNotifications(): Notification[] {
    return [...this.notifications];
  }

  /**
   * Get unread notifications
   */
  getUnreadNotifications(): Notification[] {
    return this.notifications.filter(n => !n.read);
  }

  /**
   * Get unread count
   */
  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  /**
   * Subscribe to notification changes
   */
  subscribe(listener: (notifications: Notification[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener([...this.notifications]));
  }

  /**
   * System alert notifications
   */
  systemAlert(message: string, priority: 'low' | 'normal' | 'high' | 'critical' = 'normal'): void {
    this.addNotification({
      title: '🖥️ System Alert',
      message,
      type: 'warning',
      priority
    });
  }

  /**
   * Server status notifications
   */
  serverStatus(serverName: string, status: 'online' | 'offline' | 'error', message?: string): void {
    const icons = { online: '✅', offline: '❌', error: '⚠️' };
    const types = { online: 'success' as const, offline: 'error' as const, error: 'warning' as const };
    
    this.addNotification({
      title: `${icons[status]} Server ${serverName}`,
      message: message || `Server is now ${status}`,
      type: types[status],
      priority: status === 'offline' ? 'high' : 'normal'
    });
  }

  /**
   * Resource usage notifications
   */
  resourceAlert(resource: string, value: number, threshold: number): void {
    const priority = value > threshold * 1.2 ? 'critical' : 'high';
    
    this.addNotification({
      title: `⚠️ High ${resource} Usage`,
      message: `${resource} usage at ${value.toFixed(1)}% (threshold: ${threshold}%)`,
      type: 'warning',
      priority
    });
  }

  /**
   * Security notifications
   */
  securityAlert(message: string, critical: boolean = false): void {
    this.addNotification({
      title: '🔒 Security Alert',
      message,
      type: 'error',
      priority: critical ? 'critical' : 'high'
    });
  }

  /**
   * Success notifications
   */
  success(title: string, message: string): void {
    this.addNotification({
      title,
      message,
      type: 'success',
      priority: 'normal'
    });
  }

  /**
   * Info notifications
   */
  info(title: string, message: string): void {
    this.addNotification({
      title,
      message,
      type: 'info',
      priority: 'normal'
    });
  }

  /**
   * Enable/disable sound
   */
  setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
  }

  /**
   * Enable/disable vibration
   */
  setVibrationEnabled(enabled: boolean): void {
    this.vibrationEnabled = enabled;
  }

  /**
   * Get notification settings
   */
  getSettings(): { sound: boolean; vibration: boolean } {
    return {
      sound: this.soundEnabled,
      vibration: this.vibrationEnabled
    };
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
