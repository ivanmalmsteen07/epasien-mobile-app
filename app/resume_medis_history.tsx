import React, { useState, useCallback } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, Dimensions, StatusBar, ActivityIndicator, RefreshControl, View as RNView, Platform } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useRouter, Stack, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import api from '../services/api';

export default function ResumeMedisHistoryScreen() {
  const router = useRouter();
  const { no_rkm_medis, nm_pasien } = useLocalSearchParams();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/get_resume_medis.php?no_rkm_medis=${no_rkm_medis}`);
      if (res.data.status === 'success') {
        setHistory(res.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [no_rkm_medis]);

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [fetchHistory])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const formatDate = (dateStr: string) => {
    const options: any = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('id-ID', options);
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
            <Text style={styles.headerTitle}>Daftar Resume Medis</Text>
            <Text style={styles.headerStatus}>{nm_pasien}</Text>
          </RNView>
        </RNView>
      </LinearGradient>

      <ScrollView 
        style={styles.scroll} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00796b" />}
      >
        <View style={styles.content}>
          {loading && !refreshing ? (
            <ActivityIndicator size="large" color="#00796b" style={{ marginTop: 50 }} />
          ) : history.length === 0 ? (
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={80} color="#cfd8dc" />
              <Text style={styles.emptyTitle}>Data Belum Tersedia</Text>
              <Text style={styles.emptyDesc}>
                Sistem sedang menarik data klinis Anda dari SIMRS pusat. Silakan refresh berkala dalam 1-5 menit ke depan.
              </Text>
            </View>
          ) : (
            history.map((item, index) => (
              <Animated.View key={item.no_rawat} entering={FadeInDown.delay(index * 100)}>
                <TouchableOpacity 
                  style={styles.resumeCard}
                  onPress={() => router.push({
                    pathname: '/resume_medis_detail',
                    params: { data: JSON.stringify(item) }
                  })}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.dateText}>{formatDate(item.tgl_periksa)}</Text>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>RALAN</Text>
                    </View>
                  </View>
                  <View style={styles.cardBody}>
                    <View style={styles.iconBox}>
                      <MaterialCommunityIcons name="doctor" size={24} color="#00796b" />
                    </View>
                    <View style={styles.infoBox}>
                      <Text style={styles.poliText}>{item.nm_poli}</Text>
                      <Text style={styles.doctorText}>{item.nm_dokter}</Text>
                      <Text style={styles.rawatText}>No. Rawat: {item.no_rawat}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#b0bec5" />
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))
          )}
        </View>
      </ScrollView>
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
  content: { padding: 25 },
  resumeCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 15,
    padding: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    paddingBottom: 10,
    marginBottom: 10,
    backgroundColor: 'transparent',
  },
  dateText: { fontSize: 11, fontWeight: 'bold', color: '#78909c' },
  badge: {
    backgroundColor: '#e0f2f1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: { fontSize: 9, fontWeight: '900', color: '#00796b' },
  cardBody: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'transparent' },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#f0fdfa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  infoBox: { flex: 1, backgroundColor: 'transparent' },
  poliText: { fontSize: 15, fontWeight: 'bold', color: '#263238' },
  doctorText: { fontSize: 12, color: '#607d8b', marginTop: 2 },
  rawatText: { fontSize: 9, color: '#b0bec5', marginTop: 4, fontWeight: '600' },
  emptyBox: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#b0bec5', marginTop: 20 },
  emptyDesc: { fontSize: 13, color: '#cfd8dc', textAlign: 'center', marginTop: 10, lineHeight: 20 },
});
