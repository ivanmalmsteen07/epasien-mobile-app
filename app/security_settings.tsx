import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, TextInput, Dimensions, StatusBar, ActivityIndicator, View as RNView, Platform, Switch, Alert } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useRouter, Stack } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';
import api from '../services/api';
import CustomAlert from '../components/CustomAlert';

const { width } = Dimensions.get('window');

export default function SecuritySettingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  // Password state
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [showPass, setShowPass] = useState({ current: false, new: false, confirm: false });
  
  const [alert, setAlert] = useState({ visible: false, title: '', message: '', type: 'info' as 'info' | 'success' | 'error' });

  useEffect(() => {
    checkBiometrics();
    loadUserDataAndPreference();
  }, []);

  const checkBiometrics = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    setIsBiometricSupported(hasHardware && isEnrolled);
  };

  const loadUserDataAndPreference = async () => {
    try {
      const data = await SecureStore.getItemAsync('userData');
      if (data) {
        const parsed = JSON.parse(data);
        setUser(parsed);
        if (parsed && parsed.username) {
          const userKey = parsed.username.toLowerCase();
          const enabled = await SecureStore.getItemAsync(`biometricEnabled_${userKey}`);
          setIsBiometricEnabled(enabled === 'true');
        }
      }
    } catch (e) {
      console.error('Gagal memuat data user atau preferensi biometrik', e);
    }
  };

  const toggleBiometric = async (value: boolean) => {
    if (!user || !user.username) {
      setAlert({ visible: true, title: 'Perhatian', message: 'Data pengguna belum dimuat sepenuhnya. Harap coba beberapa saat lagi.', type: 'info' });
      return;
    }
    const userKey = user.username.toLowerCase();

    if (value) {
      // Prompt for authentication before enabling
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Konfirmasi Biometrik untuk Aktivasi',
        fallbackLabel: 'Gunakan PIN',
      });
      
      if (result.success) {
        await SecureStore.setItemAsync(`biometricEnabled_${userKey}`, 'true');
        await SecureStore.setItemAsync('activeBiometricUser', userKey);
        setIsBiometricEnabled(true);
        setAlert({ 
          visible: true, 
          title: 'Berhasil Aktif', 
          message: 'Login biometrik telah diaktifkan. Silakan lakukan Logout lalu Login Manual satu kali lagi untuk mendaftarkan sidik jari Anda ke sistem secara permanen.', 
          type: 'success' 
        });
      } else {
        setIsBiometricEnabled(false);
      }
    } else {
      await SecureStore.setItemAsync(`biometricEnabled_${userKey}`, 'false');
      // Jika user yang mematikan ini adalah user biometrik aktif, hapus dari status aktif dan bersihkan kredensial
      const activeUser = await SecureStore.getItemAsync('activeBiometricUser');
      if (activeUser === userKey) {
        await SecureStore.deleteItemAsync('activeBiometricUser');
        await SecureStore.deleteItemAsync('biometricUser');
        await SecureStore.deleteItemAsync('biometricPass');
      }
      setIsBiometricEnabled(false);
      setAlert({ visible: true, title: 'Dinonaktifkan', message: 'Login biometrik telah dimatikan.', type: 'info' });
    }
  };

  const handleChangePassword = async () => {
    if (!passwords.current || !passwords.new || !passwords.confirm) {
      setAlert({ visible: true, title: 'Perhatian', message: 'Harap isi semua kolom kata sandi.', type: 'info' });
      return;
    }
    if (passwords.new !== passwords.confirm) {
      setAlert({ visible: true, title: 'Gagal', message: 'Konfirmasi kata sandi baru tidak cocok.', type: 'error' });
      return;
    }
    if (passwords.new.length < 6) {
      setAlert({ visible: true, title: 'Gagal', message: 'Kata sandi baru minimal 6 karakter.', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const deviceInfo = `${Device.brand} ${Device.modelName} (${Platform.OS})`;
      const res = await api.post('/change_password.php', {
        current_password: passwords.current,
        new_password: passwords.new,
        device_info: deviceInfo
      });

      if (res.data.status === 'success') {
        setAlert({ visible: true, title: 'Berhasil', message: 'Kata sandi Anda telah diperbarui.', type: 'success' });
        setPasswords({ current: '', new: '', confirm: '' });
      } else {
        setAlert({ visible: true, title: 'Gagal', message: res.data.message, type: 'error' });
      }
    } catch (e: any) {
      setAlert({ visible: true, title: 'Kesalahan', message: e.response?.data?.message || 'Gagal memperbarui kata sandi.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <LinearGradient colors={['#004d40', '#00796b', '#1abc9c']} style={styles.header}>
        <RNView style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
          <RNView style={styles.headerTitleBox}>
            <Text style={styles.headerTitle}>Keamanan Akun</Text>
            <Text style={styles.headerStatus}>Kelola Akses & Biometrik</Text>
          </RNView>
        </RNView>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* BIOMETRIC SECTION */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.section}>
          <RNView style={styles.sectionHeader}>
            <MaterialCommunityIcons name="fingerprint" size={22} color="#00796b" />
            <Text style={styles.sectionTitle}>OTENTIKASI BIOMETRIK</Text>
          </RNView>
          
          <RNView style={styles.card}>
            <RNView style={styles.biometricRow}>
              <RNView style={{ flex: 1, backgroundColor: 'transparent' }}>
                <Text style={styles.settingLabel}>Login Face ID / Fingerprint</Text>
                <Text style={styles.settingDesc}>
                  {isBiometricSupported 
                    ? 'Gunakan biometrik untuk masuk ke aplikasi tanpa mengetik password.' 
                    : 'Perangkat Anda tidak mendukung atau belum mengatur biometrik.'}
                </Text>
              </RNView>
              <Switch
                value={isBiometricEnabled}
                onValueChange={toggleBiometric}
                disabled={!isBiometricSupported}
                trackColor={{ false: '#e0e0e0', true: '#a5d6a7' }}
                thumbColor={isBiometricEnabled ? '#4caf50' : '#f5f5f5'}
              />
            </RNView>
          </RNView>
        </Animated.View>

        {/* CHANGE PASSWORD SECTION */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.section}>
          <RNView style={styles.sectionHeader}>
            <MaterialCommunityIcons name="shield-lock-outline" size={22} color="#00796b" />
            <Text style={styles.sectionTitle}>UBAH KATA SANDI</Text>
          </RNView>
          
          <RNView style={styles.card}>
            <Text style={styles.inputLabel}>Kata Sandi Saat Ini</Text>
            <RNView style={styles.inputGroup}>
              <TextInput
                style={styles.input}
                secureTextEntry={!showPass.current}
                value={passwords.current}
                onChangeText={(val) => setPasswords({ ...passwords, current: val })}
                placeholder="Masukkan kata sandi lama"
              />
              <TouchableOpacity onPress={() => setShowPass({ ...showPass, current: !showPass.current })}>
                <Ionicons name={showPass.current ? "eye-off" : "eye"} size={20} color="#90a4ae" />
              </TouchableOpacity>
            </RNView>

            <Text style={styles.inputLabel}>Kata Sandi Baru</Text>
            <RNView style={styles.inputGroup}>
              <TextInput
                style={styles.input}
                secureTextEntry={!showPass.new}
                value={passwords.new}
                onChangeText={(val) => setPasswords({ ...passwords, new: val })}
                placeholder="Minimal 6 karakter"
              />
              <TouchableOpacity onPress={() => setShowPass({ ...showPass, new: !showPass.new })}>
                <Ionicons name={showPass.new ? "eye-off" : "eye"} size={20} color="#90a4ae" />
              </TouchableOpacity>
            </RNView>

            <Text style={styles.inputLabel}>Konfirmasi Kata Sandi Baru</Text>
            <RNView style={styles.inputGroup}>
              <TextInput
                style={styles.input}
                secureTextEntry={!showPass.confirm}
                value={passwords.confirm}
                onChangeText={(val) => setPasswords({ ...passwords, confirm: val })}
                placeholder="Ulangi kata sandi baru"
              />
              <TouchableOpacity onPress={() => setShowPass({ ...showPass, confirm: !showPass.confirm })}>
                <Ionicons name={showPass.confirm ? "eye-off" : "eye"} size={20} color="#90a4ae" />
              </TouchableOpacity>
            </RNView>

            <TouchableOpacity style={styles.updateBtn} onPress={handleChangePassword} disabled={loading}>
              <LinearGradient colors={['#1abc9c', '#00796b']} style={styles.btnGradient}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>PERBARUI KATA SANDI</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </RNView>
        </Animated.View>

        <RNView style={styles.footerNote}>
          <Ionicons name="shield-checkmark" size={16} color="#4caf50" />
          <Text style={styles.footerText}>
            Keamanan akun Anda adalah prioritas kami. Gunakan kata sandi yang kuat dan unik.
          </Text>
        </RNView>
      </ScrollView>

      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert({ ...alert, visible: false })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fdfc' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, backgroundColor: 'transparent' },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleBox: { marginLeft: 15, backgroundColor: 'transparent' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  headerStatus: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  scroll: { flex: 1 },
  content: { padding: 20 },
  section: { marginBottom: 25, backgroundColor: 'transparent' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, marginLeft: 5, backgroundColor: 'transparent' },
  sectionTitle: { fontSize: 13, fontWeight: '900', color: '#90a4ae', letterSpacing: 1.2, marginLeft: 10 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  biometricRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'transparent' },
  settingLabel: { fontSize: 15, fontWeight: 'bold', color: '#37474f' },
  settingDesc: { fontSize: 12, color: '#78909c', marginTop: 4, lineHeight: 18 },
  inputLabel: { fontSize: 12, fontWeight: 'bold', color: '#546e7a', marginBottom: 8, marginTop: 15 },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fbfc',
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 55,
    borderWidth: 1,
    borderColor: '#e0eef0',
  },
  input: { flex: 1, fontSize: 15, color: '#263238', fontWeight: '600' },
  updateBtn: { marginTop: 30, borderRadius: 18, overflow: 'hidden', elevation: 5 },
  btnGradient: { height: 55, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 15, fontWeight: 'bold', letterSpacing: 1 },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  footerText: { fontSize: 11, color: '#90a4ae', marginLeft: 8, fontStyle: 'italic', textAlign: 'center' },
});
