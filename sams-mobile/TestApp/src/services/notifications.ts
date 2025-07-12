import messaging from '@react-native-firebase/messaging';
import { Alert } from '../store/api/samsApi';
import { Platform, Alert as RNAlert } from 'react-native';

// Request user permission for notifications
export const requestUserPermission = async () => {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    console.log('Authorization status:', authStatus);
    getFCMToken();
  }
};

export const getFCMToken = async () => {
  const fcmToken = await messaging().getToken();
  if (fcmToken) {
    console.log('FCM Token:', fcmToken);
    // Send token to backend if needed
  }
};

// Handle foreground messages
export const registerForegroundHandler = () => {
  messaging().onMessage(async remoteMessage => {
    console.log('A new FCM message arrived!', JSON.stringify(remoteMessage));
    showInAppNotification(remoteMessage);
  });
};

// Show in-app notification (simple alert, can be replaced with custom UI)
export const showInAppNotification = (remoteMessage: any) => {
  const { notification } = remoteMessage;
  if (notification) {
    RNAlert.alert(
      notification.title || 'Alert',
      notification.body || 'A new alert has arrived.'
    );
  }
};

// Call this in your app entry point (App.tsx or similar)
// requestUserPermission();
// registerForegroundHandler();
