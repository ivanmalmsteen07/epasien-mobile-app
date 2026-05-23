import React, { useState, useEffect } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View as RNView, Text, ActivityIndicator, Image, Dimensions, KeyboardAvoidingView, Platform, ScrollView, Linking, StatusBar, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';
import { Ionicons, MaterialCommunityIcons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp, withSpring, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import Colors from '../constants/Colors';
import CustomAlert from '../components/CustomAlert';
import { registerForPushNotificationsAsync, savePushToken } from '../services/notification';
import * as Device from 'expo-device';
import * as LocalAuthentication from 'expo-local-authentication';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ pasien: '...', dokter: '...', layanan: '24/7' });
  const [alert, setAlert] = useState({ visible: false, title: '', message: '', type: 'info' as 'info' | 'success' | 'error' });
  const router = useRouter();

  // Animation Values
  const logoScale = useSharedValue(0.8);
  
  useEffect(() => {
    logoScale.value = withSpring(1);
    fetchStats();
    checkBiometricLogin();
  }, []);

  const checkBiometricLogin = async () => {
    const activeUser = await SecureStore.getItemAsync('activeBiometricUser');
    if (!activeUser) return;

    const isEnabled = await SecureStore.getItemAsync(`biometricEnabled_${activeUser.toLowerCase()}`);
    if (isEnabled === 'true') {
      const savedUser = await SecureStore.getItemAsync('biometricUser');
      if (!savedUser) return; // Belum ada kredensial tersimpan

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (hasHardware && isEnrolled) {
        setTimeout(handleBiometricLogin, 1000);
      }
    }
  };

  const handleBiometricLogin = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Masuk dengan Biometrik',
      fallbackLabel: 'Gunakan Password',
    });

    if (result.success) {
      const savedUser = await SecureStore.getItemAsync('biometricUser');
      const savedPass = await SecureStore.getItemAsync('biometricPass');
      if (savedUser && savedPass) {
        setUsername(savedUser);
        setPassword(savedPass);
        // Trigger login after a tiny delay to show the filled fields
        setTimeout(() => performLogin(savedUser, savedPass), 500);
      } else {
        showAlert('Biometrik Belum Aktif', 'Silakan login manual dan aktifkan fitur biometrik di pengaturan keamanan.', 'info');
      }
    }
  };

  const logoAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setAlert({ visible: true, title, message, type });
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/get_stats.php');
      if (response.data.status === 'success') {
        const data = response.data.data;
        setStats({
          pasien: data.pasien > 1000 ? `${(data.pasien / 1000).toFixed(0)}K+` : `${data.pasien}`,
          dokter: `${data.dokter}+`,
          layanan: data.layanan
        });
      }
    } catch (error) {
      console.log('Stats error');
    }
  };

  const handleLogin = async () => {
    if (!username || !password) {
      showAlert('Perhatian', 'Silakan masukkan Username dan Password.', 'info');
      return;
    }
    performLogin(username, password);
  };

  const performLogin = async (user: string, pass: string) => {
    setLoading(true);
    try {
      const deviceInfo = `${Device.brand} ${Device.modelName} (${Platform.OS})`;
      const response = await api.post('/login.php', { 
        username: user, 
        password: pass,
        device_info: deviceInfo
      });
      if (response.data.status === 'success') {
        await SecureStore.setItemAsync('userToken', response.data.data.token);
        await SecureStore.setItemAsync('userData', JSON.stringify(response.data.data.user));
        
        // Save credentials for next biometric login if enabled for this user
        const userKey = user.toLowerCase();
        const isBioEnabled = await SecureStore.getItemAsync(`biometricEnabled_${userKey}`);
        if (isBioEnabled === 'true') {
          await SecureStore.setItemAsync('activeBiometricUser', userKey);
          await SecureStore.setItemAsync('biometricUser', user);
          await SecureStore.setItemAsync('biometricPass', pass);
          
          // RE-ADD PUSH NOTIFICATION
          const token = await registerForPushNotificationsAsync();
          if (token) await savePushToken(token);
          
          router.replace('/(tabs)');
        } else {
          // PROMPT: Tawarkan aktivasi biometrik jika belum aktif dan perangkat mendukung
          const hasHardware = await LocalAuthentication.hasHardwareAsync();
          const isEnrolled = await LocalAuthentication.isEnrolledAsync();
          
          if (hasHardware && isEnrolled) {
            setLoading(false); // Stop loading to show alert
            // Gunakan Alert.alert standar agar bisa menampung tombol "Aktifkan" dan "Nanti Saja" secara native.
            Alert.alert(
              'Login Biometrik',
              'Ingin masuk lebih cepat menggunakan Sidik Jari / Face ID di kemudian hari?',
              [
                { 
                  text: 'Nanti Saja', 
                  onPress: async () => {
                    const token = await registerForPushNotificationsAsync();
                    if (token) await savePushToken(token);
                    router.replace('/(tabs)');
                  }, 
                  style: 'cancel' 
                },
                { 
                  text: 'Ya, Aktifkan', 
                  onPress: async () => {
                    const result = await LocalAuthentication.authenticateAsync({
                      promptMessage: 'Konfirmasi Biometrik',
                    });
                    if (result.success) {
                      await SecureStore.setItemAsync(`biometricEnabled_${userKey}`, 'true');
                      await SecureStore.setItemAsync('activeBiometricUser', userKey);
                      await SecureStore.setItemAsync('biometricUser', user);
                      await SecureStore.setItemAsync('biometricPass', pass);
                    }
                    const token = await registerForPushNotificationsAsync();
                    if (token) await savePushToken(token);
                    router.replace('/(tabs)');
                  }
                }
              ]
            );
          } else {
            const token = await registerForPushNotificationsAsync();
            if (token) await savePushToken(token);
            router.replace('/(tabs)');
          }
        }
      } else {
        showAlert('Gagal Masuk', response.data.message, 'error');
      }
    } catch (error: any) {
      if (error.response && error.response.data && error.response.data.message) {
        // Tampilkan pesan error spesifik dari API (Username salah, Password salah, Akun diblokir)
        showAlert('Gagal Masuk', error.response.data.message, 'error');
      } else {
        // Error koneksi internet atau server mati
        showAlert('Kesalahan Koneksi', 'Gagal terhubung ke server. Pastikan Anda terhubung ke jaringan.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <RNView style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* 1. IMMERSIVE FULL COLOR BACKGROUND */}
      <RNView style={styles.backgroundContainer}>
        <LinearGradient colors={['#004d40', '#00796b', '#1abc9c']} style={StyleSheet.absoluteFill} />
        <RNView style={[styles.meshBlob, { top: -50, right: -100, backgroundColor: '#00bfa5' }]} />
        <RNView style={[styles.meshBlob, { bottom: height * 0.2, left: -100, backgroundColor: '#4db6ac', opacity: 0.4 }]} />
      </RNView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* 2. HERO BRANDING SECTION */}
          <Animated.View entering={FadeInDown.duration(1000)} style={styles.heroSection}>
            <Animated.View style={[styles.logoWrapper, logoAnimStyle]}>
              <LinearGradient colors={['#ffffff', '#f1f8f7']} style={styles.logoCircle}>
                <Image source={require('../assets/images/logors.png')} style={styles.logoImg} resizeMode="contain" />
              </LinearGradient>
            </Animated.View>
            <Text style={styles.appTitle}>E-Pasien <Text style={styles.brandAccent}>Standard</Text></Text>
            <Text style={styles.appTagline}>PELAYANAN KESEHATAN DALAM GENGGAMAN</Text>
          </Animated.View>

          {/* 3. VIBRANT STATS CHIPS */}
          <Animated.View entering={FadeInUp.delay(500)} style={styles.statsRow}>
            <StatChip label="PASIEN" value={stats.pasien} icon="people" color="#00e676" />
            <StatChip label="DOKTER" value={stats.dokter} icon="medical-services" color="#40c4ff" />
            <StatChip label="SIAGA" value={stats.layanan} icon="bolt" color="#ffea00" />
          </Animated.View>

          {/* 4. PREMIUM LOGIN CARD - SOLID PROFESSIONAL */}
          <Animated.View entering={FadeInDown.delay(800)} style={styles.loginCard}>
            <RNView style={styles.cardHeaderRow}>
              <RNView style={styles.cardIndicator} />
              <Text style={styles.cardHeader}>SILAKAN MASUK</Text>
            </RNView>
            <Text style={styles.cardSubHeader}>Gunakan Username dan Password Akun Anda</Text>
            
            <RNView style={styles.inputGroup}>
              <RNView style={styles.inputIconBox}>
                <MaterialCommunityIcons name="account" size={22} color="#00796b" />
              </RNView>
              <TextInput
                style={styles.textInput}
                placeholder="Username"
                placeholderTextColor="#90a4ae"
                value={username}
                onChangeText={(val) => setUsername(val.replace(/\s/g, '').toLowerCase())}
                autoCapitalize="none"
              />
            </RNView>

            <RNView style={styles.inputGroup}>
              <RNView style={styles.inputIconBox}>
                <MaterialCommunityIcons name="shield-lock" size={22} color="#00796b" />
              </RNView>
              <TextInput
                style={styles.textInput}
                placeholder="Password"
                placeholderTextColor="#90a4ae"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? "eye-off" : "eye"} size={22} color="#90a4ae" />
              </TouchableOpacity>
            </RNView>

            <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
              <LinearGradient colors={['#1abc9c', '#00796b']} style={styles.btnGradient} start={{x:0, y:0}} end={{x:1, y:0}}>
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Text style={styles.loginText}>MASUK</Text>
                    <Ionicons name="chevron-forward" size={20} color="#fff" style={{ marginLeft: 10 }} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.biometricBtn} onPress={handleBiometricLogin}>
              <MaterialCommunityIcons name="fingerprint" size={40} color="#00796b" />
              <Text style={styles.biometricBtnText}>Gunakan Biometrik</Text>
            </TouchableOpacity>

            <RNView style={styles.authLinksContainer}>
              <TouchableOpacity onPress={() => router.push('/register')} style={{ paddingVertical: 10 }}>
                <Text style={styles.authLinkText}>Belum punya akun? <Text style={styles.authLinkAccent}>Daftar Baru</Text></Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/forgot_password')} style={{ paddingVertical: 10 }}>
                <Text style={styles.forgotPasswordText}>Lupa Password?</Text>
              </TouchableOpacity>
            </RNView>
          </Animated.View>

          <RNView style={styles.footer}>
            <Text style={styles.footerText}>Team IT Development</Text>
            <Text style={styles.footerSubText}>© 2026 Aplikasi E-Pasien</Text>
          </RNView>
        </ScrollView>
      </KeyboardAvoidingView>

      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert({ ...alert, visible: false })}
      />
    </RNView>
  );
}

