import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, Dimensions, View as RNView, StatusBar, Platform, ActivityIndicator, Alert, Modal, Linking } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useRouter, Stack } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';
import CustomDatePicker from '@/components/CustomDatePicker';
import CustomAlert from '@/components/CustomAlert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function BookingAntrianScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [alert, setAlert] = useState({ 
    visible: false, 
    title: '', 
    message: '', 
    type: 'info' as 'info' | 'success' | 'error' | 'warning',
    onClose: () => {}
  });

  const showAlert = (title: string, message: string, type: 'info' | 'success' | 'error' | 'warning', onClose = () => {}) => {
    setAlert({ visible: true, title, message, type, onClose });
  };

  // Form Data
  const [patients, setPatients] = useState<any[]>([]);
  const [penjabs, setPenjabs] = useState<any[]>([]);
  const [polis, setPolis] = useState<any[]>([]);
  const [dokters, setDokters] = useState<any[]>([]);
  
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [selectedPenjab, setSelectedPenjab] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(Date.now() + 86400000)); // Besok
  const [selectedPoli, setSelectedPoli] = useState<any>(null);
  const [selectedDokter, setSelectedDokter] = useState<any>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showBPJSInfo, setShowBPJSInfo] = useState(false);
  const [isVerifyingBPJS, setIsVerifyingBPJS] = useState(false);
  const [bpjsCardNo, setBpjsCardNo] = useState('');
  const [referrals, setReferrals] = useState<any[]>([]);
  const [selectedReferral, setSelectedReferral] = useState<any>(null);
  const [bpjsStep, setBpjsStep] = useState(0); // 0: Info, 1: Check Card, 2: Select Referral
  const [showEditModal, setShowEditModal] = useState(false);
  const [tempCardNo, setTempCardNo] = useState('');
  const [participantData, setParticipantData] = useState<any>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const userDataStr = await SecureStore.getItemAsync('userData');
      const userData = userDataStr ? JSON.parse(userDataStr) : null;

      const [resFamily, resPj, resPoli] = await Promise.all([
        api.get('/get_family.php'),
        api.get('/get_penjab.php'),
        api.get('/get_poliklinik.php')
      ]);

      let patientList: any[] = [];
      if (userData) {
        const self = { ...userData, hubungan: 'Diri Sendiri' };
        patientList.push(self);
        setSelectedPatient(self);
      }
      
      if (resFamily.data.status === 'success') {
        const familyData = resFamily.data.data.filter((f: any) => 
          f.no_rkm_medis !== userData?.no_rkm_medis
        );
        patientList = [...patientList, ...familyData];
      }
      
      setPatients(patientList);
      if (resPj.data.status === 'success') setPenjabs(resPj.data.data);
      if (resPoli.data.status === 'success') setPolis(resPoli.data.data);
    } catch (e) {
      showAlert('Error', 'Gagal memuat data master.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDokter = async (kdPoli: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/get_dokter_by_poli.php?kd_poli=${kdPoli}`);
      if (res.data.status === 'success') {
        setDokters(res.data.data);
      }
    } catch (e) {
      showAlert('Error', 'Gagal memuat daftar dokter.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (!selectedPatient) throw new Error('Pasien belum dipilih');

      const payload = {
        no_rkm_medis: selectedPatient.no_rkm_medis,
        tgl_periksa: selectedDate.toISOString().split('T')[0],
        kd_poli: selectedPoli.kd_poli,
        kd_dokter: selectedDokter.kd_dokter,
        kd_pj: selectedPenjab.kd_pj,
        no_referensi: selectedReferral?.noKunjungan || selectedReferral?.noRujukan || ''
      };

      const res = await api.post('/submit_booking.php', payload);
      if (res.data.status === 'success') {
        showAlert(
          'Pendaftaran Berhasil',
          `Nomor Booking: ${res.data.no_booking}\n\nData Anda telah tersimpan. Silakan cek menu Antrian secara berkala untuk mendapatkan nomor pendaftaran resmi.`,
          'success',
          () => router.replace('/(tabs)')
        );
      } else {
        showAlert('Pendaftaran Gagal', res.data.message, 'error');
      }
    } catch (e: any) {
      showAlert('Error', e.message || 'Terjadi kesalahan sistem.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const checkBPJSReferrals = async () => {
    if (!bpjsCardNo || bpjsCardNo.length < 10) {
      return showAlert('Peringatan', 'Masukkan Nomor Kartu BPJS yang valid.', 'warning');
    }

    setIsVerifyingBPJS(true);
    const no_rm = selectedPatient?.no_rkm_medis || '';
    try {
      // 1. Cek Peserta
      const resPeserta = await api.get(`/bpjs_cek_peserta.php?nomor=${bpjsCardNo}&no_rm=${no_rm}`);
      if (resPeserta.data.status !== 'success') {
        throw new Error(resPeserta.data.message || 'Nomor Kartu tidak ditemukan atau tidak aktif.');
      }
      
      const pData = resPeserta.data.data.peserta;
      setParticipantData(pData);
      
      // Jika status tidak aktif, beri peringatan tapi biarkan tersimpan di UI
      if (pData.statusPeserta.kode !== '0') {
        return showAlert('Peserta Tidak Aktif', `Status kepesertaan Anda: ${pData.statusPeserta.keterangan}. Silakan hubungi kantor BPJS terdekat.`, 'warning');
      }

      // 2. Tarik Rujukan
      let allReferrals: any[] = [];
      
      try {
        const resFaskes1 = await api.get(`/bpjs_get_rujukan.php?nomor=${bpjsCardNo}&no_rm=${no_rm}&faskes=1`);
        if (resFaskes1.data.status === 'success' && resFaskes1.data.data) {
          const rawData = resFaskes1.data.data;
          const data1 = Array.isArray(rawData) ? rawData : [rawData];
          allReferrals = [...allReferrals, ...data1.filter(r => r).map((r: any) => ({ ...r, asal: 'Faskes I' }))];
        }
      } catch (e1: any) { console.log('Err Faskes 1:', e1.message); }

      try {
        const resRS = await api.get(`/bpjs_get_rujukan.php?nomor=${bpjsCardNo}&no_rm=${no_rm}&faskes=2`);
        if (resRS.data.status === 'success' && resRS.data.data) {
          const rawData = resRS.data.data;
          const data2 = Array.isArray(rawData) ? rawData : [rawData];
          allReferrals = [...allReferrals, ...data2.filter(r => r).map((r: any) => ({ ...r, asal: 'Faskes II (RS)' }))];
        }
      } catch (e2: any) { console.log('Err RS:', e2.message); }

      if (allReferrals.length > 0) {
        console.log('CONTOH DATA RUJUKAN 1:', JSON.stringify(allReferrals[0], null, 2));
      }

      // Filter rujukan yang masih aktif (maksimal 89 hari dari tglKunjungan)
      const today = new Date();
      const activeReferrals = allReferrals.filter(item => {
        const tglStr = item.tglKunjungan || item.tglRujukan || item.TglRujukan;
        if (!tglStr) return false;
        
        const refDate = new Date(tglStr);
        const diffTime = today.getTime() - refDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays >= 0 && diffDays <= 89;
      });

      if (activeReferrals.length === 0) {
        showAlert('Informasi Rujukan', 'Tidak ditemukan surat rujukan yang masih aktif (masa berlaku rujukan maksimal adalah 90 hari). Silakan perbarui rujukan Anda di Faskes asal.', 'info');
      } else {
        setReferrals(activeReferrals);
        setBpjsStep(2);
      }
    } catch (e: any) {
      const errorMsg = e.response?.data?.message || e.message || 'Gagal menghubungi server BPJS.';
      showAlert('Gagal Verifikasi', errorMsg, 'error');
    } finally {
      setIsVerifyingBPJS(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && !selectedPatient) return showAlert('Peringatan', 'Pilih pasien terlebih dahulu', 'warning');
    if (step === 2) {
      if (!selectedPenjab) return showAlert('Peringatan', 'Pilih cara bayar terlebih dahulu', 'warning');
      if (selectedPenjab.png_jawab.toUpperCase().includes('BPJS')) {
        setShowBPJSInfo(true);
        setBpjsStep(0);
        return;
      }
    }
    if (step === 3 && !selectedPoli) {
      return showAlert('Peringatan', 'Pilih Poliklinik', 'warning');
    }
    if (step === 4 && !selectedDate) return showAlert('Peringatan', 'Pilih tanggal periksa', 'warning');
    if (step === 5) {
      if (!selectedDokter) {
        fetchDokter(selectedPoli.kd_poli);
        return showAlert('Peringatan', 'Pilih Dokter', 'warning');
      }
    }
    
    if (step === 3 && selectedPoli) {
      fetchDokter(selectedPoli.kd_poli);
    }
    
    setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  if (loading && step === 1) {
    return (
      <RNView style={styles.center}>
        <ActivityIndicator size="large" color="#00796b" />
        <Text style={{ marginTop: 10 }}>Memuat Layanan...</Text>
      </RNView>
    );
  }

  if (showBPJSInfo) {
    return (
      <RNView style={styles.container}>
        <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
        <ScrollView contentContainerStyle={[styles.bpjsScroll, { paddingTop: Math.max(insets.top, 25) }]}>
          <Animated.View entering={FadeInDown} style={styles.bpjsContent}>
            
            {bpjsStep === 0 && (
              <>
                <RNView style={styles.bpjsIconBox}>
                  <MaterialCommunityIcons name="information" size={50} color="#00796b" />
                </RNView>
                <Text style={styles.bpjsTitle}>Pemberitahuan bagi Pasien yang Terhormat,</Text>
                <Text style={styles.bpjsText}>
                  Sehubungan dengan adanya regulasi serta komitmen kepatuhan Fasilitas Kesehatan terhadap mitra BPJS Kesehatan, kami menginformasikan bahwa bagi peserta BPJS, proses registrasi pendaftaran atau pengambilan antrean kunjungan saat ini dialihkan melalui aplikasi <Text style={{fontWeight:'bold'}}>Mobile JKN</Text> guna sinkronisasi data yang lebih akurat.
                </Text>
                <Text style={styles.bpjsText}>
                  Kami mohon maaf atas ketidaknyamanan ini. Apabila Anda belum memiliki aplikasinya, silakan mengunduh melalui tautan di bawah ini:
                </Text>
                
                <RNView style={styles.downloadSection}>
                  <TouchableOpacity 
                    style={styles.storeBtn}
                    onPress={() => Linking.openURL('https://play.google.com/store/apps/details?id=app.bpjs.mobile')}
                  >
                    <MaterialCommunityIcons name="google-play" size={24} color="#fff" />
                    <RNView style={styles.storeTextCol}>
                      <Text style={styles.storeSmall}>Download on</Text>
                      <Text style={styles.storeLarge}>Google Play</Text>
                    </RNView>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.storeBtn, { backgroundColor: '#37474f' }]}
                    onPress={() => Linking.openURL('https://apps.apple.com/id/app/mobile-jkn/id1230716242')}
                  >
                    <Ionicons name="logo-apple" size={24} color="#fff" />
                    <RNView style={styles.storeTextCol}>
                      <Text style={styles.storeSmall}>Download on</Text>
                      <Text style={styles.storeLarge}>App Store</Text>
                    </RNView>
                  </TouchableOpacity>
                </RNView>

                <RNView style={styles.bpjsActionRow}>
                  <TouchableOpacity 
                    style={styles.bpjsSecondaryBtn} 
                    onPress={() => {
                      setShowBPJSInfo(false);
                      setSelectedPenjab(null);
                    }}
                  >
                    <Text style={styles.bpjsSecondaryText}>Ganti Metode</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.bpjsPrimaryBtn} 
                    onPress={() => {
                      setBpjsCardNo(selectedPatient?.no_peserta || '');
                      setBpjsStep(1);
                    }}
                  >
                    <Text style={styles.bpjsPrimaryText}>Tetap Daftar</Text>
                  </TouchableOpacity>
                </RNView>
              </>
            )}

            {bpjsStep === 1 && (
              <Animated.View entering={FadeInRight} style={{ width: '100%', alignItems: 'center', backgroundColor: 'transparent' }}>
                <RNView style={styles.bpjsIconBoxLarge}>
                  <LinearGradient colors={['#e0f2f1', '#f0fdfa']} style={styles.iconGradient}>
                    <MaterialCommunityIcons name="card-account-details-outline" size={50} color="#00796b" />
                  </LinearGradient>
                </RNView>
                
                <Text style={styles.bpjsTitle}>Verifikasi Kartu BPJS</Text>
                <Text style={styles.bpjsText}>Pastikan data kepesertaan Anda aktif untuk mendapatkan layanan bridging.</Text>
                
                <LinearGradient 
                  colors={['#00897b', '#004d40']} 
                  start={{x: 0, y: 0}} 
                  end={{x: 1, y: 1}} 
                  style={styles.digitalCard}
                >
                  <RNView style={styles.cardHeader}>
                    <Text style={styles.cardBrand}>E-PASIEN BPJS</Text>
                    {participantData ? (
                      <RNView style={[styles.statusBadge, { backgroundColor: participantData.statusPeserta.kode === '0' ? '#4caf50' : '#f44336' }]}>
                        <Text style={styles.statusBadgeText}>{participantData.statusPeserta.keterangan.toUpperCase()}</Text>
                      </RNView>
                    ) : (
                      <MaterialCommunityIcons name="chip" size={32} color="#ffd54f" />
                    )}
                  </RNView>
                  
                  <RNView style={styles.cardBody}>
                    <Text style={styles.cardLabel}>NOMOR KARTU PESERTA</Text>
                    <Text style={styles.cardNoText}>{bpjsCardNo || '---- ---- ---- ----'}</Text>
                    {participantData && (
                      <Text style={styles.cardTypeText}>{participantData.jenisPeserta.keterangan}</Text>
                    )}
                  </RNView>

                  <RNView style={styles.cardFooter}>
                    <RNView style={{backgroundColor: 'transparent', flex: 1}}>
                      <Text style={styles.cardLabel}>NAMA PESERTA</Text>
                      <Text style={styles.cardNameText} numberOfLines={1}>
                        {participantData ? participantData.nama : (selectedPatient?.nm_pasien || '-')}
                      </Text>
                    </RNView>
                    <TouchableOpacity 
                      style={styles.editCardBtn}
                      onPress={() => {
                        setTempCardNo(bpjsCardNo);
                        setShowEditModal(true);
                      }}
                    >
                      <Ionicons name="create" size={18} color="#fff" />
                      <Text style={styles.editCardText}>Ubah</Text>
                    </TouchableOpacity>
                  </RNView>
                </LinearGradient>

                <TouchableOpacity 
                  style={[styles.premiumVerifyBtn, isVerifyingBPJS && { opacity: 0.8 }]} 
                  onPress={checkBPJSReferrals}
                  disabled={isVerifyingBPJS}
                >
                  <LinearGradient 
                    colors={['#00bfa5', '#00796b']} 
                    style={styles.premiumBtnGradient}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 0}}
                  >
                    {isVerifyingBPJS ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Text style={styles.premiumVerifyText}>Cek Rujukan Aktif</Text>
                        <Ionicons name="arrow-forward" size={20} color="#fff" style={{marginLeft: 10}} />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity style={styles.bpjsBackLink} onPress={() => setBpjsStep(0)}>
                  <Ionicons name="arrow-back" size={16} color="#78909c" />
                  <Text style={styles.bpjsBackLinkText}>Kembali ke Info</Text>
                </TouchableOpacity>
              </Animated.View>
            )}

            {bpjsStep === 2 && (
              <>
                <Text style={styles.bpjsTitle}>Pilih Rujukan Aktif</Text>
                <Text style={styles.bpjsText}>Ditemukan {referrals.length} rujukan. Pilih salah satu untuk melanjutkan.</Text>
                
                <ScrollView style={{ width: '100%', maxHeight: 400 }}>
                  {referrals.map((item, index) => (
                    <TouchableOpacity 
                      key={index} 
                      style={[styles.referralCard, (item.noKunjungan === selectedReferral?.noKunjungan || item.noRujukan === selectedReferral?.noRujukan) && styles.referralCardActive]}
                      onPress={() => setSelectedReferral(item)}
                    >
                      <RNView style={styles.referralHeader}>
                        <RNView style={styles.badgeRow}>
                          <Text style={[styles.referralBadge, { backgroundColor: (item.asal || '').includes('RS') ? '#1e88e5' : '#43a047' }]}>
                            {item.asal || 'Rujukan'}
                          </Text>
                        </RNView>
                        <RNView style={styles.issueDateBox}>
                          <Text style={styles.issueDateLabel}>Tgl. Kunjungan</Text>
                          <Text style={styles.issueDateValue}>{item.tglKunjungan || item.tglRujukan || item.TglRujukan || '-'}</Text>
                        </RNView>
                      </RNView>

                      <Text style={styles.referralPoli}>{(item.poliRujukan?.nama || item.poliRujukan?.nmPoli || item.PoliRujukan?.Nama || 'Poliklinik Tidak Diketahui')}</Text>
                      
                      <RNView style={styles.highlightedNoBox}>
                        <Text style={styles.highlightedNoLabel}>NOMOR RUJUKAN</Text>
                        <Text style={styles.highlightedNoValue}>{item.noKunjungan || item.noRujukan || item.NoRujukan || '-'}</Text>
                      </RNView>

                      <RNView style={styles.referralDetailRow}>
                        <MaterialCommunityIcons name="hospital-building" size={14} color="#78909c" />
                        <Text style={styles.referralDetailText}>Faskes: {(item.provPerujuk?.nama || item.provPerujuk?.nmProvider || item.ProvPerujuk?.Nama || '-')}</Text>
                      </RNView>

                      <RNView style={styles.referralDetailRow}>
                        <MaterialCommunityIcons name="stethoscope" size={14} color="#78909c" />
                        <Text style={styles.referralDetailText}>Diagnosa: {item.diagnosa?.nama || item.diagnosa?.nmDiag || '-'}</Text>
                      </RNView>

                      <RNView style={styles.referralDetailRow}>
                        <MaterialCommunityIcons name="account-details" size={14} color="#78909c" />
                        <Text style={styles.referralDetailText}>Peserta: {item.peserta?.jenisPeserta?.keterangan || '-'} ({item.peserta?.hakKelas?.keterangan || '-'})</Text>
                      </RNView>

                      <RNView style={styles.referralFooter}>
                        <Text style={{color: '#78909c', fontSize: 11}}>{item.jnsPelayanan === '1' ? 'RAWAT INAP' : 'RAWAT JALAN'}</Text>
                        <MaterialCommunityIcons 
                          name={(item.noKunjungan === selectedReferral?.noKunjungan || item.noRujukan === selectedReferral?.noRujukan) ? "check-circle" : "circle-outline"} 
                          size={24} 
                          color={(item.noKunjungan === selectedReferral?.noKunjungan || item.noRujukan === selectedReferral?.noRujukan) ? "#00796b" : "#cfd8dc"} 
                        />
                      </RNView>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <TouchableOpacity 
                  style={[styles.bpjsVerifyBtn, !selectedReferral && { backgroundColor: '#b0bec5' }]} 
                  disabled={!selectedReferral}
                  onPress={() => {
                    const poliCode = selectedReferral.poliRujukan?.kode || selectedReferral.poliRujukan?.kdPoli || '';
                    const poliName = selectedReferral.poliRujukan?.nama || selectedReferral.poliRujukan?.nmPoli || '';
                    
                    // Logika pencocokan yang lebih presisi (Kode > Nama)
                    const matchedPoli = polis.find(p => {
                      const simrsKd = (p.kd_poli || '').toUpperCase();
                      const simrsKdBPJS = (p.kd_poli_bpjs || '').toUpperCase(); // Cek jika ada field mapping BPJS
                      const bpjsKd = poliCode.toUpperCase();
                      
                      const simrsNm = (p.nm_poli || '').toUpperCase();
                      const bpjsNm = poliName.toUpperCase();
                      
                      // Cek Kode dulu, baru Nama
                      return simrsKd === bpjsKd || simrsKdBPJS === bpjsKd || simrsNm.includes(bpjsNm) || bpjsNm.includes(simrsNm);
                    });

                    if (matchedPoli) {
                      setSelectedPoli(matchedPoli);
                      fetchDokter(matchedPoli.kd_poli);
                      setShowBPJSInfo(false);
                      setStep(4);
                    } else {
                      setShowBPJSInfo(false);
                      showAlert(
                        'Poli Tidak Terdeteksi Otomatis', 
                        `Kami tidak dapat mencocokkan Kode Poli "${poliCode}" (${poliName}). Silakan pilih Poliklinik secara manual.`, 
                        'info'
                      );
                      setStep(3);
                    }
                  }}
                >
                  <Text style={styles.bpjsVerifyText}>Gunakan Rujukan Ini</Text>
                </TouchableOpacity>

                <TouchableOpacity style={{ marginTop: 20 }} onPress={() => setBpjsStep(1)}>
                  <Text style={{ color: '#78909c' }}>Kembali</Text>
                </TouchableOpacity>
              </>
            )}

          </Animated.View>
        </ScrollView>

        <CustomAlert 
          visible={alert.visible}
          title={alert.title}
          message={alert.message}
          type={alert.type}
          onClose={() => setAlert({ ...alert, visible: false })}
        />

        <Modal visible={showEditModal} transparent animationType="fade">
          <RNView style={styles.modalOverlay}>
            <Animated.View entering={FadeInDown} style={styles.modalContent}>
              <Text style={styles.modalTitle}>Ubah No. Kartu BPJS</Text>
              <Text style={styles.modalDesc}>Masukkan 13 digit nomor kartu atau 16 digit NIK Anda.</Text>
              
              <RNView style={styles.modalInputBox}>
                <MaterialCommunityIcons name="card-search" size={24} color="#00796b" />
                <RNView style={{ flex: 1, backgroundColor: 'transparent', marginLeft: 10 }}>
                  <RNView style={{ height: 40, justifyContent: 'center', backgroundColor: 'transparent' }}>
                    <Text style={{ color: '#263238', fontWeight: 'bold', fontSize: 18 }}>{tempCardNo || '---'}</Text>
                  </RNView>
                </RNView>
              </RNView>

              <RNView style={styles.keypadGrid}>
                {['1','2','3','4','5','6','7','8','9','C','0','⌫'].map((key) => (
                  <TouchableOpacity 
                    key={key} 
                    style={styles.keyItem}
                    onPress={() => {
                      if (key === 'C') setTempCardNo('');
                      else if (key === '⌫') setTempCardNo(prev => prev.slice(0, -1));
                      else if (tempCardNo.length < 16) setTempCardNo(prev => prev + key);
                    }}
                  >
                    <Text style={[styles.keyText, (key === 'C' || key === '⌫') && { color: '#e53935' }]}>{key}</Text>
                  </TouchableOpacity>
                ))}
              </RNView>

              <RNView style={styles.modalActions}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowEditModal(false)}>
                  <Text style={styles.modalCancelText}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.modalSaveBtn} 
                  onPress={() => {
                    setBpjsCardNo(tempCardNo);
                    setShowEditModal(false);
                  }}
                >
                  <Text style={styles.modalSaveText}>Simpan</Text>
                </TouchableOpacity>
              </RNView>
            </Animated.View>
          </RNView>
        </Modal>
      </RNView>
    );
  }

  return (
    <RNView style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <LinearGradient colors={['#004d40', '#00796b', '#1abc9c']} style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <RNView style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
          <RNView style={styles.headerTitleBox}>
            <Text style={styles.headerTitle}>Booking Antrian</Text>
            <Text style={styles.headerStatus}>Langkah {step} dari 6</Text>
          </RNView>
        </RNView>
      </LinearGradient>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <RNView style={styles.content}>
          
          {step === 1 && (
            <Animated.View entering={FadeInRight} exiting={FadeOutLeft}>
              <Text style={styles.stepTitle}>Siapa yang akan periksa?</Text>
              <Text style={styles.stepDesc}>Pilih profil pasien yang akan didaftarkan antrean.</Text>
              <RNView style={styles.selectionList}>
                {patients.map((item) => (
                  <TouchableOpacity 
                    key={item.no_rkm_medis}
                    style={[styles.cardItem, selectedPatient?.no_rkm_medis === item.no_rkm_medis && styles.cardActive]}
                    onPress={() => setSelectedPatient(item)}
                  >
                    <RNView style={[styles.iconBox, { backgroundColor: selectedPatient?.no_rkm_medis === item.no_rkm_medis ? '#fff' : '#e0f2f1' }]}>
                      <FontAwesome5 name={item.jk === 'L' ? 'user-alt' : 'female'} size={20} color="#00796b" />
                    </RNView>
                    <RNView style={{ flex: 1, backgroundColor: 'transparent' }}>
                      <Text style={[styles.cardText, selectedPatient?.no_rkm_medis === item.no_rkm_medis && styles.textActive]}>{item.nm_pasien}</Text>
                      <Text style={[styles.cardSubtext, selectedPatient?.no_rkm_medis === item.no_rkm_medis && styles.textActive]}>{item.hubungan} • RM: {item.no_rkm_medis}</Text>
                    </RNView>
                    {selectedPatient?.no_rkm_medis === item.no_rkm_medis && <Ionicons name="checkmark-circle" size={24} color="#fff" />}
                  </TouchableOpacity>
                ))}
              </RNView>
            </Animated.View>
          )}

          {/* STEP 2: CARA BAYAR */}
          {step === 2 && (
            <Animated.View entering={FadeInRight} exiting={FadeOutLeft}>
              <Text style={styles.stepTitle}>Pilih Metode Pembayaran</Text>
              <Text style={styles.stepDesc}>Tentukan penjamin biaya untuk {selectedPatient?.nm_pasien}.</Text>
              <RNView style={styles.gridContainer}>
                {penjabs.map((item) => (
                  <TouchableOpacity 
                    key={item.kd_pj}
                    style={[styles.gridItem, selectedPenjab?.kd_pj === item.kd_pj && styles.gridItemActive]}
                    onPress={() => setSelectedPenjab(item)}
                  >
                    <RNView style={[styles.gridIconBox, { backgroundColor: selectedPenjab?.kd_pj === item.kd_pj ? 'rgba(255,255,255,0.2)' : '#e0f2f1' }]}>
                      <MaterialCommunityIcons 
                        name={item.png_jawab.toUpperCase().includes('BPJS') ? 'card-account-details' : 'wallet'} 
                        size={24} 
                        color={selectedPenjab?.kd_pj === item.kd_pj ? '#fff' : '#00796b'} 
                      />
                    </RNView>
                    <Text style={[styles.gridText, selectedPenjab?.kd_pj === item.kd_pj && styles.textActive]} numberOfLines={2}>{item.png_jawab}</Text>
                    {selectedPenjab?.kd_pj === item.kd_pj && (
                      <RNView style={styles.checkBadge}>
                        <Ionicons name="checkmark" size={12} color="#00796b" />
                      </RNView>
                    )}
                  </TouchableOpacity>
                ))}
              </RNView>
            </Animated.View>
          )}

          {/* STEP 3: POLIKLINIK */}
          {step === 3 && (
            <Animated.View entering={FadeInRight} exiting={FadeOutLeft}>
              <Text style={styles.stepTitle}>Pilih Poliklinik</Text>
              <Text style={styles.stepDesc}>Pilih layanan spesialis yang dituju.</Text>
              <RNView style={styles.gridContainer}>
                {polis.map((item) => (
                  <TouchableOpacity 
                    key={item.kd_poli}
                    style={[styles.gridItem, selectedPoli?.kd_poli === item.kd_poli && styles.gridItemActive]}
                    onPress={() => setSelectedPoli(item)}
                  >
                    <RNView style={[styles.gridIconBox, { backgroundColor: selectedPoli?.kd_poli === item.kd_poli ? 'rgba(255,255,255,0.2)' : '#f0fdf4' }]}>
                      <FontAwesome5 name="hospital-user" size={20} color={selectedPoli?.kd_poli === item.kd_poli ? '#fff' : '#00796b'} />
                    </RNView>
                    <Text style={[styles.gridText, selectedPoli?.kd_poli === item.kd_poli && styles.textActive]} numberOfLines={2}>{item.nm_poli}</Text>
                    {selectedPoli?.kd_poli === item.kd_poli && (
                      <RNView style={styles.checkBadge}>
                        <Ionicons name="checkmark" size={12} color="#00796b" />
                      </RNView>
                    )}
                  </TouchableOpacity>
                ))}
              </RNView>
            </Animated.View>
          )}

          {step === 4 && (
            <Animated.View entering={FadeInRight} exiting={FadeOutLeft}>
              <Text style={styles.stepTitle}>Pilih Tanggal Kunjungan</Text>
              <Text style={styles.stepDesc}>Pilih waktu periksa untuk {selectedPatient?.nm_pasien}.</Text>
              
              <TouchableOpacity 
                style={styles.datePickerTrigger} 
                onPress={() => setShowDatePicker(true)}
              >
                <LinearGradient colors={['#e0f2f1', '#f0fdfa']} style={styles.dateTriggerGradient}>
                  <RNView style={styles.dateIconCircle}>
                    <Ionicons name="calendar" size={30} color="#00796b" />
                  </RNView>
                  <RNView style={styles.dateTextInfo}>
                    <Text style={styles.dateLabel}>Tanggal Terpilih:</Text>
                    <Text style={styles.dateValue}>
                      {selectedDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </Text>
                  </RNView>
                  <Ionicons name="chevron-forward" size={20} color="#b0bec5" />
                </LinearGradient>
              </TouchableOpacity>

              <RNView style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={20} color="#00796b" />
                <Text style={styles.infoText}>Sistem akan mencatat pendaftaran Anda sesuai tanggal di atas.</Text>
              </RNView>
            </Animated.View>
          )}

          {step === 5 && (
            <Animated.View entering={FadeInRight} exiting={FadeOutLeft}>
              <Text style={styles.stepTitle}>Pilih Dokter Spesialis</Text>
              <Text style={styles.stepDesc}>Daftar dokter yang tersedia di {selectedPoli?.nm_poli}.</Text>
              {loading ? (
                <ActivityIndicator size="large" color="#00796b" style={{ marginTop: 50 }} />
              ) : dokters.length === 0 ? (
                <Text style={styles.emptyText}>Tidak ada dokter tersedia untuk Poli ini.</Text>
              ) : (
                <RNView style={styles.selectionList}>
                  {dokters.map((item) => (
                    <TouchableOpacity 
                      key={item.kd_dokter}
                      style={[styles.cardItem, selectedDokter?.kd_dokter === item.kd_dokter && styles.cardActive]}
                      onPress={() => setSelectedDokter(item)}
                    >
                      <RNView style={[styles.iconBox, { backgroundColor: selectedDokter?.kd_dokter === item.kd_dokter ? '#fff' : '#f0fdf4' }]}>
                        <MaterialCommunityIcons name="doctor" size={24} color="#00796b" />
                      </RNView>
                      <Text style={[styles.cardText, selectedDokter?.kd_dokter === item.kd_dokter && styles.textActive]}>{item.nm_dokter}</Text>
                      {selectedDokter?.kd_dokter === item.kd_dokter && <Ionicons name="checkmark-circle" size={24} color="#fff" />}
                    </TouchableOpacity>
                  ))}
                </RNView>
              )}
            </Animated.View>
          )}

          {step === 6 && (
            <Animated.View entering={FadeInRight}>
              <Text style={styles.stepTitle}>Konfirmasi Pendaftaran</Text>
              <Text style={styles.stepDesc}>Pastikan semua data berikut sudah benar sebelum dikirim.</Text>
              
              <RNView style={styles.reviewCard}>
                <RNView style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Nama Pasien</Text>
                  <Text style={styles.reviewValue}>{selectedPatient?.nm_pasien}</Text>
                </RNView>
                <RNView style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Metode Bayar</Text>
                  <Text style={styles.reviewValue}>{selectedPenjab?.png_jawab}</Text>
                </RNView>
                <RNView style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Unit Poliklinik</Text>
                  <Text style={styles.reviewValue}>{selectedPoli?.nm_poli}</Text>
                </RNView>
                <RNView style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Dokter</Text>
                  <Text style={styles.reviewValue}>{selectedDokter?.nm_dokter}</Text>
                </RNView>
                <RNView style={[styles.reviewRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.reviewLabel}>Tanggal Periksa</Text>
                  <Text style={styles.reviewValue}>{selectedDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                </RNView>
              </RNView>

              <RNView style={styles.warningBox}>
                <Ionicons name="alert-circle-outline" size={20} color="#e65100" />
                <Text style={styles.warningText}>
                  Pendaftaran bersifat antrean sementara. Nomor antrean resmi akan muncul setelah data diverifikasi sistem RS.
                </Text>
              </RNView>
            </Animated.View>
          )}

        </RNView>
      </ScrollView>

      <RNView style={styles.footer}>
        {step > 1 && (
          <TouchableOpacity style={styles.backButton} onPress={prevStep}>
            <Text style={styles.backButtonText}>Kembali</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          style={[styles.nextButton, step === 1 && { width: '100%' }]} 
          onPress={step === 6 ? handleSubmit : nextStep}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.nextButtonText}>{step === 6 ? 'Kirim Pendaftaran' : 'Lanjutkan'}</Text>
          )}
        </TouchableOpacity>
      </RNView>

      <CustomAlert 
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={() => {
          setAlert({ ...alert, visible: false });
          if (alert.onClose) alert.onClose();
        }}
      />

      <CustomDatePicker 
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSelect={(dateString) => {
          setSelectedDate(new Date(dateString));
          setShowDatePicker(false);
        }}
        initialDate={selectedDate.toISOString().split('T')[0]}
        minDate={new Date(Date.now() + 86400000).toISOString().split('T')[0]} // H+1
        maxDate={new Date(Date.now() + (86400000 * 7)).toISOString().split('T')[0]} // H+7
      />

      {/* MODAL UBAH NO KARTU BPJS */}
      <Modal visible={showEditModal} transparent animationType="fade">
        <RNView style={styles.modalOverlay}>
          <Animated.View entering={FadeInDown} style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ubah No. Kartu BPJS</Text>
            <Text style={styles.modalDesc}>Masukkan 13 digit nomor kartu atau 16 digit NIK Anda.</Text>
            
            <RNView style={styles.modalInputBox}>
              <MaterialCommunityIcons name="card-search" size={24} color="#00796b" />
              <RNView style={{ flex: 1, backgroundColor: 'transparent', marginLeft: 10 }}>
                <RNView style={{ height: 40, justifyContent: 'center', backgroundColor: 'transparent' }}>
                  <Text style={{ color: '#263238', fontWeight: 'bold', fontSize: 18 }}>{tempCardNo || '---'}</Text>
                </RNView>
              </RNView>
            </RNView>

            {/* Numeric Keypad Simulation / Simple Input */}
            <RNView style={styles.keypadGrid}>
              {['1','2','3','4','5','6','7','8','9','C','0','⌫'].map((key) => (
                <TouchableOpacity 
                  key={key} 
                  style={styles.keyItem}
                  onPress={() => {
                    if (key === 'C') setTempCardNo('');
                    else if (key === '⌫') setTempCardNo(prev => prev.slice(0, -1));
                    else if (tempCardNo.length < 16) setTempCardNo(prev => prev + key);
                  }}
                >
                  <Text style={[styles.keyText, (key === 'C' || key === '⌫') && { color: '#e53935' }]}>{key}</Text>
                </TouchableOpacity>
              ))}
            </RNView>

            <RNView style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowEditModal(false)}>
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalSaveBtn} 
                onPress={() => {
                  setBpjsCardNo(tempCardNo);
                  setShowEditModal(false);
                }}
              >
                <Text style={styles.modalSaveText}>Simpan</Text>
              </TouchableOpacity>
            </RNView>
          </Animated.View>
        </RNView>
      </Modal>
    </RNView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fdfc' },
  header: {
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
  scroll: { flex: 1 },
  content: { padding: 25 },
  stepTitle: { fontSize: 22, fontWeight: 'bold', color: '#263238', marginBottom: 5 },
  stepDesc: { fontSize: 13, color: '#78909c', marginBottom: 25 },
  selectionList: { gap: 12, backgroundColor: 'transparent' },
  gridContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 10, 
    justifyContent: 'flex-start',
    backgroundColor: 'transparent' 
  },
  gridItem: {
    width: (width - 70) / 3, // 3 columns with padding/gap consideration
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 12,
    alignItems: 'center',
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  gridItemActive: {
    backgroundColor: '#00796b',
    borderColor: '#00796b',
  },
  gridIconBox: {
    width: 44,
    height: 44,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  gridText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#37474f',
    textAlign: 'center',
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  cardActive: { backgroundColor: '#00796b' },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  cardText: { fontSize: 15, fontWeight: 'bold', color: '#37474f', flex: 1 },
  cardSubtext: { fontSize: 11, color: '#90a4ae', marginTop: 2 },
  textActive: { color: '#fff' },
  datePickerBox: { marginVertical: 10, alignItems: 'center' },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2f1',
    padding: 15,
    borderRadius: 15,
    marginTop: 20,
  },
  infoText: { fontSize: 12, color: '#00695c', marginLeft: 10, fontWeight: '600' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#90a4ae', fontStyle: 'italic' },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: '#e0f2f1',
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  reviewLabel: { fontSize: 13, color: '#78909c' },
  reviewValue: { fontSize: 14, fontWeight: 'bold', color: '#263238', textAlign: 'right', flex: 1, marginLeft: 20 },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#fff3e0',
    padding: 15,
    borderRadius: 15,
    marginTop: 20,
  },
  warningText: { fontSize: 12, color: '#e65100', marginLeft: 10, flex: 1, lineHeight: 18 },
  footer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f1f1f1',
  },
  backButton: {
    flex: 1,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 18,
    marginRight: 10,
  },
  backButtonText: { color: '#78909c', fontWeight: 'bold' },
  nextButton: {
    flex: 2,
    height: 56,
    backgroundColor: '#00796b',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  nextButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  datePickerTrigger: {
    marginVertical: 15,
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#00796b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  dateTriggerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  dateIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    elevation: 2,
  },
  dateTextInfo: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  dateLabel: {
    fontSize: 12,
    color: '#78909c',
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#004d40',
  },
  bpjsScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 25,
    backgroundColor: '#fff',
  },
  bpjsContent: {
    alignItems: 'center',
  },
  bpjsIconBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e0f2f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
  },
  bpjsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#263238',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 28,
  },
  bpjsText: {
    fontSize: 15,
    color: '#546e7a',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  downloadSection: {
    width: '100%',
    gap: 15,
    marginTop: 10,
    marginBottom: 30,
  },
  storeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: 'center',
  },
  storeTextCol: {
    marginLeft: 12,
  },
  storeSmall: {
    color: '#fff',
    fontSize: 10,
  },
  storeLarge: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  referralDate: {
    color: '#78909c',
    fontSize: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  referralDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    backgroundColor: 'transparent',
  },
  referralDetailText: {
    color: '#546e7a',
    fontSize: 12,
    marginLeft: 6,
  },
  referralFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f1f1',
    backgroundColor: 'transparent',
  },
  referralPoli: {
    color: '#263238',
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  bpjsBackBtn: {
    padding: 15,
  },
  bpjsBackText: {
    color: '#00796b',
    fontWeight: 'bold',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  bpjsActionRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    marginTop: 10,
    backgroundColor: 'transparent',
  },
  bpjsPrimaryBtn: {
    flex: 1,
    height: 50,
    backgroundColor: '#00796b',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  bpjsPrimaryText: { color: '#fff', fontWeight: 'bold' },
  bpjsSecondaryBtn: {
    flex: 1,
    height: 50,
    backgroundColor: '#f5f5f5',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bpjsSecondaryText: { color: '#78909c', fontWeight: 'bold' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f1f1',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 15,
    width: '100%',
    marginVertical: 20,
  },
  inputLabel: { fontSize: 10, color: '#78909c' },
  inputTextValue: { fontSize: 16, fontWeight: 'bold', color: '#263238' },
  bpjsVerifyBtn: {
    width: '100%',
    height: 55,
    backgroundColor: '#00796b',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  bpjsVerifyText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  referralCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  referralCardActive: {
    borderColor: '#00796b',
    backgroundColor: '#e0f2f1',
    borderWidth: 2,
  },
  referralHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    backgroundColor: 'transparent',
  },
  referralBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  referralFaskes: { fontSize: 13, color: '#546e7a', marginBottom: 5 },
  referralNo: { fontSize: 11, color: '#90a4ae', fontStyle: 'italic' },
  bpjsIconBoxLarge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    overflow: 'hidden',
    marginBottom: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  iconGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  digitalCard: {
    width: '100%',
    height: 190,
    borderRadius: 20,
    padding: 20,
    marginVertical: 20,
    elevation: 8,
    shadowColor: '#004d40',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  cardBrand: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  cardBody: {
    marginTop: 25,
    backgroundColor: 'transparent',
  },
  cardLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4,
  },
  cardNoText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 3,
  },
  cardFooter: {
    marginTop: 'auto',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    backgroundColor: 'transparent',
  },
  cardNameText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  editCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  editCardText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  premiumVerifyBtn: {
    width: '100%',
    height: 60,
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 10,
    elevation: 5,
    shadowColor: '#00796b',
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  premiumBtnGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumVerifyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bpjsBackLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 25,
    padding: 10,
  },
  bpjsBackLinkText: {
    color: '#78909c',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardTypeText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    marginTop: 5,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 25,
    alignItems: 'center',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#263238', marginBottom: 10 },
  modalDesc: { fontSize: 13, color: '#78909c', textAlign: 'center', marginBottom: 20 },
  modalInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 15,
    width: '100%',
    marginBottom: 20,
  },
  keypadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 25,
    backgroundColor: 'transparent',
  },
  keyItem: {
    width: '30%',
    height: 50,
    backgroundColor: '#f8fdfc',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#e0f2f1',
    marginBottom: 12,
  },
  keyText: { fontSize: 20, fontWeight: 'bold', color: '#00796b' },
  modalActions: {
    flexDirection: 'row',
    width: '100%',
    gap: 15,
    backgroundColor: 'transparent',
  },
  modalCancelBtn: {
    flex: 1,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 15,
  },
  modalCancelText: { color: '#78909c', fontWeight: 'bold' },
  modalSaveBtn: {
    flex: 2,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#00796b',
    borderRadius: 15,
  },
  modalSaveText: { color: '#fff', fontWeight: 'bold' },
  issueDateBox: {
    alignItems: 'flex-end',
    backgroundColor: 'transparent',
  },
  issueDateLabel: {
    color: '#90a4ae',
    fontSize: 9,
    fontWeight: 'bold',
  },
  issueDateValue: {
    color: '#455a64',
    fontSize: 12,
    fontWeight: '600',
  },
  highlightedNoBox: {
    backgroundColor: '#f1f8e9',
    padding: 10,
    borderRadius: 8,
    marginVertical: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#8bc34a',
  },
  highlightedNoLabel: {
    color: '#689f38',
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  highlightedNoValue: {
    color: '#33691e',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
