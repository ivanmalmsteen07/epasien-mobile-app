import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View as RNView, Text, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Dimensions, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../services/api';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import CustomAlert from '../components/CustomAlert';

const { width, height } = Dimensions.get('window');

export default function RegisterScreen() {
  const [namaLengkap, setNamaLengkap] = useState('');
  const [noTelp, setNoTelp] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ visible: false, title: '', message: '', type: 'info' as 'info' | 'success' | 'error' });
  
  const router = useRouter();

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setAlert({ visible: true, title, message, type });
  };

  const handleRegister = async () => {
    if (!namaLengkap || !noTelp || !username || !password) {
      showAlert('Perhatian', 'Semua kolom wajib diisi.', 'info');
      return;
    }

    // Validasi Format Nomor Telepon Indonesia
    if (noTelp.length < 10 || noTelp.length > 15) {
      showAlert('Perhatian', 'Nomor telepon tidak valid (harus 10-15 digit).', 'info');
      return;
    }
    
    if (!noTelp.startsWith('08') && !noTelp.startsWith('628')) {
      showAlert('Perhatian', 'Format nomor HP Indonesia tidak valid (harus diawali 08 atau 628).', 'info');
      return;
    }
    
    // Validasi Keamanan Username (Hanya Huruf, Angka, Underscore. 5-20 karakter)
    const usernameRegex = /^[a-zA-Z0-9_]{5,20}$/;
    if (!usernameRegex.test(username)) {
      showAlert('Perhatian', 'Username hanya boleh berisi huruf, angka, dan underscore (_). Minimal 5 karakter.', 'info');
      return;
    }

    // Validasi Keamanan Password (Min 8 karakter, harus ada angka dan huruf)
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&_]{8,}$/;
    if (!passwordRegex.test(password)) {
      showAlert('Keamanan Password', 'Password minimal 8 karakter dan harus mengandung kombinasi huruf dan angka.', 'info');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/register.php', {
        nama_lengkap: namaLengkap,
        no_telp: noTelp,
        username: username,
        password: password
      });

      if (response.data.status === 'success') {
        showAlert('Berhasil', 'Pendaftaran akun sukses! Silakan login.', 'success');
        setTimeout(() => {
          router.replace('/login');
        }, 2000);
      } else {
        showAlert('Gagal Daftar', response.data.message, 'error');
      }
    } catch (error: any) {
      showAlert('Kesalahan', 'Gagal terhubung ke server. Periksa koneksi internet Anda.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <RNView style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <RNView style={styles.backgroundContainer}>
        <LinearGradient colors={['#004d40', '#00796b']} style={StyleSheet.absoluteFill} />
        <RNView style={[styles.meshBlob, { top: -100, right: -50, backgroundColor: '#1abc9c' }]} />
      </RNView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={28} color="#fff" />
          </TouchableOpacity>

          <Animated.View entering={FadeInDown.duration(800)} style={styles.headerSection}>
            <Text style={styles.pageTitle}>Buat Akun Baru</Text>
            <Text style={styles.pageSubtitle}>Daftarkan diri Anda untuk menikmati layanan Aplikasi E-Pasien</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300).duration(800)} style={styles.formCard}>
            <RNView style={styles.inputGroup}>
              <RNView style={styles.inputIconBox}>
                <MaterialCommunityIcons name="account-details" size={22} color="#00796b" />
              </RNView>
              <TextInput
                style={styles.textInput}
                placeholder="Nama Lengkap"
                placeholderTextColor="#90a4ae"
                value={namaLengkap}
                onChangeText={setNamaLengkap}
              />
            </RNView>

            <RNView style={styles.inputGroup}>
              <RNView style={styles.inputIconBox}>
                <MaterialCommunityIcons name="phone" size={22} color="#00796b" />
              </RNView>
              <TextInput
                style={styles.textInput}
                placeholder="Nomor Telepon / WhatsApp"
                placeholderTextColor="#90a4ae"
                value={noTelp}
                onChangeText={(val) => setNoTelp(val.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
                maxLength={15}
              />
            </RNView>

            <RNView style={styles.inputGroup}>
              <RNView style={styles.inputIconBox}>
                <MaterialCommunityIcons name="account" size={22} color="#00796b" />
              </RNView>
              <TextInput
                style={styles.textInput}
                placeholder="Buat Username"
                placeholderTextColor="#90a4ae"
                value={username}
                onChangeText={(val) => setUsername(val.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
                autoCapitalize="none"
                maxLength={20}
              />
            </RNView>

            <RNView style={styles.inputGroup}>
              <RNView style={styles.inputIconBox}>
                <MaterialCommunityIcons name="shield-lock" size={22} color="#00796b" />
              </RNView>
              <TextInput
                style={styles.textInput}
                placeholder="Buat Password"
                placeholderTextColor="#90a4ae"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? "eye-off" : "eye"} size={22} color="#90a4ae" />
              </TouchableOpacity>
            </RNView>

            {/* Indikator Validasi Password Real-time */}
            <RNView style={styles.passwordRulesContainer}>
              <RNView style={styles.ruleRow}>
                <Ionicons name={password.length >= 8 ? "checkmark-circle" : "close-circle"} size={14} color={password.length >= 8 ? "#1abc9c" : "#b0bec5"} />
                <Text style={[styles.ruleText, { color: password.length >= 8 ? "#00796b" : "#90a4ae" }]}>Minimal 8 karakter</Text>
              </RNView>
              <RNView style={styles.ruleRow}>
                <Ionicons name={/(?=.*[A-Za-z])(?=.*\d)/.test(password) ? "checkmark-circle" : "close-circle"} size={14} color={/(?=.*[A-Za-z])(?=.*\d)/.test(password) ? "#1abc9c" : "#b0bec5"} />
                <Text style={[styles.ruleText, { color: /(?=.*[A-Za-z])(?=.*\d)/.test(password) ? "#00796b" : "#90a4ae" }]}>Mengandung huruf dan angka</Text>
              </RNView>
            </RNView>

            <TouchableOpacity style={styles.submitBtn} onPress={handleRegister} disabled={loading}>
              <LinearGradient colors={['#1abc9c', '#00796b']} style={styles.btnGradient} start={{x:0, y:0}} end={{x:1, y:0}}>
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <Text style={styles.submitText}>DAFTAR SEKARANG</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

          </Animated.View>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#004d40' },
  backgroundContainer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  meshBlob: { position: 'absolute', width: 350, height: 350, borderRadius: 175, opacity: 0.3 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 25, paddingTop: height * 0.08, paddingBottom: 50 },
  backBtn: { width: 50, height: 50, justifyContent: 'center', marginBottom: 20 },
  headerSection: { marginBottom: 30 },
  pageTitle: { fontSize: 32, fontWeight: '900', color: '#ffffff', letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 8, lineHeight: 20 },
  formCard: { backgroundColor: '#ffffff', borderRadius: 30, padding: 25, elevation: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 15 },
  inputGroup: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fbfc', borderRadius: 16, paddingHorizontal: 15, height: 60, marginBottom: 15, borderWidth: 1, borderColor: '#e0eef0' },
  inputIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginRight: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  textInput: { flex: 1, fontSize: 16, color: '#263238', fontWeight: '600' },
  eyeBtn: { padding: 10 },
  passwordRulesContainer: { marginTop: -5, marginBottom: 15, paddingHorizontal: 5 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  ruleText: { fontSize: 12, marginLeft: 6, fontWeight: '500' },
  submitBtn: { marginTop: 10, borderRadius: 18, overflow: 'hidden', elevation: 6, shadowColor: '#1abc9c', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
  btnGradient: { height: 60, justifyContent: 'center', alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
});
