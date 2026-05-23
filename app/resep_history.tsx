import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Dimensions, View as RNView, StatusBar, Platform, Alert } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import api from '../services/api';

const { width } = Dimensions.get('window');

export default function ResepHistoryScreen() {
  const router = useRouter();
  const { no_rkm_medis, nm_pasien } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resepList, setResepList] = useState<any[]>([]);

  const fetchHistory = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      let rm = no_rkm_medis;
      let name = nm_pasien;

      if (!rm || rm === 'undefined') {
        const userData = await SecureStore.getItemAsync('userData');
        if (userData) {
          const user = JSON.parse(userData);
          rm = user.no_rkm_medis;
          name = user.nm_pasien || user.nama_lengkap;
        }
      }

      if (!rm || rm === 'undefined') {
        setLoading(false);
        Alert.alert('Error', 'Nomor Rekam Medis tidak ditemukan. Silakan login kembali.');
        return;
      }

      const res = await api.get(`/get_resep_history.php?no_rkm_medis=${rm}`);
      if (res.data.status === 'success') {
        setResepList(res.data.data);
      } else if (res.data.requires_consent) {
        router.replace({
          pathname: '/resume_medis_consent',
          params: { no_rkm_medis: rm, nm_pasien: name, from: '/resep_history' }
        });
      } else {
        Alert.alert('E-Pasien', res.data.message || 'Gagal mengambil riwayat resep.');
      }
    } catch (e: any) {
      console.error(e);
      Alert.alert('Koneksi Gagal', 'Gagal memuat data dari server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [no_rkm_medis]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory(false);
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 100)}>
      <TouchableOpacity 
        style={styles.card}
        onPress={() => router.push({
          pathname: '/resep_detail',
          params: { 
            no_rawat: item.no_rawat, 
            tgl_perawatan: item.tgl_perawatan, 
            jam: item.jam,
            nm_pasien: nm_pasien 
          }
        })}
      >
        <LinearGradient colors={['#ffffff', '#f1f8e9']} style={styles.cardGradient}>
          <RNView style={styles.cardHeader}>
            <RNView style={styles.dateBadge}>
              <Text style={styles.dateText}>{new Date(item.tgl_perawatan).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
            </RNView>
            <MaterialCommunityIcons name="pill" size={20} color="#00796b" />
          </RNView>
          
          <Text style={styles.resepTitle} numberOfLines={2}>Resep Digital: {item.no_rawat}</Text>
          
          <RNView style={styles.infoRow}>
            <MaterialCommunityIcons name="doctor" size={14} color="#757575" />
            <Text style={styles.infoText}>Dokter: {item.nm_dokter || '-'}</Text>
          </RNView>

          <RNView style={styles.cardFooter}>
            <RNView style={styles.statusBox}>
              <RNView style={[styles.dot, { backgroundColor: '#1abc9c' }]} />
              <Text style={styles.statusText}>{item.status === 'ranap' ? 'Rawat Inap' : 'Rawat Jalan'}</Text>
            </RNView>
            <Ionicons name="chevron-forward" size={18} color="#bdbdbd" />
          </RNView>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <LinearGradient colors={['#004d40', '#00796b', '#1abc9c']} style={styles.header}>
        <RNView style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
          <RNView style={styles.headerTitleBox}>
            <Text style={styles.headerTitle}>Resep Digital</Text>
            <Text style={styles.headerStatus}>Riwayat Pemberian Obat</Text>
          </RNView>
        </RNView>
      </LinearGradient>

      {loading ? (
        <RNView style={styles.center}>
          <ActivityIndicator size="large" color="#00796b" />
          <Text style={styles.loadingText}>Menarik riwayat resep...</Text>
        </RNView>
      ) : (
        <FlatList
          data={resepList}
          keyExtractor={(item) => item.no_rawat + item.jam}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00796b']} />}
          ListEmptyComponent={
            <RNView style={styles.emptyBox}>
              <MaterialCommunityIcons name="pill-off" size={80} color="#e0e0e0" />
              <Text style={styles.emptyTitle}>Belum Ada Resep</Text>
              <Text style={styles.emptyDesc}>Riwayat resep obat Anda dalam 10 tahun terakhir akan muncul di sini.</Text>
            </RNView>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#666', fontSize: 14 },
  list: { padding: 15 },
  card: {
    marginBottom: 15,
    borderRadius: 15,
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  cardGradient: { padding: 15 },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: 'transparent',
  },
  dateBadge: {
    backgroundColor: '#e0f2f1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dateText: { color: '#00796b', fontSize: 12, fontWeight: 'bold' },
  resepTitle: { fontSize: 15, fontWeight: 'bold', color: '#263238', marginBottom: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, backgroundColor: 'transparent' },
  infoText: { fontSize: 12, color: '#757575', marginLeft: 6 },
  cardFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: 'transparent',
  },
  statusBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'transparent' },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 11, color: '#00796b', fontWeight: 'bold' },
  emptyBox: { marginTop: 100, alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#9e9e9e', marginTop: 15 },
  emptyDesc: { fontSize: 13, color: '#bdbdbd', textAlign: 'center', marginTop: 8, paddingHorizontal: 40 },
});
