import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, Dimensions, View as RNView, StatusBar, Platform, Alert } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useRouter, Stack } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import CustomAlert from '@/components/CustomAlert';

const { width } = Dimensions.get('window');

const ALL_CATEGORIES = [
  {
    id: 'medis',
    title: 'LAYANAN MEDIS & KLINIS',
    items: [
      { id: 'rm', title: 'Resume Medis', icon: 'clipboard-pulse', color: '#2979ff', desc: 'Rekam Medis Digital', route: '/resume_medis' },
      { id: 'riwayat', title: 'Riwayat Kunjungan', icon: 'history', color: '#673ab7', desc: 'Jejak Kunjungan RS', route: '/riwayat_kunjungan' },
      { id: 'lab', title: 'Hasil Laboratorium', icon: 'flask-round-bottom', color: '#ff1744', desc: 'Hasil Pemeriksaan', route: '/lab_selection' },
      { id: 'rad', title: 'Hasil Radiologi', icon: 'image-filter-black-white', color: '#00bfa5', desc: 'Hasil Ekspertise', route: '/radiologi_selection' },
      { id: 'resep_digital', title: 'Resep Digital', icon: 'pill', color: '#ff9100', desc: 'Tebus Obat Online', route: '/resep_selection' },
    ]
  },
  {
    id: 'pendaftaran',
    title: 'PENDAFTARAN & KONSULTASI',
    items: [
      { id: 'antrian', title: 'Booking Antrian', icon: 'calendar-clock', color: '#1565c0', desc: 'Daftar Poliklinik', route: '/booking_antrian' },
      { id: 'antrian_realtime', title: 'Dashboard Antrian', icon: 'monitor-dashboard', color: '#ff1744', desc: 'Pantau Antrean Realtime', route: '/queue_dashboard' },
      { id: 'telemed', title: 'Telemedicine', icon: 'video-outline', color: '#0277bd', desc: 'Chat & Video Call' },
      { id: 'janji', title: 'Janji Temu', icon: 'calendar-check', color: '#00bfa5', desc: 'Jadwal Dokter' },
      { id: 'checkup', title: 'Medical Checkup', icon: 'stethoscope', color: '#546e7a', desc: 'Skrining Kesehatan' },
    ]
  },
  {
    id: 'finance',
    title: 'KEUANGAN & ASURANSI',
    items: [
      { id: 'bayar', title: 'Pembayaran', icon: 'wallet-outline', color: '#37474f', desc: 'Bayar Tagihan RS' },
      { id: 'tagihan', title: 'Tagihan', icon: 'file-document-outline', color: '#455a64', desc: 'Rincian Biaya' },
      { id: 'asuransi', title: 'Klaim Asuransi', icon: 'shield-check-outline', color: '#2e7d32', desc: 'Tracking Klaim' },
      { id: 'resi', title: 'Resi Digital', icon: 'receipt', color: '#78909c', desc: 'Bukti Pembayaran' },
    ]
  },
  {
    id: 'ai_wellness',
    title: 'AI, WELLNESS & EDUKASI',
    items: [
      { id: 'gejala', title: 'Cek Gejala AI', icon: 'robot-outline', color: '#ff6d00', desc: 'Symptom Checker', route: '/gejala_ai' },
      { id: 'obat', title: 'Pengingat Obat', icon: 'alarm', color: '#4527a0', desc: 'Alarm Kontrol', route: '/medicine_reminder' },
      { id: 'edukasi', title: 'Edukasi Sehat', icon: 'play-circle-outline', color: '#c62828', desc: 'Video & Artikel' },
      { id: 'chatbot', title: 'Chatbot RS', icon: 'robot-outline', color: '#0091ea', desc: 'Layanan Umum' },
      { id: 'tracker', title: 'Health Tracker', icon: 'heart-pulse', color: '#00e5ff', desc: 'Input Mandiri', route: '/health_tracker' },
      { id: 'vaksin', title: 'Vaksinasi', icon: 'needle', color: '#6a1b9a', desc: 'Riwayat & Jadwal' },
      { id: 'mental', title: 'Mental Health', icon: 'brain', color: '#ad1457', desc: 'Skrining & Konsul' },
      { id: 'kia', title: 'Ibu & Anak', icon: 'baby-face-outline', color: '#f50057', desc: 'Buku KIA Digital' },
    ]
  },
  {
    id: 'security',
    title: 'KEAMANAN & PRIVASI DATA',
    items: [
      { id: 'audit', title: 'Log Aktivitas Akun', icon: 'history', color: '#ff9100', desc: 'Pantau Keamanan Login', route: '/activity_logs' },
      { id: 'consent', title: 'Persetujuan', icon: 'account-check-outline', color: '#1b5e20', desc: 'Kontrol Akses Data', route: '/consent_management' },
      { id: 'biometric', title: 'Ubah Sandi & Biometrik', icon: 'fingerprint', color: '#3949ab', desc: 'Ganti Password & Face ID', route: '/security_settings' },
      { id: 'encrypt', title: 'Enkripsi', icon: 'shield-key-outline', color: '#004d40', desc: 'Status AES-256', route: '/encryption_status' },
    ]
  }
];