// SUB-COMPONENTS
function StatChip({ label, value, icon, color }: any) {
  return (
    <RNView style={styles.statChip}>
      <MaterialIcons name={icon} size={16} color={color} />
      <RNView style={{ marginLeft: 8 }}>
        <Text style={styles.statValText}>{value}</Text>
        <Text style={styles.statLabelText}>{label}</Text>
      </RNView>
    </RNView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#004d40',
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  meshBlob: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.5,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 25,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 30,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoWrapper: {
    width: 110,
    height: 110,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 8,
    marginBottom: 20,
  },
  logoCircle: {
    flex: 1,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  logoImg: {
    width: 65,
    height: 65,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -1,
  },
  brandAccent: {
    color: '#1abc9c',
  },
  appTagline: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: 'bold',
    marginTop: 5,
    letterSpacing: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    flex: 1,
    marginHorizontal: 4,
  },
  statValText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabelText: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: 'bold',
  },
  loginCard: {
    backgroundColor: '#ffffff',
    borderRadius: 35,
    padding: 25,
    marginBottom: 30,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  cardIndicator: {
    width: 4,
    height: 18,
    backgroundColor: '#1abc9c',
    borderRadius: 2,
    marginRight: 10,
  },
  cardHeader: {
    fontSize: 20,
    fontWeight: '900',
    color: '#37474f',
    letterSpacing: 1,
  },
  cardSubHeader: {
    fontSize: 13,
    color: '#78909c',
    marginBottom: 25,
    fontWeight: '500',
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fbfc',
    borderRadius: 18,
    paddingHorizontal: 15,
    height: 60,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0eef0',
  },
  inputIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#263238',
    fontWeight: '600',
  },
  eyeBtn: {
    padding: 10,
  },
  loginBtn: {
    marginTop: 10,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#1abc9c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  biometricBtn: {
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  biometricBtnText: {
    fontSize: 10,
    color: '#00796b',
    fontWeight: 'bold',
    marginTop: 5,
    letterSpacing: 1,
  },
  btnGradient: {
    height: 65,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  helpLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  helpText: {
    color: '#90a4ae',
    fontSize: 13,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: 30,
    paddingBottom: 10,
  },
  footerText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    opacity: 0.9,
  },
  footerSubText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    opacity: 0.5,
    marginTop: 4,
  },
  authLinksContainer: {
    marginTop: 25,
    alignItems: 'center',
    flexDirection: 'column',
    gap: 5,
  },
  authLinkText: {
    color: '#78909c',
    fontSize: 14,
    fontWeight: '500',
  },
  authLinkAccent: {
    color: '#1abc9c',
    fontWeight: 'bold',
  },
  forgotPasswordText: {
    color: '#00796b',
    fontSize: 14,
    fontWeight: '600',
  },
});
