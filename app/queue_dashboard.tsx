import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SectionList, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl,
  Dimensions,
  TextInput,
  StatusBar,
  Platform,
  Modal,
  ScrollView
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import api from '../services/api';
import Colors from '../constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

const { width } = Dimensions.get('window');

interface QueueItem {
  kd_poli: string;
  kd_dokter: string;
  nm_poli: string;
  nm_dokter: string;
  total_antrean: number;
  antrean_sekarang: string;
  sisa_antrean: number;
  last_update: string;
}

export default function QueueDashboard() {
  const [queues, setQueues] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // State untuk Detail Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<QueueItem | null>(null);
  const [details, setDetails] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchQueues = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const response = await api.get('/get_queue_dashboard.php');
      if (response.data.status === 'success') {
        setQueues(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching queue dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchQueues();
    const interval = setInterval(() => fetchQueues(false), 60000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchQueues(false);
  }, []);

  const fetchDetails = async (item: QueueItem) => {
    setSelectedDoctor(item);
    setModalVisible(true);
    setLoadingDetails(true);
    setDetails([]);
    try {
      const response = await api.get(`/get_queue_details.php?kd_poli=${item.kd_poli}&kd_dokter=${item.kd_dokter}`);
      if (response.data.status === 'success') {
        setDetails(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching queue details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const sections = useMemo(() => {
    const filtered = queues.filter(item => 
      item.nm_dokter.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nm_poli.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const groups: { [key: string]: QueueItem[] } = {};
    filtered.forEach(item => {
      if (!groups[item.nm_poli]) groups[item.nm_poli] = [];
      groups[item.nm_poli].push(item);
    });

    return Object.keys(groups).sort().map(poli => ({
      title: poli,
      data: groups[poli]
    }));
  }, [queues, searchQuery]);

  const formattedDate = useMemo(() => {
    if (queues.length > 0 && queues[0].last_update) {
      // Handle "YYYY-MM-DD HH:mm:ss" format safely
      const normalizedDate = queues[0].last_update.replace(' ', 'T');
      const date = new Date(normalizedDate);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      }
    }
    return new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }, [queues]);

  const renderItem = ({ item, index }: { item: QueueItem, index: number }) => {
    const isServing = parseInt(item.antrean_sekarang) > 0 && item.antrean_sekarang !== '000';
    const progress = Math.min(1, (parseInt(item.antrean_sekarang) / item.total_antrean) || 0);
    
    return (
      <Animated.View 
        entering={FadeInDown.delay(index * 80).springify()}
        style={[styles.card, isDark && styles.cardDark]}
      >
        <View style={styles.cardTop}>
          <View style={styles.doctorBadge}>
            <LinearGradient
              colors={isServing ? ['#00897b', '#4db6ac'] : ['#cfd8dc', '#b0bec5']}
              style={styles.doctorIconCircle}
            >
              <FontAwesome5 name="user-md" size={18} color="#fff" />
            </LinearGradient>
            <View style={styles.doctorMeta}>
              <Text style={[styles.docName, isDark && styles.textWhite]} numberOfLines={1}>{item.nm_dokter}</Text>
              <View style={styles.updateRow}>
                <Ionicons name="time-outline" size={12} color="#999" />
                <Text style={styles.updateText}>Update: {new Date(item.last_update).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.servingContainer}>
            <Text style={styles.servingLabel}>SEKARANG</Text>
            <View style={[styles.servingNumberBox, isServing && styles.servingActive]}>
              <Text style={[styles.servingNumber, isServing && { color: '#fff' }]}>
                {isServing ? item.antrean_sekarang : '--'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressText}>Progres Pelayanan</Text>
            <Text style={styles.progressPercent}>{Math.round(progress * 100)}%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <LinearGradient
              colors={['#004d40', '#1abc9c']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressBarFill, { width: `${progress * 100}%` }]}
            />
          </View>
        </View>

        <View style={styles.cardStats}>
          <View style={styles.statBox}>
            <View style={[styles.statIcon, { backgroundColor: '#e0f2f1' }]}>
              <Ionicons name="people" size={14} color="#00796b" />
            </View>
            <View>
              <Text style={styles.statLabel}>Total</Text>
              <Text style={[styles.statValue, isDark && styles.textWhite]}>{item.total_antrean}</Text>
            </View>
          </View>
          
          <View style={styles.statBox}>
            <View style={[styles.statIcon, { backgroundColor: '#ffebee' }]}>
              <Ionicons name="hourglass" size={14} color="#e53935" />
            </View>
            <View>
              <Text style={styles.statLabel}>Sisa</Text>
              <Text style={[styles.statValue, { color: '#e53935' }]}>{item.sisa_antrean}</Text>
            </View>
          </View>

          <View style={[styles.statusTag, isServing ? styles.statusTagActive : styles.statusTagIdle]}>
            <View style={[styles.pulseDot, { backgroundColor: isServing ? '#00e676' : '#999' }]} />
            <Text style={[styles.statusTagText, { color: isServing ? '#2e7d32' : '#757575' }]}>
              {isServing ? 'AKTIF' : 'ANTRE'}
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.detailBtn, isDark && styles.detailBtnDark]}
          onPress={() => fetchDetails(item)}
        >
          <Text style={styles.detailBtnText}>Klik untuk melihat rincian data</Text>
          <Ionicons name="chevron-forward" size={14} color="#00796b" />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#121212' : '#f8fdfc' }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <LinearGradient 
        colors={['#004d40', '#00796b', '#1abc9c']} 
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitleBox}>
            <Text style={styles.headerTitle}>Dashboard Antrian Online</Text>
            <Text style={styles.headerStatus}>Realtime update setiap 1 menit</Text>
          </View>
          <TouchableOpacity onPress={() => onRefresh()} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="rgba(255,255,255,0.6)" />
          <TextInput 
            style={styles.searchInput}
            placeholder="Cari poli atau dokter spesialis..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </LinearGradient>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#00796b" />
          <Text style={[styles.loadingText, { color: isDark ? '#888' : '#666' }]}>Mengambil data realtime...</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => `${item.kd_poli}-${item.kd_dokter}`}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listPadding}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00796b" />}
          ListHeaderComponent={
            <Animated.View 
              entering={FadeInDown.delay(100).springify()}
              style={[styles.dateCard, isDark && styles.dateCardDark]}
            >
              <View style={[styles.dateIconWrapper, { backgroundColor: isDark ? 'rgba(26, 188, 156, 0.15)' : 'rgba(0, 121, 107, 0.1)' }]}>
                <MaterialCommunityIcons name="calendar-clock" size={24} color={isDark ? '#1abc9c' : '#00796b'} />
              </View>
              <View style={styles.dateContent}>
                <Text style={[styles.dateLabel, { color: isDark ? '#888' : '#666' }]}>Display Antrean Tanggal:</Text>
                <Text style={[styles.dateValue, isDark && styles.textWhite]}>{formattedDate}</Text>
              </View>
            </Animated.View>
          }
          renderSectionHeader={({ section: { title } }) => (
            <Animated.View entering={FadeInRight} style={[styles.sectionHeader, isDark && styles.sectionHeaderDark]}>
              <View style={styles.sectionHeaderContent}>
                <View style={styles.sectionIndicator} />
                <Text style={[styles.sectionTitle, { color: isDark ? '#1abc9c' : '#00796b' }]}>{title}</Text>
              </View>
            </Animated.View>
          )}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="monitor-dashboard" size={80} color={isDark ? '#333' : '#eee'} />
              <Text style={[styles.emptyText, { color: isDark ? '#555' : '#aaa' }]}>Tidak ada antrian aktif saat ini</Text>
            </View>
          }
        />
      )}

      {/* Modal Rincian Data */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, isDark && styles.textWhite]}>Rincian Antrean</Text>
                <Text style={styles.modalSubTitle}>{selectedDoctor?.nm_poli}</Text>
                <Text style={[styles.modalDocName, isDark && styles.textWhite]}>{selectedDoctor?.nm_dokter}</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={isDark ? '#fff' : '#333'} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {loadingDetails ? (
                <View style={styles.modalLoading}>
                  <ActivityIndicator size="large" color="#00796b" />
                  <Text style={styles.loadingText}>Memuat rincian...</Text>
                </View>
              ) : (
                <ScrollView contentContainerStyle={styles.detailList}>
                  <View style={styles.detailGrid}>
                    {details.map((det, idx) => {
                      let statusColor = '#9e9e9e';
                      let bgColor = '#f5f5f5';
                      
                      if (det.status === 'Selesai') {
                        statusColor = '#2e7d32';
                        bgColor = '#e8f5e9';
                      } else if (det.status === 'Sedang Dilayani') {
                        statusColor = '#00796b';
                        bgColor = '#e0f2f1';
                      } else if (det.status === 'Batal') {
                        statusColor = '#c62828';
                        bgColor = '#ffebee';
                      }

                      return (
                        <View key={idx} style={[styles.detailItem, { backgroundColor: bgColor }]}>
                          <Text style={[styles.detailNo, { color: statusColor }]}>{det.no_reg}</Text>
                          <Text style={[styles.detailStatus, { color: statusColor }]}>{det.status}</Text>
                        </View>
                      );
                    })}
                  </View>
                  {details.length === 0 && (
                    <Text style={styles.emptyDetailText}>Belum ada nomor antrean terdaftar.</Text>
                  )}
                </ScrollView>
              )}
            </View>
            
            <TouchableOpacity 
              style={styles.modalFooterBtn} 
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalFooterBtnText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 35,
    paddingBottom: 25,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    elevation: 15,
    shadowColor: '#004d40',
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  headerTitleBox: { marginLeft: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', letterSpacing: 0.5 },
  headerStatus: { fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginTop: 2 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginHorizontal: 20,
    marginTop: 25,
    paddingHorizontal: 15,
    height: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  searchInput: { flex: 1, marginLeft: 10, color: '#fff', fontSize: 14, fontWeight: '600' },
  listPadding: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 20 },
  dateCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#00796b',
    shadowOpacity: 0.12,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    marginBottom: 20,
    marginTop: 5, // Removed negative margin to prevent overlapping
    borderWidth: 1,
    borderColor: 'rgba(0,121,107,0.05)',
  },
  dateCardDark: {
    backgroundColor: '#1e1e1e',
    borderColor: '#333',
    elevation: 0,
  },
  dateIconWrapper: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  dateContent: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#263238',
  },
  sectionHeader: {
    backgroundColor: 'rgba(248, 253, 252, 0.95)',
    paddingVertical: 12,
    marginTop: 15,
    marginBottom: 10,
    borderRadius: 12,
  },
  sectionHeaderDark: {
    backgroundColor: 'rgba(18, 18, 18, 0.95)',
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIndicator: {
    width: 5,
    height: 20,
    backgroundColor: '#1abc9c',
    borderRadius: 3,
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 20,
    marginBottom: 18,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    borderWidth: 1,
    borderColor: 'rgba(0,166,156,0.05)',
  },
  cardDark: { backgroundColor: '#1e1e1e', elevation: 0, borderWidth: 1, borderColor: '#333' },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  doctorBadge: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  doctorIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  doctorMeta: { flex: 1 },
  docName: { fontSize: 16, fontWeight: '800', color: '#263238', marginBottom: 4 },
  updateRow: { flexDirection: 'row', alignItems: 'center' },
  updateText: { fontSize: 10, color: '#9e9e9e', marginLeft: 4, fontWeight: '600' },
  servingContainer: { alignItems: 'center', width: 70 },
  servingLabel: { fontSize: 8, fontWeight: '900', color: '#00796b', marginBottom: 6, letterSpacing: 0.5 },
  servingNumberBox: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  servingActive: {
    backgroundColor: '#00796b',
    borderColor: '#004d40',
    elevation: 10,
    shadowColor: '#00796b',
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  servingNumber: { fontSize: 26, fontWeight: '900', color: '#bdbdbd' },
  progressSection: { marginBottom: 20 },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: { fontSize: 11, fontWeight: '700', color: '#78909c' },
  progressPercent: { fontSize: 11, fontWeight: '900', color: '#00796b' },
  progressBarBg: {
    height: 6,
    backgroundColor: '#f1f1f1',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  cardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f9f9f9',
  },
  statBox: { flexDirection: 'row', alignItems: 'center' },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statLabel: { fontSize: 11, fontWeight: 'bold', color: '#90a4ae' },
  statValue: { fontSize: 22, fontWeight: '900', color: '#37474f' },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  statusTagActive: { backgroundColor: '#e8f5e9' },
  statusTagIdle: { backgroundColor: '#f5f5f5' },
  pulseDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusTagText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  detailBtn: {
    marginTop: 15,
    backgroundColor: '#f0f9f8',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0f2f1',
  },
  detailBtnDark: {
    backgroundColor: 'rgba(26, 188, 156, 0.1)',
    borderColor: 'rgba(26, 188, 156, 0.2)',
  },
  detailBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00796b',
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    height: '80%',
    padding: 25,
  },
  modalContentDark: {
    backgroundColor: '#1e1e1e',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#263238',
  },
  modalSubTitle: {
    fontSize: 12,
    color: '#00796b',
    fontWeight: '700',
    marginTop: 4,
  },
  modalDocName: {
    fontSize: 14,
    color: '#546e7a',
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    padding: 5,
  },
  modalBody: {
    flex: 1,
  },
  modalLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailList: {
    paddingBottom: 20,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  detailItem: {
    width: '31%',
    padding: 12,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 12,
  },
  detailNo: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  detailStatus: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
  emptyDetailText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 50,
    fontSize: 14,
  },
  modalFooterBtn: {
    backgroundColor: '#00796b',
    paddingVertical: 15,
    borderRadius: 18,
    alignItems: 'center',
    marginTop: 10,
  },
  modalFooterBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: '700' },
  emptyContainer: { flex: 1, alignItems: 'center', marginTop: 120, opacity: 0.5 },
  emptyText: { marginTop: 20, fontSize: 15, fontWeight: '600' },
  textWhite: { color: '#fff' }
});
