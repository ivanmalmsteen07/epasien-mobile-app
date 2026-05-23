import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import api from './api';

// Konfigurasi bagaimana notifikasi muncul saat aplikasi sedang dibuka
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  // Cek apakah di Expo Go (SDK 53+ tidak mendukung remote push di Expo Go)
  if (Constants.appOwnership === 'expo') {
    console.log('Push Notifications tidak didukung di Expo Go. Gunakan Development Build untuk fitur ini.');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  try {
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Izin notifikasi ditolak!');
        return null;
      }
      token = (await Notifications.getExpoPushTokenAsync({
          projectId: '49b1e0c9-4da6-4203-89e8-915a6d31781b' 
      })).data;
    }
  } catch (error) {
    console.log('Error register push token:', error);
  }

  return token;
}

export async function savePushToken(token: string) {
  try {
    const response = await api.post('/save_token.php', { token });
    return response.data;
  } catch (error) {
    console.error('Error saving push token:', error);
  }
}
