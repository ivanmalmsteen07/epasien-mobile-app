import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, ActivityIndicator, Dimensions, View as RNView, Platform, StatusBar, TouchableOpacity } from 'react-native';
import { Text, View } from '@/components/Themed';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import api from '../services/api';

const { width } = Dimensions.get('window');

export default function RadiologiDetailScreen() {
  const router = useRouter();
  const { no_rawat, nm_perawatan, tgl_periksa, nm_pasien } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [header, setHeader] = useState<any>(null);
  const [details, setDetails] = useState<any[]>([]);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await api.get(`/get_radiologi_detail.php?no_rawat=${no_rawat}&tgl_periksa=${tgl_periksa}`);
        if (res.data.status === 'success') {
          setHeader(res.data.header);
          setDetails(res.data.details);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [no_rawat, tgl_periksa]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00796b" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <LinearGradient colors={['#004d40', '#00796b', '#1abc9c']} style={styles.header}>
        <RNView style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
          <RNView style={styles.headerTitleBox}>
            <Text style={styles.headerTitle}>Hasil Radiologi</Text>
            <Text style={styles.headerStatus}>Ekspertise Dokter Spesialis</Text>
          </RNView>
        </RNView>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeIn} style={styles.headerCard}>
          <LinearGradient colors={['#00796b', '#004d40']} style={styles.headerGradient}>
            <RNView style={styles.headerTop}>
              <MaterialCommunityIcons name="image-filter-black-white" size={24} color="#1abc9c" />
              <Text style={styles.headerMainTitle}>{nm_perawatan || header?.nm_perawatan}</Text>
            </RNView>
            <RNView style={styles.headerDivider} />
            <RNView style={styles.infoGrid}>
              <RNView style={styles.infoItem}>
                <Text style={styles.infoLabel}>NAMA PASIEN</Text>
                <Text style={styles.infoValue}>{nm_pasien}</Text>
              </RNView>
              <RNView style={styles.infoItem}>
                <Text style={styles.infoLabel}>TANGGAL PERIKSA</Text>
                <Text style={styles.infoValue}>{new Date(tgl_periksa as string).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</Text>
              </RNView>
            </RNView>
            <RNView style={styles.infoGrid}>
              <RNView style={styles.infoItem}>
                <Text style={styles.infoLabel}>DOKTER RADIOLOGI</Text>
                <Text style={styles.infoValue}>{header?.nm_dokter_pj || '-'}</Text>
              </RNView>
              <RNView style={styles.infoItem}>
                <Text style={styles.infoLabel}>NOMOR RAWAT</Text>
                <Text style={styles.infoValue}>{no_rawat}</Text>
              </RNView>
            </RNView>
          </LinearGradient>
        </Animated.View>

        <RNView style={styles.content}>
          {details.map((item, index) => (
            <Animated.View key={index} entering={FadeIn.delay(index * 100)} style={styles.expertiseCard}>
              <RNView style={styles.expertiseHeader}>
                <MaterialCommunityIcons name="label-outline" size={18} color="#00796b" />
                <Text style={styles.expertiseTitle}>{item.kategori}</Text>
              </RNView>
              <RNView style={styles.expertiseContent}>
                <Text style={styles.expertiseText}>{item.hasil}</Text>
              </RNView>
            </Animated.View>
          ))}

          <RNView style={styles.footerNote}>
            <Ionicons name="information-circle-outline" size={16} color="#9e9e9e" />
            <Text style={styles.footerText}>
              Hasil ini merupakan interpretasi medis dari dokter spesialis radiologi. Silakan konsultasikan dengan dokter pengirim Anda.
            </Text>
          </RNView>
        </RNView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcfcfc' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 5,
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerCard: { margin: 15, borderRadius: 20, overflow: 'hidden', elevation: 8, shadowColor: '#004d40', shadowOpacity: 0.2, shadowRadius: 10 },
  headerGradient: { padding: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, backgroundColor: 'transparent' },
  headerMainTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginLeft: 10, flex: 1 },
  headerDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 20 },
  infoGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, backgroundColor: 'transparent' },
  infoItem: { flex: 1, backgroundColor: 'transparent' },
  infoLabel: { fontSize: 9, color: 'rgba(255,255,255,0.6)', letterSpacing: 1, marginBottom: 4, fontWeight: 'bold' },
  infoValue: { fontSize: 13, color: '#fff', fontWeight: '700' },
  
  content: { paddingHorizontal: 15, paddingBottom: 30 },
  expertiseCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0f2f1',
  },
  expertiseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f8e9',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0f2f1',
  },
  expertiseTitle: { fontSize: 14, fontWeight: 'bold', color: '#00796b', marginLeft: 8, textTransform: 'uppercase' },
  expertiseContent: { padding: 15, backgroundColor: '#fff' },
  expertiseText: { fontSize: 14, color: '#455a64', lineHeight: 24, textAlign: 'justify' },

  footerNote: { 
    marginTop: 10, 
    flexDirection: 'row', 
    padding: 15, 
    backgroundColor: '#f5f5f5', 
    borderRadius: 12,
    alignItems: 'center'
  },
  footerText: { flex: 1, marginLeft: 10, fontSize: 12, color: '#9e9e9e', fontStyle: 'italic' },
});
