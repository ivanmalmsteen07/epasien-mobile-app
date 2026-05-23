import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, ActivityIndicator, Dimensions, View as RNView, Platform, StatusBar, TouchableOpacity } from 'react-native';
import { Text, View } from '@/components/Themed';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import api from '../services/api';

const { width } = Dimensions.get('window');

export default function ResepDetailScreen() {
  const router = useRouter();
  const { no_rawat, tgl_perawatan, jam, nm_pasien } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [header, setHeader] = useState<any>(null);
  const [details, setDetails] = useState<any[]>([]);
  const [racikans, setRacikans] = useState<any[]>([]);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await api.get(`/get_resep_detail.php?no_rawat=${no_rawat}&tgl_perawatan=${tgl_perawatan}&jam=${jam}`);
        if (res.data.status === 'success') {
          setHeader(res.data.header);
          setDetails(res.data.details);
          setRacikans(res.data.racikans);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [no_rawat, tgl_perawatan, jam]);

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
            <Text style={styles.headerTitle}>Detail Resep</Text>
            <Text style={styles.headerStatus}>E-Prescription E-Pasien</Text>
          </RNView>
        </RNView>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeIn} style={styles.headerCard}>
          <LinearGradient colors={['#00796b', '#004d40']} style={styles.headerGradient}>
            <RNView style={styles.headerTop}>
              <MaterialCommunityIcons name="pill" size={24} color="#1abc9c" />
              <Text style={styles.headerMainTitle}>Informasi Resep Digital</Text>
            </RNView>
            <RNView style={styles.headerDivider} />
            <RNView style={styles.infoGrid}>
              <RNView style={styles.infoItem}>
                <Text style={styles.infoLabel}>NAMA PASIEN</Text>
                <Text style={styles.infoValue}>{nm_pasien}</Text>
              </RNView>
              <RNView style={styles.infoItem}>
                <Text style={styles.infoLabel}>TANGGAL RESEP</Text>
                <Text style={styles.infoValue}>{new Date(tgl_perawatan as string).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</Text>
              </RNView>
            </RNView>
            <RNView style={styles.infoGrid}>
              <RNView style={styles.infoItem}>
                <Text style={styles.infoLabel}>DOKTER PENULIS</Text>
                <Text style={styles.infoValue}>{header?.nm_dokter || '-'}</Text>
              </RNView>
              <RNView style={styles.infoItem}>
                <Text style={styles.infoLabel}>NOMOR RAWAT</Text>
                <Text style={styles.infoValue}>{no_rawat}</Text>
              </RNView>
            </RNView>
          </LinearGradient>
        </Animated.View>

        <RNView style={styles.content}>
          {/* Obat Reguler */}
          {details.length > 0 && (
            <RNView style={styles.sectionHeader}>
              <MaterialCommunityIcons name="label-outline" size={18} color="#00796b" />
              <Text style={styles.sectionTitle}>Obat Reguler</Text>
            </RNView>
          )}

          {details.map((item, index) => (
            <Animated.View key={`reg-${index}`} entering={FadeInDown.delay(index * 100)} style={styles.itemCard}>
              <RNView style={styles.itemHeader}>
                <Text style={styles.itemName}>{item.nama_obat}</Text>
                <RNView style={styles.qtyBadge}>
                  <Text style={styles.qtyText}>{item.jml} {item.satuan}</Text>
                </RNView>
              </RNView>
              <RNView style={styles.itemContent}>
                <RNView style={styles.dosageRow}>
                  <MaterialIcons name="info-outline" size={16} color="#00796b" />
                  <Text style={styles.dosageText}>Dosis: {item.aturan_pakai || 'Sesuai petunjuk dokter'}</Text>
                </RNView>
              </RNView>
            </Animated.View>
          ))}

          {/* Obat Racikan */}
          {racikans.length > 0 && (
            <RNView style={[styles.sectionHeader, { marginTop: 10 }]}>
              <MaterialCommunityIcons name="mortar-pestle" size={18} color="#00796b" />
              <Text style={styles.sectionTitle}>Obat Racikan</Text>
            </RNView>
          )}

          {racikans.map((item, index) => (
            <Animated.View key={`racik-${index}`} entering={FadeInDown.delay(index * 100)} style={styles.itemCard}>
              <RNView style={[styles.itemHeader, { backgroundColor: '#f1f8e9' }]}>
                <Text style={styles.itemName}>{item.nama_racik}</Text>
                <RNView style={styles.qtyBadge}>
                  <Text style={styles.qtyText}>{item.keterangan}</Text>
                </RNView>
              </RNView>
              <RNView style={styles.itemContent}>
                <Text style={styles.compositionLabel}>Komposisi:</Text>
                <Text style={styles.compositionText}>{item.item_obat?.join(', ')}</Text>
                <RNView style={[styles.dosageRow, { marginTop: 10, borderTopWidth: 1, borderTopColor: '#f5f5f5', paddingTop: 10 }]}>
                  <MaterialIcons name="info-outline" size={16} color="#00796b" />
                  <Text style={styles.dosageText}>Dosis: {item.aturan_pakai || 'Sesuai petunjuk dokter'}</Text>
                </RNView>
              </RNView>
            </Animated.View>
          ))}

          <RNView style={styles.footerNote}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#4caf50" />
            <Text style={styles.footerText}>
              Resep ini telah diverifikasi oleh Apoteker. Segera hubungi petugas jika terjadi efek samping obat.
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
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, backgroundColor: 'transparent' },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#00796b', marginLeft: 8, textTransform: 'uppercase' },
  
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0f2f1',
    borderLeftWidth: 4,
    borderLeftColor: '#00796b',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f1f8e9',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0f2f1',
  },
  itemName: { fontSize: 14, fontWeight: 'bold', color: '#00796b', flex: 1 },
  qtyBadge: { backgroundColor: '#00796b', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  qtyText: { fontSize: 10, color: '#fff', fontWeight: 'bold' },
  itemContent: { padding: 15, backgroundColor: '#fff' },
  dosageRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'transparent' },
  dosageText: { fontSize: 13, color: '#2e7d32', fontWeight: 'bold', marginLeft: 10, flex: 1 },
  compositionLabel: { fontSize: 11, color: '#9e9e9e', fontWeight: 'bold', marginBottom: 4 },
  compositionText: { fontSize: 13, color: '#455a64', lineHeight: 20 },

  footerNote: { 
    marginTop: 10, 
    flexDirection: 'row', 
    padding: 15, 
    backgroundColor: '#f5f5f5', 
    borderRadius: 12,
    alignItems: 'center'
  },
  footerText: { flex: 1, marginLeft: 10, fontSize: 11, color: '#9e9e9e', fontStyle: 'italic' },
});
