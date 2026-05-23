import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator, 
  RefreshControl, 
  Dimensions, 
  View as RNView, 
  StatusBar, 
  Platform, 
  Modal, 
  ScrollView,
  TextInput,
  Alert
} from 'react-native';
import { Text, View } from '@/components/Themed';
import { useRouter, Stack } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import * as Notifications from 'expo-notifications';
import api from '../services/api';
import CustomAlert from '@/components/CustomAlert';

const { width } = Dimensions.get('window');

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface Reminder {
  id: number;
  medicine_name: string;
  dosage: string;
  times: string[];
  is_active: number;
  no_rawat?: string;
  start_date: string;
}

interface BulkReminder {
  medicine_name: string;
  dosage: string;
  times: string[];
  selected: boolean;
  no_rawat: string;
}

export default function MedicineReminderScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'jadwal' | 'resep'>('jadwal');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [resepList, setResepList] = useState<any[]>([]);
  const [noRkmMedis, setNoRkmMedis] = useState('');

  // Modal & Form State
  const [modalVisible, setModalVisible] = useState(false);
  const [bulkModalVisible, setBulkModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    id: null as number | null,
    medicine_name: '',
    dosage: '',
    times: ['08:00'],
    no_rawat: ''
  });
  const [bulkReminders, setBulkReminders] = useState<BulkReminder[]>([]);

  // Alert State
  const [alert, setAlert] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info' | 'warning',
    showConfirm: false,
    onConfirm: undefined as (() => void) | undefined
  });

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', showConfirm = false, onConfirm?: () => void) => {
    setAlert({ visible: true, title, message, type, showConfirm, onConfirm });
  };

  const fetchUserData = async () => {
    const userData = await SecureStore.getItemAsync('userData');
    if (userData) {
      const user = JSON.parse(userData);
      setNoRkmMedis(user.no_rkm_medis);
      return user.no_rkm_medis;
    }
    return null;
  };

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const rm = await fetchUserData();
      
      // Fetch Reminders
      const resReminders = await api.get('/get_reminders.php');
      if (resReminders.data.status === 'success') {
        setReminders(resReminders.data.data);
        // Sinkronkan alarm lokal secara otomatis dengan data DB ter-update
        await syncAllLocalNotifications(resReminders.data.data);
      }

      // Fetch Resep History
      if (rm) {
        const resResep = await api.get(`/get_resep_history.php?no_rkm_medis=${rm}`);
        if (resResep.data.status === 'success') {
          setResepList(resResep.data.data);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    requestNotificationPermissions();
  }, []);

  const parseAturanPakai = (aturan: string) => {
    if (!aturan) return ['08:00'];
    const cleaned = aturan.toLowerCase().replace(/\s/g, '');
    if (cleaned.includes('3x1')) return ['07:00', '13:00', '19:00'];
    if (cleaned.includes('2x1')) return ['07:00', '19:00'];
    if (cleaned.includes('1x1')) return ['07:00'];
    if (cleaned.includes('4x1')) return ['06:00', '12:00', '18:00', '00:00'];
    return ['08:00'];
  };

  const requestNotificationPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Izin Notifikasi', 'Harap aktifkan izin notifikasi agar pengingat obat dapat berfungsi.', 'warning');
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('medicine-reminders', {
        name: 'Pengingat Obat',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
  };

  const syncAllLocalNotifications = async (activeReminders: Reminder[]) => {
    try {
      // 1. Bersihkan semua alarm lama agar tidak menumpuk/menjadi yatim (orphan)
      await Notifications.cancelAllScheduledNotificationsAsync();
      
      // 2. Jadwalkan ulang hanya untuk pengingat yang aktif
      for (const reminder of activeReminders) {
        if (Number(reminder.is_active) !== 1) continue;
        
        for (const time of reminder.times) {
          if (!time || !time.includes(':')) continue;
          const [hour, minute] = time.split(':').map(Number);
          
          if (isNaN(hour) || isNaN(minute)) {
            console.warn(`Format waktu tidak valid: ${time}`);
            continue;
          }
          
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "Waktunya Minum Obat! 💊",
              body: `Jangan lupa minum ${reminder.medicine_name} (${reminder.dosage})`,
              data: { reminderId: reminder.id },
              sound: true,
              android: {
                channelId: 'medicine-reminders',
              },
            },
            trigger: {
              hour: hour,
              minute: minute,
              repeats: true,
            },
          });
        }
      }
      console.log("Semua alarm obat berhasil disinkronkan!");
    } catch (e) {
      console.error("Gagal sinkronisasi notifikasi obat:", e);
    }
  };

  const handleSave = async () => {
    if (!formData.medicine_name || formData.times.length === 0) {
      showAlert('Input Tidak Valid', 'Nama obat dan minimal satu waktu minum harus diisi.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/save_reminder.php', formData);
      if (res.data.status === 'success') {
        setModalVisible(false);
        await fetchData(false);
        showAlert('Berhasil', 'Pengingat obat telah disimpan dan dijadwalkan.', 'success');
      }
    } catch (e) {
      showAlert('Error', 'Gagal menyimpan data.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: number) => {
    showAlert(
      'Hapus Pengingat',
      'Apakah Anda yakin ingin menghapus pengingat ini?',
      'warning',
      true,
      async () => {
        try {
          await api.post('/delete_reminder.php', { id });
          fetchData(false);
          // Wait a bit for the modal to close before showing the next alert
          setTimeout(() => {
            showAlert('Terhapus', 'Pengingat telah dihapus.', 'success');
          }, 500);
        } catch (e) {
          showAlert('Error', 'Gagal menghapus data.', 'error');
        }
      }
    );
  };

  const handlePickFromResep = async (resep: any) => {
    setLoading(true);
    try {
      const res = await api.get(`/get_resep_detail.php?no_rawat=${resep.no_rawat}&tgl_perawatan=${resep.tgl_perawatan}&jam=${resep.jam}`);
      if (res.data.status === 'success') {
        const details = res.data.details || [];
        const racikans = res.data.racikans || [];
        
        const combined: BulkReminder[] = [];
        
        details.forEach((d: any) => {
          combined.push({
            medicine_name: d.nama_obat,
            dosage: d.aturan_pakai,
            times: parseAturanPakai(d.aturan_pakai),
            selected: true,
            no_rawat: resep.no_rawat
          });
        });
        
        racikans.forEach((r: any) => {
          combined.push({
            medicine_name: r.nama_racik,
            dosage: r.aturan_pakai,
            times: parseAturanPakai(r.aturan_pakai),
            selected: true,
            no_rawat: resep.no_rawat
          });
        });
        
        if (combined.length > 0) {
          setBulkReminders(combined);
          setBulkModalVisible(true);
        } else {
          showAlert('Info', 'Tidak ada rincian obat dalam resep ini.', 'info');
        }
      }
    } catch (e) {
      showAlert('Error', 'Gagal memuat rincian resep.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSave = async () => {
    const selectedReminders = bulkReminders.filter(r => r.selected);
    if (selectedReminders.length === 0) {
      showAlert('Peringatan', 'Pilih minimal satu obat untuk ditambahkan.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/save_reminder.php', selectedReminders);
      if (res.data.status === 'success') {
        setBulkModalVisible(false);
        await fetchData(false);
        showAlert('Berhasil', `${selectedReminders.length} pengingat obat telah ditambahkan.`, 'success');
      }
    } catch (e: any) {
      const errorMsg = e.response?.data?.message || 'Gagal menyimpan pengingat massal.';
      showAlert('Error', errorMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const renderReminderItem = ({ item, index }: { item: Reminder; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 100)} layout={Layout.springify()}>
      <RNView style={styles.reminderCard}>
        <RNView style={styles.cardInfo}>
          <RNView style={[styles.iconBox, { backgroundColor: '#e8eaf6' }]}>
            <MaterialCommunityIcons name="pill" size={24} color="#3f51b5" />
          </RNView>
          <RNView style={{ flex: 1 }}>
            <Text style={styles.medName}>{item.medicine_name}</Text>
            <Text style={styles.medDosage}>{item.dosage}</Text>
            <RNView style={styles.timeRow}>
              {item.times.map((t, idx) => (
                <RNView key={idx} style={styles.timeBadge}>
                  <Ionicons name="time-outline" size={10} color="#3f51b5" />
                  <Text style={styles.timeText}>{t}</Text>
                </RNView>
              ))}
            </RNView>
          </RNView>
          <TouchableOpacity onPress={() => handleDelete(item.id)}>
            <Ionicons name="trash-outline" size={20} color="#e57373" />
          </TouchableOpacity>
        </RNView>
      </RNView>
    </Animated.View>
  );

  const renderResepItem = ({ item, index }: { item: any; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 100)}>
      <TouchableOpacity style={styles.resepCard} onPress={() => handlePickFromResep(item)}>
        <RNView style={styles.resepHeader}>
          <RNView style={styles.dateLabel}>
            <Text style={styles.dateLabelText}>{new Date(item.tgl_perawatan).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
          </RNView>
          <Text style={styles.resepNo}>{item.no_rawat}</Text>
        </RNView>
        <Text style={styles.resepDoc}>Dokter: {item.nm_dokter}</Text>
        <RNView style={styles.resepFooter}>
          <Text style={styles.resepAction}>Klik untuk gunakan sebagai pengingat</Text>
          <Ionicons name="chevron-forward" size={14} color="#00796b" />
        </RNView>
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
            <Text style={styles.headerTitle}>Pengingat Obat</Text>
            <Text style={styles.headerStatus}>Disiplin Minum Obat, Cepat Sembuh</Text>
          </RNView>
          <TouchableOpacity onPress={() => {
            setFormData({ id: null, medicine_name: '', dosage: '', times: ['08:00'], no_rawat: '' });
            setModalVisible(true);
          }} style={styles.addBtn}>
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        </RNView>

        <RNView style={styles.tabBar}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'jadwal' && styles.activeTab]}
            onPress={() => setActiveTab('jadwal')}
          >
            <Text style={[styles.tabText, activeTab === 'jadwal' && styles.activeTabText]}>ALARM AKTIF</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'resep' && styles.activeTab]}
            onPress={() => setActiveTab('resep')}
          >
            <Text style={[styles.tabText, activeTab === 'resep' && styles.activeTabText]}>RIWAYAT RESEP</Text>
          </TouchableOpacity>
        </RNView>
      </LinearGradient>

      {loading && !refreshing ? (
        <RNView style={styles.center}>
          <ActivityIndicator size="large" color="#00796b" />
        </RNView>
      ) : (
        <FlatList
          data={activeTab === 'jadwal' ? reminders : resepList}
          keyExtractor={(item, idx) => (item.id || item.no_rawat + idx).toString()}
          renderItem={activeTab === 'jadwal' ? renderReminderItem : renderResepItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(false)} tintColor="#00796b" />}
          ListEmptyComponent={
            <RNView style={styles.emptyBox}>
              <MaterialCommunityIcons name={activeTab === 'jadwal' ? "alarm-off" : "pill-off"} size={80} color="#eee" />
              <Text style={styles.emptyText}>
                {activeTab === 'jadwal' ? "Belum ada jadwal minum obat." : "Belum ada riwayat resep."}
              </Text>
            </RNView>
          }
        />
      )}

      <CustomAlert 
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        showConfirm={alert.showConfirm}
        onConfirm={alert.onConfirm}
        onClose={() => setAlert({ ...alert, visible: false })}
      />

      {/* Bulk Add Modal */}
      <Modal visible={bulkModalVisible} animationType="slide" transparent>
        <RNView style={styles.modalOverlay}>
          <RNView style={[styles.modalContent, { maxHeight: '90%' }]}>
            <RNView style={styles.modalHeader}>
              <RNView>
                <Text style={styles.modalTitle}>Tambah Banyak Pengingat</Text>
                <Text style={styles.modalSub}>Pilih obat yang ingin diaktifkan alarmnya</Text>
              </RNView>
              <TouchableOpacity onPress={() => setBulkModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </RNView>

            <FlatList
              data={bulkReminders}
              keyExtractor={(_, idx) => idx.toString()}
              renderItem={({ item, index }) => (
                <TouchableOpacity 
                  style={[styles.bulkItem, !item.selected && styles.bulkItemInactive]}
                  onPress={() => {
                    const newReminders = [...bulkReminders];
                    newReminders[index].selected = !newReminders[index].selected;
                    setBulkReminders(newReminders);
                  }}
                >
                  <RNView style={styles.bulkCheck}>
                    <Ionicons 
                      name={item.selected ? "checkbox" : "square-outline"} 
                      size={24} 
                      color={item.selected ? "#00796b" : "#ccc"} 
                    />
                  </RNView>
                  <RNView style={{ flex: 1 }}>
                    <Text style={[styles.bulkName, !item.selected && styles.textMuted]}>{item.medicine_name}</Text>
                    <Text style={styles.bulkDosage}>{item.dosage}</Text>
                    <RNView style={styles.bulkTimeRow}>
                      {item.times.map((t, tidx) => (
                        <RNView key={tidx} style={styles.bulkTimeBadge}>
                          <Text style={styles.bulkTimeText}>{t}</Text>
                        </RNView>
                      ))}
                      <Text style={styles.suggestLabel}>(Saran otomatis)</Text>
                    </RNView>
                  </RNView>
                </TouchableOpacity>
              )}
              ListFooterComponent={
                <TouchableOpacity style={styles.saveBtn} onPress={handleBulkSave} disabled={submitting}>
                  {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Aktifkan {bulkReminders.filter(r => r.selected).length} Pengingat</Text>}
                </TouchableOpacity>
              }
              showsVerticalScrollIndicator={false}
            />
          </RNView>
        </RNView>
      </Modal>

      {/* Modal Form */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <RNView style={styles.modalOverlay}>
          <RNView style={styles.modalContent}>
            <RNView style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tambah Pengingat</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </RNView>

            <ScrollView>
              <Text style={styles.label}>Nama Obat</Text>
              <TextInput 
                style={styles.input}
                placeholder="Contoh: Paracetamol"
                value={formData.medicine_name}
                onChangeText={(t) => setFormData({...formData, medicine_name: t})}
              />

              <Text style={styles.label}>Dosis / Aturan Pakai</Text>
              <TextInput 
                style={styles.input}
                placeholder="Contoh: 1 Tablet (Sesudah Makan)"
                value={formData.dosage}
                onChangeText={(t) => setFormData({...formData, dosage: t})}
              />

              <Text style={styles.label}>Waktu Minum (Jam:Menit)</Text>
              {formData.times.map((time, idx) => (
                <RNView key={idx} style={styles.timeInputRow}>
                  <TextInput 
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    placeholder="08:00"
                    value={time}
                    onChangeText={(t) => {
                      const newTimes = [...formData.times];
                      newTimes[idx] = t;
                      setFormData({...formData, times: newTimes});
                    }}
                  />
                  {formData.times.length > 1 && (
                    <TouchableOpacity onPress={() => {
                      const newTimes = formData.times.filter((_, i) => i !== idx);
                      setFormData({...formData, times: newTimes});
                    }} style={styles.removeTimeBtn}>
                      <Ionicons name="remove-circle" size={24} color="#e57373" />
                    </TouchableOpacity>
                  )}
                </RNView>
              ))}
              
              <TouchableOpacity style={styles.addTimeBtn} onPress={() => setFormData({...formData, times: [...formData.times, '']})}>
                <Ionicons name="add-circle-outline" size={20} color="#00796b" />
                <Text style={styles.addTimeText}>Tambah Waktu</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Simpan Pengingat</Text>}
              </TouchableOpacity>
            </ScrollView>
          </RNView>
        </RNView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fdfc' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 0,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20, backgroundColor: 'transparent' },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitleBox: { marginLeft: 15, backgroundColor: 'transparent', flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  headerStatus: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  addBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  tabBar: { flexDirection: 'row', paddingHorizontal: 20, backgroundColor: 'transparent' },
  tab: { flex: 1, paddingVertical: 15, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#fff' },
  tabText: { color: 'rgba(255,255,255,0.6)', fontWeight: 'bold', fontSize: 12 },
  activeTabText: { color: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 20 },
  reminderCard: { backgroundColor: '#fff', borderRadius: 20, padding: 15, marginBottom: 15, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  cardInfo: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'transparent' },
  iconBox: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  medName: { fontSize: 16, fontWeight: 'bold', color: '#37474f' },
  medDosage: { fontSize: 12, color: '#78909c', marginTop: 2 },
  timeRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, backgroundColor: 'transparent' },
  timeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f4ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginRight: 8, marginBottom: 5 },
  timeText: { fontSize: 10, color: '#3f51b5', fontWeight: 'bold', marginLeft: 4 },
  resepCard: { backgroundColor: '#fff', borderRadius: 18, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#e0f2f1' },
  resepHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, backgroundColor: 'transparent' },
  dateLabel: { backgroundColor: '#e0f2f1', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  dateLabelText: { fontSize: 10, color: '#00796b', fontWeight: 'bold' },
  resepNo: { fontSize: 12, color: '#90a4ae', fontWeight: '600' },
  resepDoc: { fontSize: 13, color: '#37474f', fontWeight: '600' },
  resepFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f5f5f5', backgroundColor: 'transparent' },
  resepAction: { fontSize: 11, color: '#00796b', fontWeight: 'bold' },
  emptyBox: { alignItems: 'center', marginTop: 100, opacity: 0.5 },
  emptyText: { color: '#90a4ae', marginTop: 15, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  label: { fontSize: 12, fontWeight: 'bold', color: '#90a4ae', marginBottom: 8, marginTop: 15 },
  input: { backgroundColor: '#f5f8f8', borderRadius: 12, padding: 15, fontSize: 14, color: '#37474f', marginBottom: 10 },
  timeInputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  removeTimeBtn: { marginLeft: 10 },
  addTimeBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  addTimeText: { fontSize: 13, color: '#00796b', fontWeight: 'bold', marginLeft: 5 },
  saveBtn: { backgroundColor: '#00796b', height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 30, marginBottom: 20 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  modalSub: { fontSize: 12, color: '#78909c', marginTop: 4 },
  bulkItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 15, 
    backgroundColor: '#f5f8f8', 
    borderRadius: 15, 
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0f2f1'
  },
  bulkItemInactive: { opacity: 0.6, borderColor: 'transparent' },
  bulkCheck: { marginRight: 15 },
  bulkName: { fontSize: 15, fontWeight: 'bold', color: '#37474f' },
  bulkDosage: { fontSize: 12, color: '#00796b', marginTop: 2, fontWeight: '600' },
  bulkTimeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, flexWrap: 'wrap' },
  bulkTimeBadge: { backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginRight: 5, marginBottom: 4, borderWidth: 1, borderColor: '#e0f2f1' },
  bulkTimeText: { fontSize: 10, fontWeight: 'bold', color: '#37474f' },
  suggestLabel: { fontSize: 9, color: '#90a4ae', fontStyle: 'italic', marginLeft: 5 },
  textMuted: { color: '#90a4ae' },
});
