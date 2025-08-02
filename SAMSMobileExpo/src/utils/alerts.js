import * as Notifications from 'expo-notifications';
import BackgroundFetch from 'react-native-background-fetch';
import { Platform } from 'react-native';

class AlertService {
  constructor() {
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    // Configure notifications
    await Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    // Configure background fetch
    BackgroundFetch.configure({
      minimumFetchInterval: 15, // minutes
      stopOnTerminate: false,
      enableHeadless: true,
      startOnBoot: true,
    }, async (taskId) => {
      await this.checkMetrics();
      BackgroundFetch.finish(taskId);
    }, (error) => {
      console.error('Background fetch failed:', error);
    });

    this.isInitialized = true;
  }

  async requestPermissions() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }

  async scheduleNotification(title, body, data = {}) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
        },
        trigger: null, // Immediate notification
      });
    } catch (error) {
      console.error('Failed to schedule notification:', error);
    }
  }

  async checkMetrics() {
    try {
      // Implement metric threshold checks here
      // Schedule notifications for any alerts
    } catch (error) {
      console.error('Metric check failed:', error);
    }
  }

  async clearNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
}

export default new AlertService();