export default function AllMenusScreen() {
  const router = useRouter();
  const [alert, setAlert] = useState({ 
    visible: false, 
    title: '', 
    message: '', 
    type: 'info' as 'info' | 'success' | 'error' | 'warning' 
  });

  const showAlert = (title: string, message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    setAlert({ visible: true, title, message, type });
  };

  return (
    <RNView style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* HEADER IDENTIK DENGAN PENGADUAN/PENGUMUMAN */}
      <RNView style={styles.headerBackground}>
        <LinearGradient colors={['#004d40', '#00796b', '#1abc9c']} style={StyleSheet.absoluteFill} />
        <RNView style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
          <RNView style={styles.headerTitleBox}>
            <Text style={styles.headerTitle}>Semua Fitur</Text>
            <Text style={styles.headerStatus}>Pusat Layanan Digital E-Pasien</Text>
          </RNView>
        </RNView>
      </RNView>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <RNView style={styles.content}>
          {ALL_CATEGORIES.map((cat, catIndex) => (
            <Animated.View 
              key={cat.id} 
              entering={FadeInDown.delay(100 * catIndex)}
              style={styles.section}
            >
              <Text style={styles.sectionTitle}>{cat.title}</Text>
              <RNView style={styles.grid}>
                {cat.items.map((item) => (
                  <TouchableOpacity 
                    key={item.id} 
                    style={styles.menuItem}
                    onPress={() => {
                      if (item.route) {
                        router.push(item.route as any);
                      } else {
                        showAlert(
                          'Layanan Segera Hadir', 
                          `Fitur ${item.title} saat ini sedang dalam tahap pengembangan oleh tim IT Rumah Sakit untuk memberikan pengalaman terbaik bagi Anda.`, 
                          'info'
                        );
                      }
                    }}
                  >
                    <RNView style={[styles.iconBox, { backgroundColor: item.color + '10' }]}>
                      <MaterialCommunityIcons name={item.icon as any} size={28} color={item.color} />
                    </RNView>
                    <RNView style={styles.menuInfo}>
                      <Text style={styles.menuTitle}>{item.title}</Text>
                      <Text style={styles.menuDesc}>{item.desc}</Text>
                    </RNView>
                    <Ionicons name="chevron-forward" size={16} color="#cfd8dc" />
                  </TouchableOpacity>
                ))}
              </RNView>
            </Animated.View>
          ))}

          <RNView style={styles.footer}>
            <MaterialCommunityIcons name="shield-check" size={20} color="#81c784" />
            <Text style={styles.footerText}>Data dilindungi sesuai UU Kesehatan & UU PDP</Text>
          </RNView>
        </RNView>
      </ScrollView>

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
  container: {
    flex: 1,
    backgroundColor: '#f8fdfc',
  },
  headerBackground: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleBox: {
    marginLeft: 15,
    backgroundColor: 'transparent',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerStatus: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 10,
    backgroundColor: 'transparent',
  },
  section: {
    marginBottom: 25,
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#90a4ae',
    letterSpacing: 1.2,
    marginBottom: 15,
    marginLeft: 5,
  },
  grid: {
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    backgroundColor: 'transparent',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuInfo: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#37474f',
  },
  menuDesc: {
    fontSize: 11,
    color: '#78909c',
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 30,
    backgroundColor: 'transparent',
  },
  footerText: {
    fontSize: 11,
    color: '#90a4ae',
    marginLeft: 8,
    fontStyle: 'italic',
  }
});
