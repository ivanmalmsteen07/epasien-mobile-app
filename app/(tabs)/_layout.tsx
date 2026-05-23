import React, { useEffect, useState, useRef } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, Tabs, usePathname } from 'expo-router';
import { Pressable, View, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import api from '../../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [unreadCount, setUnreadCount] = useState(0);
  const lastCountRef = useRef<number | null>(null);
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  useEffect(() => {
    const interval = setInterval(fetchUnreadCount, 5000); // Cek tiap 5 detik
    fetchUnreadCount();
    return () => clearInterval(interval);
  }, [pathname]); // Re-run effect when tab changes so it fetches immediately

  const fetchUnreadCount = async () => {
    try {
      // Menggunakan get_notifications_summary.php karena sudah terverifikasi bekerja di Beranda
      const response = await api.get('/get_notifications_summary.php');
      const json = response.data;
      
      if (json.status === 'success' && !json.message.includes('Error')) {
        const newCount = parseInt(json.data.unread_complaints);
        
        // Trigger notifikasi jika jumlah pesan baru bertambah DAN user sedang tidak membuka layar pengaduan
        if (lastCountRef.current !== null && newCount > lastCountRef.current && pathname !== '/pengaduan') {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Pesan Baru Layanan Pengaduan 💬',
              body: `Ada ${newCount} pesan baru yang menunggu balasan Anda.`,
              data: { screen: 'pengaduan' },
              sound: true,
              priority: Notifications.AndroidNotificationPriority.MAX,
            },
            trigger: null,
          });
        }
        
        setUnreadCount(newCount);
        lastCountRef.current = newCount;
      } else {
        // console.log("API Error:", json.message);
      }
    } catch (e) {
      // console.log("Gagal ambil summary notif di layout");
    }
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1abc9c',
        tabBarInactiveTintColor: '#95a5a6',
        tabBarStyle: {
          borderTopWidth: 0,
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -5 },
          shadowOpacity: 0.1,
          shadowRadius: 15,
          height: 58 + (insets.bottom > 0 ? insets.bottom : 12),
          paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
          paddingTop: 10,
          backgroundColor: '#fff',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
        },
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Beranda',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="pengaduan"
        options={{
          title: 'Pengaduan',
          tabBarStyle: { display: 'none' },
          tabBarIcon: ({ color, focused }) => (
            <View style={{ width: 24, height: 24, backgroundColor: 'transparent' }}>
              <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={22} color={color} />
              {unreadCount > 0 && (
                <View style={{
                  position: 'absolute',
                  right: -10,
                  top: -5,
                  backgroundColor: '#e74c3c',
                  borderRadius: 10,
                  width: 18,
                  height: 18,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 2,
                  borderColor: '#fff',
                }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>
                    {unreadCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="call_igd"
        options={{
          title: '',
          tabBarIcon: ({ focused }) => (
            <View style={{
              width: 65,
              height: 65,
              backgroundColor: '#e74c3c',
              borderRadius: 32.5,
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: -35,
              elevation: 10,
              shadowColor: '#e74c3c',
              shadowOffset: { width: 0, height: 5 },
              shadowOpacity: 0.4,
              shadowRadius: 8,
              borderWidth: 4,
              borderColor: '#fff',
            }}>
              <Ionicons name="call" size={28} color="#fff" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="antrean"
        options={{
          title: 'Antrean',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'qr-code' : 'qr-code-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
