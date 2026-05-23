import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, Dimensions, StatusBar, View as RNView, Platform, ActivityIndicator } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useRouter, Stack } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn, ZoomIn } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export default function EncryptionStatusScreen() {
  const router = useRouter();
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    // Simulasi scanning keamanan singkat untuk estetika
    const timer = setTimeout(() => setScanning(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const securityFeatures = [
    { id: 1, title: 'Enkripsi AES-256', desc: 'Identitas lengkap (NIK, Alamat, & Kontak) dienkripsi dengan standar AES-256-CBC.', status: 'Active', icon: 'shield-lock' },
    { id: 2, title: 'Data Medis & Klinis', desc: 'Diagnosa, Hasil Lab, Radiologi, dan Resep telah terenkripsi secara end-to-end.', status: 'Active', icon: 'hospital-box' },
    { id: 3, title: 'UU PDP 2022', desc: 'Sistem telah disesuaikan dengan UU No. 27 Tahun 2022 tentang Perlindungan Data Pribadi.', status: 'Active', icon: 'gavel' },
    { id: 4, title: 'SSL/TLS 1.3', desc: 'Jalur komunikasi data antara HP dan Server terbungkus protokol HTTPS aman.', status: 'Active', icon: 'swap-horizontal' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <LinearGradient colors={['#00251a', '#004d40', '#00796b']} style={styles.header}>
        <RNView style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
          <RNView style={styles.headerTitleBox}>
            <Text style={styles.headerTitle}>Enkripsi & Privasi</Text>
            <Text style={styles.headerStatus}>Pusat Perlindungan Data</Text>
          </RNView>
        </RNView>

        <RNView style={styles.shieldContainer}>
          <Animated.View entering={ZoomIn.duration(800)} style={styles.shieldOuter}>
            <LinearGradient colors={['#1abc9c', '#00796b']} style={styles.shieldInner}>
              <MaterialCommunityIcons name={scanning ? "shield-search" : "shield-check"} size={60} color="#fff" />
            </LinearGradient>
          </Animated.View>
          <Text style={styles.shieldText}>
            {scanning ? 'Menganalisis Lapisan Keamanan...' : 'Sistem Terenkripsi & Aman'}
          </Text>
        </RNView>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Animated.View entering={FadeInDown.delay(300)} style={styles.infoCard}>
          <Text style={styles.infoTitle}>Bagaimana kami menjaga data Anda?</Text>
          <Text style={styles.infoDesc}>
            Aplikasi E-Pasien menggunakan teknologi enkripsi end-to-end untuk memastikan informasi medis Anda hanya dapat diakses oleh Anda dan pihak medis yang berwenang.
          </Text>
        </Animated.View>

        <Text style={styles.sectionLabel}>PROTOKOL KEAMANAN AKTIF</Text>

        {securityFeatures.map((feature, index) => (
          <Animated.View 
            key={feature.id} 
            entering={FadeInDown.delay(500 + (index * 100))} 
            style={styles.featureCard}
          >
            <RNView style={styles.featureIconBox}>
              <MaterialCommunityIcons name={feature.icon as any} size={28} color="#00796b" />
            </RNView>
            <RNView style={styles.featureTextBox}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDesc}>{feature.desc}</Text>
            </RNView>
            <RNView style={styles.statusTag}>
              <RNView style={styles.dot} />
              <Text style={styles.statusText}>{feature.status}</Text>
            </RNView>
          </Animated.View>
        ))}

        <RNView style={styles.securitySeal}>
          <RNView style={styles.line} />
          <RNView style={styles.sealBox}>
            <FontAwesome5 name="award" size={14} color="#ffa000" />
            <Text style={styles.sealText}>DATA PRIVACY COMPLIANT</Text>
          </RNView>
          <RNView style={styles.line} />
        </RNView>
        
        <Text style={styles.footerNote}>
          Teknologi enkripsi kami diperbarui secara berkala mengikuti standar ISO 27001 untuk keamanan informasi.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f9f8' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 40,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    alignItems: 'center',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, width: '100%', backgroundColor: 'transparent' },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleBox: { marginLeft: 15, backgroundColor: 'transparent' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  headerStatus: { fontSize: 11, color: 'rgba(255,255,255,0.6)', letterSpacing: 0.5 },
  shieldContainer: { marginTop: 30, alignItems: 'center', backgroundColor: 'transparent' },
  shieldOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(26, 188, 156, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(26, 188, 156, 0.3)',
  },
  shieldInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#1abc9c',
    shadowOpacity: 0.5,
    shadowRadius: 15,
  },
  shieldText: { color: '#fff', marginTop: 15, fontSize: 15, fontWeight: '600', letterSpacing: 0.5 },
  scroll: { flex: 1 },
  content: { padding: 20 },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 25,
    borderLeftWidth: 5,
    borderLeftColor: '#1abc9c',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  infoTitle: { fontSize: 15, fontWeight: 'bold', color: '#004d40', marginBottom: 8 },
  infoDesc: { fontSize: 13, color: '#546e7a', lineHeight: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '900', color: '#90a4ae', letterSpacing: 1.5, marginBottom: 15, marginLeft: 5 },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 15,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0eef0',
  },
  featureIconBox: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#e0f2f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTextBox: { flex: 1, marginLeft: 15, backgroundColor: 'transparent' },
  featureTitle: { fontSize: 14, fontWeight: 'bold', color: '#37474f' },
  featureDesc: { fontSize: 11, color: '#78909c', marginTop: 3 },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f8e9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4caf50', marginRight: 5 },
  statusText: { fontSize: 10, fontWeight: 'bold', color: '#4caf50' },
  securitySeal: { flexDirection: 'row', alignItems: 'center', marginTop: 30, marginBottom: 15, backgroundColor: 'transparent' },
  line: { flex: 1, height: 1, backgroundColor: '#e0e0e0' },
  sealBox: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 15, backgroundColor: 'transparent' },
  sealText: { fontSize: 10, fontWeight: '900', color: '#b0bec5', marginLeft: 6, letterSpacing: 1 },
  footerNote: { fontSize: 11, color: '#90a4ae', textAlign: 'center', fontStyle: 'italic', paddingHorizontal: 30, marginBottom: 30 },
});
