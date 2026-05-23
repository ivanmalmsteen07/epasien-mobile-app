import React, { useState, useCallback, useMemo } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, Dimensions, StatusBar, ActivityIndicator, RefreshControl, View as RNView, Platform } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';
import api from '../services/api';

const { width } = Dimensions.get('window');

export default function RiwayatKunjunganScreen() {
  const router = useRouter();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRM, setSelectedRM] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/get_visit_history.php');
      if (res.data.status === 'success') {
        setHistory(res.data.data);
      }
    } catch (e) {
      console.error('Gagal mengambil riwayat:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [fetchHistory])
  );

  const groupedHistory = useMemo(() => {
    const groups: { [key: string]: { name: string, rm: string, visits: any[] } } = {};
    history.forEach(item => {
      if (!groups[item.no_rkm_medis]) {
        groups[item.no_rkm_medis] = {
          name: item.nm_pasien,
          rm: item.no_rkm_medis,
          visits: []
        };
      }
      groups[item.no_rkm_medis].visits.push(item);
    });
    return Object.values(groups);
  }, [history]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const formatDate = (dateStr: string) => {
    const options: any = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('id-ID', options);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Sudah': case 'Selesai': case 'Terkonfirmasi': return '#00796b';
      case 'Batal': return '#c62828';
      case 'Belum': return '#ef6c00';
      default: return '#546e7a';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* HEADER IDENTIK DENGAN BOOKING ANTRIAN */}
      <LinearGradient colors={['#004d40', '#00796b', '#1abc9c']} style={styles.header}>
        <RNView style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
          <RNView style={styles.headerTitleBox}>
            <Text style={styles.headerTitle}>Riwayat Kunjungan</Text>
            <Text style={styles.headerStatus}>Jejak Perjalanan Kesehatan</Text>
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
            <View style={styles.loaderBox}>
              <ActivityIndicator size="large" color="#00796b" />
              <Text style={styles.loaderText}>Menyiapkan data riwayat...</Text>
            </View>
          ) : groupedHistory.length === 0 ? (
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons name="history" size={80} color="#cfd8dc" />
              <Text style={styles.emptyTitle}>Belum Ada Riwayat</Text>
              <Text style={styles.emptyDesc}>Seluruh kunjungan keluarga Anda akan muncul di sini.</Text>
            </View>
          ) : (
            groupedHistory.map((patient, pIndex) => (
              <Animated.View 
                key={`p-${pIndex}-${patient.rm}`} 
                entering={FadeInDown.delay(pIndex * 100)}
                layout={Layout.springify()}
                style={styles.patientSection}
              >
                {/* PATIENT CARD (HEADER KELOMPOK) */}
                <TouchableOpacity 
                  activeOpacity={0.8}
                  onPress={() => setSelectedRM(selectedRM === patient.rm ? null : patient.rm)}
                  style={[styles.patientCard, selectedRM === patient.rm && styles.patientCardActive]}
                >
                  <View style={styles.patientInfo}>
                    <View style={styles.avatarBox}>
                      <LinearGradient colors={['#e0f2f1', '#b2dfdb']} style={styles.avatarGradient}>
                        <MaterialCommunityIcons name="account" size={30} color="#00796b" />
                      </LinearGradient>
                    </View>
                    <View style={styles.nameBox}>
                      <Text style={styles.patientName}>{patient.name}</Text>
                      <Text style={styles.patientRM}>No. RM: {patient.rm}</Text>
                    </View>
                    <View style={styles.visitBadge}>
                      <Text style={styles.visitCount}>{patient.visits.length}</Text>
                      <Text style={styles.visitLabel}>Kunjungan</Text>
                    </View>
                    <Ionicons 
                      name={selectedRM === patient.rm ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color="#b0bec5" 
                    />
                  </View>
                </TouchableOpacity>

                {/* LIST KUNJUNGAN (EXPENDABLE) */}
                {selectedRM === patient.rm && (
                  <Animated.View entering={FadeInUp} style={styles.visitList}>
                    {patient.visits.map((visit, vIndex) => (
                      <View key={`v-${pIndex}-${vIndex}-${visit.no_booking}`} style={styles.visitCard}>
                        <View style={[styles.statusStrip, { backgroundColor: getStatusColor(visit.status) }]} />
                        
                        <View style={styles.visitHeader}>
                          <Text style={styles.visitDate}>{formatDate(visit.tgl_periksa)}</Text>
                          <View style={[styles.statusPill, { backgroundColor: getStatusColor(visit.status) + '15' }]}>
                            <Text style={[styles.statusText, { color: getStatusColor(visit.status) }]}>
                              {visit.status === 'Sudah' ? 'SELESAI' : visit.status.toUpperCase()}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.visitBody}>
                          <View style={styles.queueInfo}>
                            <View style={styles.qBox}>
                              <Text style={styles.qLabel}>NO. ANTREAN</Text>
                              <Text style={[styles.qValue, { color: getStatusColor(visit.status) }]}>
                                {visit.no_reg || '-'}
                              </Text>
                            </View>
                            <View style={styles.vInfo}>
                              <Text style={styles.vPoli}>{visit.nm_poli}</Text>
                              <Text style={styles.vDoctor}>{visit.nm_dokter}</Text>
                              <Text style={styles.vRawat}>No. Rawat: {visit.no_rawat}</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    ))}
                  </Animated.View>
                )}
              </Animated.View>
            ))
          )}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fdfc',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
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
    padding: 25,
    backgroundColor: 'transparent',
  },
  patientSection: {
    marginBottom: 15,
    backgroundColor: 'transparent',
  },
  patientCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  patientCardActive: {
    borderColor: '#00796b',
    backgroundColor: '#f0fdfa',
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  avatarBox: {
    marginRight: 15,
    backgroundColor: 'transparent',
  },
  avatarGradient: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameBox: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#263238',
  },
  patientRM: {
    fontSize: 12,
    color: '#78909c',
    marginTop: 2,
  },
  visitBadge: {
    alignItems: 'center',
    marginRight: 15,
    backgroundColor: 'transparent',
  },
  visitCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00796b',
  },
  visitLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#90a4ae',
  },
  visitList: {
    marginTop: 10,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#e0f2f1',
    backgroundColor: 'transparent',
  },
  visitCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  statusStrip: {
    height: 3,
    width: '100%',
  },
  visitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f8f8',
    backgroundColor: 'transparent',
  },
  visitDate: {
    fontSize: 11,
    fontWeight: '700',
    color: '#607d8b',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 8,
    fontWeight: '900',
  },
  visitBody: {
    padding: 12,
    backgroundColor: 'transparent',
  },
  queueInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  qBox: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#f0fdfa',
    borderWidth: 1,
    borderColor: '#e0f2f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  qLabel: {
    fontSize: 7,
    fontWeight: '900',
    color: '#00796b',
    marginBottom: 2,
  },
  qValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  vInfo: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  vPoli: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#37474f',
    marginBottom: 2,
  },
  vDoctor: {
    fontSize: 11,
    color: '#78909c',
    marginBottom: 4,
  },
  vRawat: {
    fontSize: 9,
    color: '#b0bec5',
    fontWeight: '600',
  },
  loaderBox: {
    marginTop: 100,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  loaderText: {
    marginTop: 15,
    color: '#90a4ae',
    fontSize: 13,
  },
  emptyBox: {
    marginTop: 100,
    alignItems: 'center',
    paddingHorizontal: 50,
    backgroundColor: 'transparent',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#b0bec5',
    marginTop: 20,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#cfd8dc',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
  }
});
