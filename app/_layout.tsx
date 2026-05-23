import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';
import { useColorScheme } from '@/components/useColorScheme';
import { View, Image, StyleSheet, Dimensions, StatusBar, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, withSequence, withRepeat, FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Konfigurasi bagaimana notifikasi muncul saat aplikasi sedang dibuka (Foreground)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});


const { width, height } = Dimensions.get('window');

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  React.useEffect(() => {
    if (error) throw error;
  }, [error]);

  React.useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const [isReady, setIsReady] = React.useState(false);
  const [initialRoute, setInitialRoute] = React.useState<'login' | '(tabs)'>('login');

  // Animasi Reanimated
  const logoScale = useSharedValue(0.5);
  const logoOpacity = useSharedValue(0);
  const logoTranslateY = useSharedValue(50);

  const animatedLogoStyle = useAnimatedStyle(() => {
    return {
      opacity: logoOpacity.value,
      transform: [
        { scale: logoScale.value },
        { translateY: logoTranslateY.value }
      ],
    };
  });

  React.useEffect(() => {
    // 1. Logo muncul (Fade In & Scale Up)
    logoOpacity.value = withTiming(1, { duration: 1200 });
    logoScale.value = withTiming(1, { duration: 1200, easing: Easing.out(Easing.back(1.5)) });
    logoTranslateY.value = withTiming(0, { duration: 1200, easing: Easing.out(Easing.exp) });

    // 2. Logo Bernapas & Mengambang (Pulsing & Floating)
    setTimeout(() => {
      logoScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      );

      logoTranslateY.value = withRepeat(
        withSequence(
          withTiming(-10, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      );
    }, 1200);

    const prepare = async () => {
      try {
        // 1. Minta Izin Notifikasi & Setup Channel Android
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus === 'granted' && Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('epasien-priority', {
            name: 'Pesan Penting E-Pasien',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
          });
        }

        const token = await SecureStore.getItemAsync('userToken');
        setInitialRoute(token ? '(tabs)' : 'login');
      } catch (e) {
        console.warn(e);
      } finally {
        // Tahan splash selama 3.5 detik
        setTimeout(() => {
          setIsReady(true);
        }, 3500);
      }
    };

    prepare();
  }, []);

  if (!isReady) {
    return (
      <View style={styles.splashContainer}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <LinearGradient
          colors={['#004d40', '#00796b', '#1abc9c']}
          style={StyleSheet.absoluteFill}
        />

        {/* Dekorasi Mesh Blob */}
        <View style={[styles.circle, { top: -100, right: -50, width: 300, height: 300, backgroundColor: '#1abc9c', opacity: 0.2 }]} />
        <View style={[styles.circle, { bottom: -80, left: -40, width: 250, height: 250, backgroundColor: '#4db6ac', opacity: 0.2 }]} />

        <Animated.View style={[styles.logoGlass, animatedLogoStyle]}>
          <View style={styles.logoInner}>
            <Image
              source={require('../assets/images/logors.png')}
              style={styles.splashLogo}
              resizeMode="contain"
            />
          </View>
        </Animated.View>

        <Animated.Text entering={FadeInDown.delay(1000)} style={styles.splashTitle}>E-PASIEN</Animated.Text>
        <Animated.Text entering={FadeInDown.delay(1500)} style={styles.splashBrand}>MOBILE STANDARD</Animated.Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider value={DefaultTheme}>
        <Stack initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
          <Stack.Screen name="login" options={{ animation: 'fade' }} />
          <Stack.Screen name="register" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="forgot_password" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="about" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="announcements" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="gejala_ai" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="booking_antrian" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGlass: {
    width: 160,
    height: 160,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  logoInner: {
    flex: 1,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  splashLogo: {
    width: 100,
    height: 100,
  },
  splashTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    marginTop: 30,
    letterSpacing: 4,
  },
  splashBrand: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.6)',
    marginTop: 5,
    letterSpacing: 2,
  },
  circle: {
    position: 'absolute',
    borderRadius: 1000,
  }
});
