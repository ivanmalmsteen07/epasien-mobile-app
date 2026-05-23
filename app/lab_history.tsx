import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Dimensions, View, StatusBar, Platform } from 'react-native';
import { Text } from '@/components/Themed';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import api from '../services/api';

const { width } = Dimensions.get('window');

export default function LabHistoryScreen() {
  const router = useRouter();
  const { no_rkm_medis, nm_pasien } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [labs, setLabs] = useState<any[]>([]);

  const fetchLabs = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      let rm = no_rkm_medis;
      let name = nm_pasien;

      if (!rm) {
        const userData = await SecureStore.getItemAsync('userData');
        if (userData) {
          const user = JSON.parse(userData);
          rm = user.no_rkm_medis;
          name = user.nm_pasien || user.nama_lengkap;
        }
      }

      if (!rm) {
        setLoading(false);
        return;
      }

      const res = await api.get(`/get_lab_history.php?no_rkm_medis=${rm}`);
      if (res.data.status === 'success') {
        setLabs(res.data.data);
      } else if (res.data.requires_consent) {
        router.replace({
          pathname: '/resume_medis_consent',
          params: { no_rkm_medis: rm, nm_pasien: name, from: '/lab_history' }
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLabs();
  }, [no_rkm_medis]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLabs(false);
  };

  const renderItem = ({ item, index }: { item: any, index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 100)}>
      <TouchableOpacity 
        style={styles.card}
        onPress={() => router.push({
          pathname: '/lab_detail',
          params: { 
            no_rawat: item.no_rawat,
            nm_perawatan: item.nm_perawatan,
            tgl_periksa: item.tgl_periksa,
            jam: item.jam,
            nm_pasien 
          }
        })}
      >
        <LinearGradient colors={['#ffffff', '#f1f8e9']} style={styles.cardGradient}>
          <View style={styles.cardHeader}>
            <View style={styles.dateBadge}>
              <Text style={styles.dateText}>{new Date(item.tgl_periksa).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
            </View>
            <Ionicons name="flask-outline" size={20} color="#2e7d32" />
          </View>
          
          <Text style={styles.labTitle}>{item.nm_perawatan}</Text>
          
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="doctor" size={14} color="#757575" />
            <Text style={styles.infoText}>Perujuk: {item.nm_dokter_perujuk || '-'}</Text>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.statusBox}>
              <View style={styles.dot} />
              <Text style={styles.statusText}>Hasil Tersedia</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#bdbdbd" />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <LinearGradient colors={['#004d40', '#00796b', '#1abc9c']} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitleBox}>
            <Text style={styles.headerTitle}>Hasil Laboratorium</Text>
            <Text style={styles.headerStatus}>Riwayat Pemeriksaan Klinis</Text>
          </View>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2e7d32" />
          <Text style={styles.loadingText}>Menarik data hasil lab...</Text>
        </View>
      ) : (
        <FlatList
          data={labs}
          keyExtractor={(item) => item.no_rawat + item.jam}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons name="test-tube-empty" size={80} color="#e0e0e0" />
              <Text style={styles.emptyTitle}>Belum Ada Hasil Lab</Text>
              <Text style={styles.emptyDesc}>Data laboratorium dalam 10 tahun terakhir akan muncul di sini.</Text>
            </View>
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
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleBox: { marginLeft: 15 },
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
  },
  dateBadge: {
    backgroundColor: '#e0f2f1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dateText: { color: '#00796b', fontSize: 12, fontWeight: 'bold' },
  labTitle: { fontSize: 16, fontWeight: 'bold', color: '#263238', marginBottom: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  infoText: { fontSize: 12, color: '#757575', marginLeft: 6 },
  cardFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statusBox: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#1abc9c', marginRight: 6 },
  statusText: { fontSize: 11, color: '#00796b', fontWeight: 'bold' },
  emptyBox: { marginTop: 100, alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#9e9e9e', marginTop: 15 },
  emptyDesc: { fontSize: 13, color: '#bdbdbd', textAlign: 'center', marginTop: 8, paddingHorizontal: 40 },
});
