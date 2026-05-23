import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl,
  Dimensions,
  TextInput,
  StatusBar,
  Platform,
  Modal,
  ScrollView,
  FlatList,
  Alert
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';
import api from '../services/api';
import { useColorScheme } from '@/components/useColorScheme';
import CustomAlert from '@/components/CustomAlert';

const { width } = Dimensions.get('window');

interface HealthEntry {
  id: number;
  category: string;
  value_1: number;
  value_2: number | null;
  unit: string;
  note: string;
  status: 'normal' | 'low' | 'high' | 'warning';
  created_at: string;
}

const CATEGORIES = [
  { id: 'blood_pressure', title: 'Tekanan Darah', icon: 'heart-pulse', color: '#ff1744', unit: 'mmHg' },
  { id: 'blood_sugar', title: 'Gula Darah', icon: 'water', color: '#ff9100', unit: 'mg/dL' },
  { id: 'heart_rate', title: 'Detak Jantung', icon: 'pulse', color: '#2979ff', unit: 'BPM' },
  { id: 'weight', title: 'Berat Badan', icon: 'weight-kilogram', color: '#00bfa5', unit: 'kg' },
  { id: 'temperature', title: 'Suhu Tubuh', icon: 'thermometer', color: '#c62828', unit: '°C' },
  { id: 'spo2', title: 'Saturasi Oksigen', icon: 'lungs', color: '#00e5ff', unit: '%' },
  { id: 'respiratory_rate', title: 'Frekuensi Napas', icon: 'airbox', color: '#6a1b9a', unit: 'x/menit' },
];

