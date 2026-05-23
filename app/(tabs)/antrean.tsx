import React, { useState, useCallback } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions, Platform, StatusBar, ActivityIndicator, RefreshControl, Modal, TextInput } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as SecureStore from 'expo-secure-store';
import api from '../../services/api';
import CustomAlert from '../../components/CustomAlert';

const { width, height } = Dimensions.get('window');

export default function AntreanScreen() {
  const router = useRouter();
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<any>({
    type: 'warning',
    title: '',
    message: '',
    showCancel: false,
    onConfirm: () => {},
  });
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [reasonModalVisible, setReasonModalVisible] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookings = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const res = await api.get('/get_my_bookings.php');
      if (res.data.status === 'success') {
        setBookings(res.data.data);
      }
    } catch (e) {
      console.error('Gagal mengambil data booking:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleCancelPress = (item: any) => {
    // Cek H-1 (Hanya bisa batal jika tgl_periksa > hari ini)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const visitDate = new Date(item.tgl_periksa);
    visitDate.setHours(0, 0, 0, 0);
    
    const diffTime = visitDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 1) {
      setAlertConfig({
        type: 'error',
        title: 'Batal Gagal',
        message: 'Pembatalan hanya dapat dilakukan maksimal H-1. Untuk pembatalan hari ini, silakan hubungi CS Rumah Sakit.',
        showCancel: false,
        onConfirm: () => setAlertVisible(false)
      });
      setAlertVisible(true);
      return;
    }

    setSelectedBooking(item);
    setAlertConfig({
      type: 'warning',
      title: 'Batalkan Antrean?',
      message: 'Apakah Anda yakin ingin membatalkan pendaftaran ini?\n\nPembatalan yang terlalu sering dapat menyebabkan akun Anda ditangguhkan otomatis oleh sistem.',
      showCancel: true,
      confirmText: 'YA, BATALKAN',
      cancelText: 'TIDAK',
      onConfirm: () => {
        setAlertVisible(false);
        setTimeout(() => setReasonModalVisible(true), 500);
      }
    });
    setAlertVisible(true);
  };

  const confirmCancellation = async () => {
    if (!cancelReason.trim()) return;
    
    try {
      setReasonModalVisible(false);
      setLoading(true);
      const res = await api.post('/cancel_booking.php', {
        no_booking: selectedBooking.no_booking,
        alasan: cancelReason
      });

      if (res.data.status === 'success') {
        setCancelReason('');
        
        setAlertConfig({
          type: res.data.is_blacklisted ? 'error' : (res.data.warning ? 'warning' : 'success'),
          title: res.data.is_blacklisted ? 'Akun Ditangguhkan' : 'Berhasil Batal',
          message: res.data.message + (res.data.warning ? "\n\n" + res.data.warning : ""),
          showCancel: false,
          onConfirm: () => {
            setAlertVisible(false);
            fetchBookings();
          }
        });
        setTimeout(() => setAlertVisible(true), 500);
      } else {
        throw new Error(res.data.message);
      }
    } catch (e: any) {
      setAlertConfig({
        type: 'error',
        title: 'Gagal',
        message: e.message || 'Terjadi kesalahan sistem.',
        showCancel: false,
        onConfirm: () => setAlertVisible(false)
      });
      setAlertVisible(true);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      // 1. Ambil data saat pertama kali fokus
      fetchBookings();

      // 2. Set interval Auto-Refresh setiap 30 detik
      const interval = setInterval(() => {
        fetchBookings(true); // Jalankan secara senyap
      }, 30000);

      // 3. Bersihkan interval saat pindah halaman/unfocus
      return () => clearInterval(interval);
    }, [fetchBookings])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const renderStatusBadge = (status: string) => {
    let bgColor = '#eceff1';
    let textColor = '#90a4ae';
    
    if (status === 'Terkonfirmasi') {
      bgColor = '#e8f5e9';
      textColor = '#2e7d32';
    } else if (status === 'Batal') {
      bgColor = '#ffebee';
      textColor = '#c62828';
    } else if (status === 'Menunggu') {
      bgColor = '#fff3e0';
      textColor = '#e65100';
    }

    return (
      <View style={[styles.statusBadge, { backgroundColor: bgColor }]}>
        <Text style={[styles.statusText, { color: textColor }]}>{status.toUpperCase()}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* 1. VIBRANT HEADER */}
      <View style={styles.headerBackground}>
        <LinearGradient colors={['#004d40', '#00796b', '#1abc9c']} style={StyleSheet.absoluteFill} />
        <View style={[styles.blob, { top: -40, right: -40, backgroundColor: '#1abc9c' }]} />
      </View>

      <View style={styles.headerTitleContainer}>
        <Text style={styles.headerTitle}>Antrean Saya</Text>
        <Text style={styles.headerSubtitle}>Pantau status pendaftaran Anda</Text>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00796b']} />}
      >
        
        {loading ? (
          <ActivityIndicator size="large" color="#fff" style={{ marginTop: 50 }} />
        ) : bookings.length === 0 ? (
          <Animated.View entering={FadeInDown.duration(800)} style={styles.ticketCard}>
            <LinearGradient colors={['#ffffff', '#f1f8f7']} style={styles.ticketInner}>
              <View style={styles.emptyContent}>
                <MaterialCommunityIcons name="calendar-clock" size={60} color="#00796b" opacity={0.2} />
                <Text style={styles.emptyTitle}>Belum Ada Antrean</Text>
                <Text style={styles.emptyDesc}>
                  Silakan lakukan pendaftaran poliklinik melalui menu "Booking Antrian" di beranda.
                </Text>
              </View>
              <TouchableOpacity style={styles.bookBtn} onPress={() => router.push('/booking_antrian' as any)}>
                <LinearGradient colors={['#1abc9c', '#00796b']} style={styles.btnGradient}>
                  <Text style={styles.btnText}>BOOKING SEKARANG</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        ) : (
          bookings.map((item, index) => (
            <Animated.View key={item.no_booking} entering={FadeInDown.delay(index * 200)} style={styles.ticketCard}>
              <LinearGradient colors={['#ffffff', '#f1f8f7']} style={styles.ticketInner}>
                <View style={styles.ticketTop}>
                  <View style={styles.ticketLogo}>
                    <Image source={require('../../assets/images/logors.png')} style={styles.miniLogo} />
                    <Text style={styles.rsName}>RUMAH SAKIT STANDARD</Text>
                  </View>
                  {renderStatusBadge(item.status)}
                </View>

                <View style={styles.ticketDivider}>
                  <View style={styles.circleCutLeft} />
                  <View style={styles.dashLine} />
                  <View style={styles.circleCutRight} />
                </View>

                <View style={styles.ticketBody}>
                  <View style={styles.queueInfo}>
                    <Text style={styles.queueLabel}>PASIEN: {item.nm_pasien}</Text>
                    <Text style={styles.queueNumber}>{item.no_reg_rs || '---'}</Text>
                    <Text style={styles.bookingId}>ID: {item.no_booking} • RM: {item.no_rkm_medis}</Text>
                  </View>

                  <View style={styles.detailGrid}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Tanggal Periksa</Text>
                      <Text style={styles.detailValue}>
                        {new Date(item.tgl_periksa).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Cara Bayar</Text>
                      <Text style={styles.detailValue}>{item.png_jawab}</Text>
                    </View>
                  </View>

                  <View style={styles.doctorInfo}>
                    <View style={styles.doctorIconBox}>
                      <MaterialCommunityIcons name="doctor" size={24} color="#00796b" />
                    </View>
                    <View style={styles.doctorText}>
                      <Text style={styles.doctorName}>{item.nm_dokter}</Text>
                      <Text style={styles.poliName}>{item.nm_poli}</Text>
                    </View>
                  </View>
                </View>

                {item.status !== 'Batal' && (
                  <View style={styles.ticketActions}>
                    <TouchableOpacity 
                      style={styles.cancelBtn} 
                      onPress={() => handleCancelPress(item)}
                    >
                      <Ionicons name="close-circle-outline" size={16} color="#c62828" />
                      <Text style={styles.cancelBtnText}>BATALKAN KUNJUNGAN</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {item.status === 'Menunggu' && (
                  <View style={styles.footerNote}>
                    <Ionicons name="time-outline" size={14} color="#e65100" />
                    <Text style={styles.noteText}>Pendaftaran sedang diverifikasi oleh sistem RS</Text>
                  </View>
                )}
              </LinearGradient>
            </Animated.View>
          ))
        )}

        {/* INFO SECTION */}
        <Animated.View entering={FadeInDown.delay(500)} style={styles.infoSection}>
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={24} color="#00796b" />
            <Text style={styles.infoText}>
              Nomor antrean resmi akan muncul otomatis setelah data Anda berhasil masuk ke sistem rumah sakit.
            </Text>
          </View>
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* MODAL ALASAN PEMBATALAN */}
      <Modal
        visible={reasonModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReasonModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeInDown} style={styles.modalContent}>
            <Text style={styles.modalTitle}>Alasan Pembatalan</Text>
            <Text style={styles.modalSubtitle}>Harap berikan alasan singkat mengapa Anda membatalkan kunjungan ini.</Text>
            
            <TextInput
              style={styles.reasonInput}
              placeholder="Contoh: Ada keperluan mendadak..."
              placeholderTextColor="#90a4ae"
              multiline
              numberOfLines={4}
              value={cancelReason}
              onChangeText={setCancelReason}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelModalBtn} 
                onPress={() => {
                  setReasonModalVisible(false);
                  setCancelReason('');
                }}
              >
                <Text style={styles.cancelModalBtnText}>KEMBALI</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.confirmBtn, !cancelReason.trim() && { opacity: 0.5 }]} 
                onPress={confirmCancellation}
                disabled={!cancelReason.trim()}
              >
                <LinearGradient colors={['#c62828', '#b71c1c']} style={styles.btnGradientSmall}>
                  <Text style={styles.confirmBtnText}>PROSES BATAL</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      <CustomAlert 
        visible={alertVisible}
        {...alertConfig}
        onClose={() => setAlertVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fdfc',
  },
  // ... (keep other styles)
  ticketActions: {
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 10,
    backgroundColor: '#fff5f5',
  },
  cancelBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#c62828',
    marginLeft: 6,
  },
  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 25,
    elevation: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#263238',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#78909c',
    marginBottom: 20,
    lineHeight: 18,
  },
  reasonInput: {
    backgroundColor: '#f5f8f9',
    borderRadius: 15,
    padding: 15,
    height: 100,
    textAlignVertical: 'top',
    color: '#37474f',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#e0e6e8',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  cancelModalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  cancelModalBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#90a4ae',
  },
  confirmBtn: {
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 3,
  },
  btnGradientSmall: {
    paddingVertical: 12,
    paddingHorizontal: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 250,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.3,
    backgroundColor: 'transparent',
  },
  headerTitleContainer: {
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
    paddingHorizontal: 30,
    backgroundColor: 'transparent',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 5,
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 50,
  },
  // TICKET CARD
  ticketCard: {
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    backgroundColor: '#fff',
    overflow: 'hidden',
    marginBottom: 20,
  },
  ticketInner: {
    padding: 20,
  },
  ticketTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: 'transparent',
  },
  ticketLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  miniLogo: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  rsName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#004d40',
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  ticketDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: -20,
    backgroundColor: 'transparent',
  },
  circleCutLeft: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f8fdfc',
    marginLeft: -10,
  },
  circleCutRight: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f8fdfc',
    marginRight: -10,
  },
  dashLine: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderColor: '#eee',
    borderStyle: 'dashed',
    marginHorizontal: 10,
  },
  ticketBody: {
    paddingVertical: 20,
    backgroundColor: 'transparent',
  },
  queueInfo: {
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  queueLabel: {
    fontSize: 11,
    color: '#00796b',
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  queueNumber: {
    fontSize: 42,
    fontWeight: '900',
    color: '#00796b',
  },
  bookingId: {
    fontSize: 10,
    color: '#b0bec5',
    marginTop: -5,
  },
  detailGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8fbfc',
    padding: 12,
    borderRadius: 15,
    marginBottom: 15,
  },
  detailItem: {
    backgroundColor: 'transparent',
  },
  detailLabel: {
    fontSize: 10,
    color: '#78909c',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#37474f',
  },
  doctorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  doctorIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#e0f2f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  doctorText: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  doctorName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#263238',
  },
  poliName: {
    fontSize: 11,
    color: '#78909c',
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    backgroundColor: 'transparent',
  },
  noteText: {
    fontSize: 10,
    color: '#e65100',
    marginLeft: 5,
    fontStyle: 'italic',
  },
  emptyContent: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#263238',
    marginTop: 15,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#90a4ae',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  bookBtn: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 20,
  },
  btnGradient: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  infoSection: {
    marginTop: 10,
    backgroundColor: 'transparent',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#f1f1f1',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#546e7a',
    marginLeft: 15,
    lineHeight: 18,
  }
});

