import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Dimensions, Platform, StatusBar, Alert } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useRouter, Stack } from 'expo-router';
import { Ionicons, MaterialIcons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import api from '../services/api';
import CustomDatePicker from '../components/CustomDatePicker';
import CustomAlert from '../components/CustomAlert';

const HUBUNGAN_OPTIONS = [
  { label: 'ISTRI', value: 'Istri', icon: 'human-female' },
  { label: 'SUAMI', value: 'Suami', icon: 'human-male' },
  { label: 'ANAK', value: 'Anak', icon: 'baby-face-outline' },
  { label: 'AYAH', value: 'Ayah', icon: 'account-tie' },
  { label: 'IBU', value: 'Ibu', icon: 'account-tie-woman' },
  { label: 'SAUDARA', value: 'Saudara', icon: 'account-group-outline' },
];

export default function FamilyAddScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [alert, setAlert] = useState({ 
    visible: false, 
    title: '', 
    message: '', 
    type: 'info' as 'info' | 'success' | 'error' | 'warning',
    onClose: () => {}
  });

  const showAlert = (title: string, message: string, type: 'info' | 'success' | 'error' | 'warning', onClose = () => {}) => {
    setAlert({ visible: true, title, message, type, onClose });
  };

  const [form, setForm] = useState({
    no_rkm_medis: '',
    tgl_lahir: '',
    no_ktp: '',
    hubungan: ''
  });

  const handleAdd = async () => {
    if (!form.no_rkm_medis || !form.tgl_lahir || !form.no_ktp || !form.hubungan) {
      showAlert('Perhatian', 'Harap lengkapi semua data verifikasi keluarga.', 'warning');
      return;
    }

    if (form.no_ktp.length !== 16) {
      showAlert('Perhatian', 'Nomor NIK harus berjumlah tepat 16 digit.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/add_family.php', form);
      if (res.data.status === 'success') {
        showAlert('Berhasil', res.data.message, 'success', () => {
          router.back();
        });
      } else {
        showAlert('Gagal', res.data.message, 'error');
      }
    } catch (e: any) {
      showAlert('Error', e.response?.data?.message || 'Terjadi kesalahan sistem.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatViewDate = (dateString: string) => {
    if (!dateString) return '';
    const parts = dateString.split('-');
    return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : dateString;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <Stack.Screen options={{ 
        headerShown: true, 
        headerTitle: 'Tambah Keluarga',
        headerTintColor: '#263238',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: '#f8fdfc' },
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="close" size={24} color="#263238" />
          </TouchableOpacity>
        )
      }} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Animated.View entering={FadeInDown} style={styles.infoCard}>
          <LinearGradient colors={['#00796b', '#004d40']} style={styles.infoGradient}>
            <MaterialCommunityIcons name="shield-lock-outline" size={30} color="#fff" />
            <View style={styles.infoTextCol}>
              <Text style={styles.infoTitle}>Verifikasi Keamanan</Text>
              <Text style={styles.infoDesc}>Data keluarga ditarik langsung dari sistem SIMRS untuk menjamin validitas data medis.</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        <View style={styles.formContainer}>
          <Text style={styles.label}>Nomor Rekam Medis Keluarga</Text>
          <View style={styles.inputGroup}>
            <MaterialIcons name="credit-card" size={20} color="#00796b" />
            <TextInput 
              style={styles.input}
              placeholder="Contoh: 001234"
              placeholderTextColor="#b0bec5"
              keyboardType="numeric"
              maxLength={6}
              value={form.no_rkm_medis}
              onChangeText={(v) => {
                const cleaned = v.replace(/[^0-9]/g, '');
                setForm({...form, no_rkm_medis: cleaned});
              }}
            />
          </View>

          <Text style={styles.label}>NIK Anggota Keluarga</Text>
          <View style={styles.inputGroup}>
            <MaterialIcons name="badge" size={20} color="#00796b" />
            <TextInput 
              style={styles.input}
              placeholder="16 Digit NIK sesuai KTP/KIA"
              placeholderTextColor="#b0bec5"
              keyboardType="numeric"
              maxLength={16}
              value={form.no_ktp}
              onChangeText={(v) => {
                const cleaned = v.replace(/[^0-9]/g, '');
                setForm({...form, no_ktp: cleaned});
              }}
            />
          </View>

          <Text style={styles.label}>Tanggal Lahir</Text>
          <TouchableOpacity style={styles.inputGroup} onPress={() => setShowDatePicker(true)}>
            <FontAwesome5 name="calendar-alt" size={18} color="#00796b" />
            <Text style={[styles.inputText, !form.tgl_lahir && { color: '#b0bec5' }]}>
              {form.tgl_lahir ? formatViewDate(form.tgl_lahir) : 'Pilih Tanggal Lahir'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.label}>Hubungan Keluarga</Text>
          <View style={styles.gridHubungan}>
            {HUBUNGAN_OPTIONS.map((opt) => (
              <TouchableOpacity 
                key={opt.value}
                style={[styles.hubOption, form.hubungan === opt.value && styles.hubActive]}
                onPress={() => setForm({...form, hubungan: opt.value})}
              >
                <MaterialCommunityIcons 
                  name={opt.icon as any} 
                  size={24} 
                  color={form.hubungan === opt.value ? '#fff' : '#00796b'} 
                />
                <Text style={[styles.hubText, form.hubungan === opt.value && styles.hubTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleAdd} disabled={loading}>
          <LinearGradient colors={['#1abc9c', '#00796b']} style={styles.btnGradient}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>VERIFIKASI & TAMBAHKAN</Text>}
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 50 }} />
      </ScrollView>

      <CustomAlert 
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={() => {
          setAlert({ ...alert, visible: false });
          if (alert.onClose) alert.onClose();
        }}
      />

      <CustomDatePicker 
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSelect={(date) => setForm({...form, tgl_lahir: date})}
        initialDate={form.tgl_lahir}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fdfc',
  },
  backBtn: {
    padding: 5,
  },
  scrollContent: {
    padding: 20,
  },
  infoCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 25,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  infoGradient: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center',
  },
  infoTextCol: {
    flex: 1,
    marginLeft: 15,
    backgroundColor: 'transparent',
  },
  infoTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  infoDesc: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },
  formContainer: {
    backgroundColor: 'transparent',
  },
  label: {
    fontSize: 13,
    fontWeight: '900',
    color: '#90a4ae',
    marginBottom: 8,
    marginLeft: 5,
    letterSpacing: 0.5,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 55,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e0f2f1',
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: '#263238',
    fontWeight: 'bold',
  },
  inputText: {
    flex: 1,
    marginLeft: 15,
    fontSize: 15,
    color: '#263238',
    fontWeight: 'bold',
  },
  gridHubungan: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    backgroundColor: 'transparent',
    marginBottom: 30,
  },
  hubOption: {
    width: '31.3%',
    backgroundColor: '#fff',
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0f2f1',
    elevation: 2,
  },
  hubActive: {
    backgroundColor: '#00796b',
    borderColor: '#00796b',
  },
  hubText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#00796b',
    marginTop: 8,
  },
  hubTextActive: {
    color: '#fff',
  },
  submitBtn: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#00796b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  btnGradient: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 1,
  }
});