export default function HealthTracker() {
  const [history, setHistory] = useState<HealthEntry[]>([]);
  const [summary, setSummary] = useState<HealthEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Add Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCat, setSelectedCat] = useState(CATEGORIES[0]);
  const [val1, setVal1] = useState('');
  const [val2, setVal2] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Alert State
  const [alert, setAlert] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info' | 'warning'
  });

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    setAlert({ visible: true, title, message, type });
  };

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const response = await api.get('/get_health_history.php');
      if (response.data.status === 'success') {
        setHistory(response.data.data.history);
        setSummary(response.data.data.summary);
      }
    } catch (error) {
      console.error('Error fetching health history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(false);
  }, []);

  const handleSave = async () => {
    if (!val1) {
      showAlert('Peringatan', 'Mohon isi nilai utama.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/save_health_data.php', {
        category: selectedCat.id,
        value_1: val1,
        value_2: selectedCat.id === 'blood_pressure' ? val2 : null,
        unit: selectedCat.unit,
        note: note
      });

      if (response.data.status === 'success') {
        setModalVisible(false);
        setVal1('');
        setVal2('');
        setNote('');
        fetchData(false);
        showAlert('Berhasil', 'Data kesehatan Anda telah disimpan.', 'success');
      }
    } catch (error) {
      showAlert('Error', 'Gagal menyimpan data ke server.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'high': return '#e53935';
      case 'low': return '#1e88e5';
      case 'warning': return '#fb8c00';
      default: return '#43a047';
    }
  };

  const renderSummaryCard = (item: HealthEntry) => {
    const catInfo = CATEGORIES.find(c => c.id === item.category);
    if (!catInfo) return null;

    return (
      <TouchableOpacity 
        key={item.category}
        style={[styles.summaryCard, isDark && styles.cardDark]}
        onPress={() => setSelectedCat(catInfo)}
      >
        <View style={[styles.catIconCircle, { backgroundColor: catInfo.color + '15' }]}>
          <MaterialCommunityIcons name={catInfo.icon as any} size={20} color={catInfo.color} />
        </View>
        <Text style={styles.summaryLabel}>{catInfo.title}</Text>
        <Text style={[styles.summaryValue, isDark && styles.textWhite]}>
          {item.value_1}
          {item.category === 'blood_pressure' ? `/${item.value_2}` : ''}
          <Text style={styles.summaryUnit}> {item.unit}</Text>
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHistoryItem = ({ item, index }: { item: HealthEntry, index: number }) => {
    const catInfo = CATEGORIES.find(c => c.id === item.category);
    return (
      <Animated.View 
        entering={FadeInDown.delay(index * 50)}
        layout={Layout.springify()}
        style={[styles.historyCard, isDark && styles.cardDark]}
      >
        <View style={styles.historyLeft}>
          <View style={[styles.historyIcon, { backgroundColor: catInfo?.color + '10' }]}>
            <MaterialCommunityIcons name={catInfo?.icon as any} size={24} color={catInfo?.color} />
          </View>
          <View>
            <Text style={[styles.historyCat, isDark && styles.textWhite]}>{catInfo?.title}</Text>
            <Text style={styles.historyDate}>
              {new Date(item.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>
        <View style={styles.historyRight}>
          <Text style={[styles.historyValue, isDark && styles.textWhite]}>
            {item.value_1}{item.category === 'blood_pressure' ? `/${item.value_2}` : ''}
            <Text style={styles.historyUnit}> {item.unit}</Text>
          </Text>
          <View style={[styles.dot, { backgroundColor: getStatusColor(item.status) }]} />
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#121212' : '#f8fdfc' }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <LinearGradient colors={['#004d40', '#00796b', '#1abc9c']} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitleBox}>
            <Text style={styles.headerTitle}>Health Tracker</Text>
            <Text style={styles.headerStatus}>Pantau Kondisi Vital Anda</Text>
          </View>
          <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addBtnHeader}>
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.summaryScroll}
        >
          {summary.length > 0 ? summary.map(renderSummaryCard) : (
            <View style={styles.emptySummary}>
              <Text style={styles.emptySummaryText}>Belum ada data kesehatan.</Text>
            </View>
          )}
        </ScrollView>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#37474f' }]}>Riwayat Terakhir</Text>
          <TouchableOpacity onPress={onRefresh}>
            <Ionicons name="refresh" size={20} color="#00796b" />
          </TouchableOpacity>
        </View>

        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#00796b" style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={history}
            renderItem={renderHistoryItem}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00796b" />}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="heart-pulse" size={80} color="#eee" />
                <Text style={styles.emptyText}>Mulai catat kondisi kesehatan Anda hari ini!</Text>
              </View>
            }
          />
        )}
      </View>

      <CustomAlert 
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert({ ...alert, visible: false })}
      />

      {/* MODAL TAMBAH DATA */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeInUp} style={[styles.modalContent, isDark && styles.modalContentDark]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDark && styles.textWhite]}>Input Data Baru</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={isDark ? '#fff' : '#333'} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Pilih Kategori</Text>
              <View style={styles.catGrid}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity 
                    key={cat.id} 
                    style={[
                      styles.catBtn, 
                      selectedCat.id === cat.id && { borderColor: cat.color, backgroundColor: cat.color + '10' }
                    ]}
                    onPress={() => setSelectedCat(cat)}
                  >
                    <MaterialCommunityIcons 
                      name={cat.icon as any} 
                      size={20} 
                      color={selectedCat.id === cat.id ? cat.color : '#999'} 
                    />
                    <Text style={[styles.catBtnText, selectedCat.id === cat.id && { color: cat.color }]}>
                      {cat.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.inputRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>
                    {selectedCat.id === 'blood_pressure' ? 'Sistolik' : 'Nilai'} ({selectedCat.unit})
                  </Text>
                  <TextInput 
                    style={[styles.input, isDark && styles.inputDark]}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#999"
                    value={val1}
                    onChangeText={setVal1}
                  />
                </View>
                {selectedCat.id === 'blood_pressure' && (
                  <View style={{ flex: 1, marginLeft: 15 }}>
                    <Text style={styles.inputLabel}>Diastolik (mmHg)</Text>
                    <TextInput 
                      style={[styles.input, isDark && styles.inputDark]}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#999"
                      value={val2}
                      onChangeText={setVal2}
                    />
                  </View>
                )}
              </View>

              <Text style={styles.inputLabel}>Catatan (Opsional)</Text>
              <TextInput 
                style={[styles.input, styles.textArea, isDark && styles.inputDark]}
                multiline
                numberOfLines={3}
                placeholder="Misal: Setelah lari pagi, atau sebelum makan..."
                placeholderTextColor="#999"
                value={note}
                onChangeText={setNote}
              />

              <TouchableOpacity 
                style={[styles.saveBtn, { backgroundColor: selectedCat.color }]} 
                onPress={handleSave}
                disabled={submitting}
              >
                {submitting ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.saveBtnText}>Simpan Data</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleBox: { marginLeft: 15, flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  headerStatus: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  addBtnHeader: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryScroll: { paddingLeft: 20, paddingRight: 10 },
  summaryCard: {
    backgroundColor: '#fff',
    width: 140,
    padding: 15,
    borderRadius: 20,
    marginRight: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  cardDark: { backgroundColor: '#1e1e1e' },
  catIconCircle: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  summaryLabel: { fontSize: 10, color: '#90a4ae', fontWeight: 'bold', textTransform: 'uppercase' },
  summaryValue: { fontSize: 18, fontWeight: '900', color: '#37474f', marginVertical: 4 },
  summaryUnit: { fontSize: 10, fontWeight: '600', color: '#90a4ae' },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 5 },
  statusText: { fontSize: 8, fontWeight: 'bold' },
  emptySummary: { width: width - 40, height: 80, justifyContent: 'center', alignItems: 'center' },
  emptySummaryText: { color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' },
  content: { flex: 1, padding: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold' },
  listContainer: { paddingBottom: 20 },
  historyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 18,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  historyLeft: { flexDirection: 'row', alignItems: 'center' },
  historyIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  historyCat: { fontSize: 14, fontWeight: 'bold', color: '#37474f' },
  historyDate: { fontSize: 10, color: '#90a4ae', marginTop: 2 },
  historyRight: { flexDirection: 'row', alignItems: 'center' },
  historyValue: { fontSize: 15, fontWeight: 'bold', color: '#37474f', marginRight: 10 },
  historyUnit: { fontSize: 10, color: '#90a4ae' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  emptyState: { alignItems: 'center', marginTop: 80, opacity: 0.5 },
  emptyText: { textAlign: 'center', color: '#90a4ae', marginTop: 15, paddingHorizontal: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '90%' },
  modalContentDark: { backgroundColor: '#1e1e1e' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  inputLabel: { fontSize: 12, fontWeight: 'bold', color: '#90a4ae', marginBottom: 8, marginTop: 15 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#eee' 
  },
  catBtnText: { fontSize: 12, fontWeight: 'bold', color: '#999', marginLeft: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  input: { 
    backgroundColor: '#f5f8f8', 
    borderRadius: 12, 
    padding: 12, 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#37474f',
    borderWidth: 1,
    borderColor: '#e0f2f1'
  },
  inputDark: { backgroundColor: '#2c2c2c', borderColor: '#444', color: '#fff' },
  textArea: { height: 80, textAlignVertical: 'top' },
  saveBtn: { 
    marginTop: 30, 
    height: 55, 
    borderRadius: 15, 
    justifyContent: 'center', 
    alignItems: 'center', 
    flexDirection: 'row',
    elevation: 4,
    shadowOpacity: 0.3,
    shadowRadius: 5,
    marginBottom: 20
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  textWhite: { color: '#fff' }
});
