import React, { useState, useRef } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, Dimensions, StatusBar, ActivityIndicator, View as RNView, Platform, Image } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import Signature from 'react-native-signature-canvas';
import { CameraView, useCameraPermissions } from 'expo-camera';
import api from '../services/api';
import CustomAlert from '../components/CustomAlert';

const { width } = Dimensions.get('window');

export default function ResumeMedisConsentScreen() {
  const router = useRouter();
  const { no_rkm_medis, nm_pasien, from } = useLocalSearchParams();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ visible: false, title: '', message: '', type: 'info' as any });

  const [checked, setChecked] = useState([false, false, false]);
  const [signature, setSignature] = useState<string | null>(null);
  const signatureRef = useRef<any>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [faceConfirmed, setFaceConfirmed] = useState(false);
  const cameraRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setAlert({ visible: true, title, message, type });
  };

  const handleNext = () => {
    if (step === 1 && checked.includes(false)) {
      showAlert('Perhatian', 'Mohon setujui semua poin pernyataan untuk melanjutkan.', 'error');
      return;
    }
    if (step === 2) {
      if (!signature) { signatureRef.current?.readSignature(); return; }
    }
    setStep(step + 1);
  };

  const handleSignatureOK = (img: string) => { setSignature(img); setStep(3); };

  // Countdown 3 detik lalu otomatis capture
  const startCountdown = () => {
    setCountdown(3);
    let count = 3;
    timerRef.current = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(timerRef.current);
        setCountdown(null);
        takePicture();
      } else {
        setCountdown(count);
      }
    }, 1000);
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;
    try {
      const data = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      setPhoto(data.uri);
    } catch (e) {
      console.error(e);
      showAlert('Error', 'Gagal mengambil foto. Coba lagi.', 'error');
    }
  };

  const handleSubmit = async () => {
    if (!photo) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('no_rkm_medis', no_rkm_medis as string);
      formData.append('signature', signature as string);
      const filename = photo.split('/').pop() || 'selfie.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpg`;
      formData.append('selfie', { uri: photo, name: filename, type } as any);

      const res = await api.post('/submit_resume_consent.php', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.status === 'success') {
        showAlert('Berhasil', res.data.message, 'success');
        setTimeout(() => {
          const targetRoute = (from as any) || '/resume_medis_history';
          router.replace({
            pathname: targetRoute,
            params: { no_rkm_medis, nm_pasien }
          });
        }, 2000);
      } else {
        showAlert('Gagal', res.data.message, 'error');
      }
    } catch (e) {
      console.error(e);
      showAlert('Error', 'Terjadi kesalahan saat mengirim data.', 'error');
    } finally { setLoading(false); }
  };

  if (!permission) return <View />;
  if (!permission.granted && step === 3) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#004d40', '#00796b', '#1abc9c']} style={styles.header}>
          <RNView style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={26} color="#fff" />
            </TouchableOpacity>
            <RNView style={styles.headerTitleBox}>
              <Text style={styles.headerTitle}>Izin Kamera</Text>
            </RNView>
          </RNView>
        </LinearGradient>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
          <MaterialCommunityIcons name="camera-off" size={60} color="#cfd8dc" />
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginTop: 20, color: '#263238' }}>Izin Kamera Diperlukan</Text>
          <Text style={{ fontSize: 13, color: '#90a4ae', textAlign: 'center', marginTop: 10, marginBottom: 30 }}>Untuk verifikasi wajah, aplikasi membutuhkan akses ke kamera depan.</Text>
          <TouchableOpacity onPress={requestPermission} style={[styles.btnPrimary, { width: '100%' }]}>
            <Text style={styles.btnText}>Beri Izin Kamera</Text>
          </TouchableOpacity>
        </View>
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
            <Text style={styles.headerTitle}>Verifikasi Keamanan</Text>
            <Text style={styles.headerStatus}>Langkah {step} dari 3</Text>
          </RNView>
        </RNView>
      </LinearGradient>

      {/* STEP 1 */}
      {step === 1 && (
        <Animated.View entering={FadeInRight} exiting={FadeOutLeft} style={styles.stepContent}>
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, marginBottom: 20 }}>
            <Text style={styles.legalTitle}>Pernyataan Persetujuan Akses Data Rekam Medis Elektronik Digital</Text>
            <Text style={styles.legalText}>
              Sehubungan dengan pengaksesan data medis digital (termasuk Resume Medis, Hasil Laboratorium, Radiologi, dan catatan klinis lainnya) melalui Aplikasi E-Pasien, saya yang bertanda tangan di bawah ini memahami dan menyetujui hal-hal berikut:{"\n\n"}
              1. Sesuai dengan <Text style={{fontWeight:'bold'}}>UU No. 17 Tahun 2023 tentang Kesehatan</Text> dan <Text style={{fontWeight:'bold'}}>PMK No. 24 Tahun 2022 tentang Rekam Medis</Text>, data rekam medis adalah milik pasien namun rahasia kedokteran wajib dijaga.{"\n\n"}
              2. Sesuai dengan <Text style={{fontWeight:'bold'}}>UU No. 27 Tahun 2022 tentang Perlindungan Data Pribadi (PDP)</Text>, saya secara sadar memberikan persetujuan kepada fasilitas pelayanan kesehatan untuk memproses dan menampilkan data medis saya pada perangkat ini secara aman.{"\n\n"}
              3. Saya bertanggung jawab penuh atas keamanan perangkat saya dan tidak akan menyalahgunakan atau menyebarluaskan informasi medis ini kepada pihak yang tidak berwenang.{"\n\n"}
              4. Akses verifikasi ini berlaku selama 90 hari (3 bulan) untuk seluruh modul data medis dan akan dilakukan verifikasi ulang setelah masa berlaku habis demi keamanan data saya.
            </Text>
            <View style={{ marginTop: 20, backgroundColor: 'transparent' }}>
              {["Saya telah membaca dan memahami pernyataan di atas.",
                "Saya memberikan izin akses data medis saya secara sadar.",
                "Saya bertanggung jawab atas kerahasiaan data pada perangkat ini."
              ].map((item, idx) => (
                <TouchableOpacity key={idx} style={styles.checkRow} onPress={() => { let n=[...checked]; n[idx]=!n[idx]; setChecked(n); }}>
                  <Ionicons name={checked[idx]?"checkbox":"square-outline"} size={24} color={checked[idx]?"#00796b":"#b0bec5"} />
                  <Text style={styles.checkText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <TouchableOpacity style={[styles.btnPrimary, { width: '100%' }]} onPress={handleNext}>
            <Text style={styles.btnText}>Saya Setuju & Lanjut</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <Animated.View entering={FadeInRight} exiting={FadeOutLeft} style={styles.stepContent}>
          <Text style={styles.stepLabel}>Bubuhkan Tanda Tangan Digital Anda</Text>
          <View style={styles.signatureContainer}>
            <Signature ref={signatureRef} onOK={handleSignatureOK}
              onEmpty={() => showAlert('Perhatian','Mohon bubuhkan tanda tangan Anda.','error')}
              descriptionText="Tanda Tangan di atas" clearText="Hapus" confirmText="Simpan"
              webStyle={`.m-signature-pad--footer {display: none; margin: 0px;}`}
              autoClear={false} imageType="image/png" />
          </View>
          <View style={styles.btnRow}>
            <TouchableOpacity style={[styles.btnSecondary, { flex: 1, marginRight: 10 }]} onPress={() => setStep(1)}>
              <Text style={styles.btnTextSecondary}>Kembali</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnPrimary, { flex: 1.5 }]} onPress={handleNext}>
              <Text style={styles.btnText}>Lanjut ke Selfie</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* STEP 3: SELFIE WITH VISUAL GUIDE */}
      {step === 3 && (
        <Animated.View entering={FadeInRight} style={styles.stepContent}>
          <Text style={styles.stepLabel}>Verifikasi Wajah (Selfie)</Text>

          {/* Camera / Preview */}
          <View style={styles.cameraBox}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.preview} />
            ) : (
              <RNView style={{ flex: 1 }}>
                <CameraView style={{ flex: 1 }} facing="front" ref={cameraRef} />
                {/* Face Guide Overlay */}
                <RNView style={styles.faceGuideOverlay}>
                  <RNView style={[styles.faceOval, faceConfirmed && { borderColor: '#00e676' }]} />
                  {countdown !== null ? (
                    <RNView style={styles.countdownBubble}>
                      <Text style={styles.countdownText}>{countdown}</Text>
                    </RNView>
                  ) : (
                    <Text style={styles.faceGuideText}>
                      {faceConfirmed ? 'Siap! Tekan tombol kamera' : 'Posisikan wajah di dalam lingkaran'}
                    </Text>
                  )}
                </RNView>
              </RNView>
            )}
          </View>

          {/* Instruksi & Konfirmasi */}
          {!photo && (
            <View style={{ backgroundColor: 'transparent' }}>
              <TouchableOpacity style={styles.confirmFaceRow} onPress={() => setFaceConfirmed(!faceConfirmed)}>
                <Ionicons name={faceConfirmed ? "checkbox" : "square-outline"} size={22} color={faceConfirmed ? "#00796b" : "#b0bec5"} />
                <Text style={styles.confirmFaceText}>Wajah saya sudah berada di dalam bingkai oval</Text>
              </TouchableOpacity>
              <View style={styles.instructionBox}>
                <Text style={styles.instructionItem}>• Wajah terlihat jelas & menghadap kamera depan</Text>
                <Text style={styles.instructionItem}>• Tanpa masker, kacamata hitam, atau penutup wajah</Text>
                <Text style={styles.instructionItem}>• Pencahayaan cukup terang</Text>
              </View>
            </View>
          )}

          {/* Buttons */}
          {photo ? (
            <View style={styles.btnRow}>
              <TouchableOpacity style={[styles.btnSecondary, { flex: 1, marginRight: 10 }]} onPress={() => { setPhoto(null); setFaceConfirmed(false); }}>
                <Text style={styles.btnTextSecondary}>Ulangi</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnPrimary, { flex: 1.5 }]} onPress={handleSubmit} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Aktifkan Sekarang</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.captureBtn, !faceConfirmed && { opacity: 0.4 }]}
              onPress={startCountdown}
              disabled={!faceConfirmed || countdown !== null}
            >
              <LinearGradient colors={faceConfirmed ? ['#00796b','#1abc9c'] : ['#b0bec5','#cfd8dc']} style={styles.captureCircle}>
                {countdown !== null ? (
                  <ActivityIndicator color="#fff" size="large" />
                ) : (
                  <Ionicons name="camera" size={32} color="#fff" />
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}
        </Animated.View>
      )}

      <CustomAlert visible={alert.visible} title={alert.title} message={alert.message}
        type={alert.type} onClose={() => setAlert({...alert, visible: false})} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fdfc' },
  header: { paddingTop: Platform.OS === 'ios' ? 50 : 30, paddingBottom: 25, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, backgroundColor: 'transparent' },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitleBox: { marginLeft: 15, backgroundColor: 'transparent' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  headerStatus: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  stepContent: { flex: 1, padding: 20, backgroundColor: 'transparent' },
  legalTitle: { fontSize: 18, fontWeight: 'bold', color: '#263238', marginBottom: 15 },
  legalText: { fontSize: 13, color: '#455a64', lineHeight: 22, textAlign: 'justify' },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, backgroundColor: 'transparent' },
  checkText: { fontSize: 12, color: '#37474f', marginLeft: 12, flex: 1 },
  btnPrimary: { backgroundColor: '#00796b', height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  btnSecondary: { height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0' },
  btnTextSecondary: { color: '#78909c', fontSize: 16, fontWeight: 'bold' },
  btnRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'transparent' },
  stepLabel: { fontSize: 16, fontWeight: 'bold', color: '#263238', marginBottom: 10, textAlign: 'center' },
  signatureContainer: { flex: 1, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 20, backgroundColor: '#fff', overflow: 'hidden', marginBottom: 20 },
  cameraBox: { flex: 1, borderRadius: 25, overflow: 'hidden', backgroundColor: '#000', marginBottom: 12 },
  preview: { flex: 1, resizeMode: 'cover' as any },
  faceGuideOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  faceOval: { width: 220, height: 300, borderRadius: 110, borderWidth: 3, borderColor: 'rgba(255,255,255,0.6)', borderStyle: 'dashed' },
  faceGuideText: { color: '#fff', fontSize: 12, fontWeight: '700', marginTop: 15, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20 },
  countdownBubble: { position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(0,121,107,0.8)', justifyContent: 'center', alignItems: 'center' },
  countdownText: { fontSize: 40, fontWeight: '900', color: '#fff' },
  confirmFaceRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 8, elevation: 2 },
  confirmFaceText: { fontSize: 12, color: '#37474f', marginLeft: 10, flex: 1, fontWeight: '600' },
  instructionBox: { marginBottom: 8, backgroundColor: 'transparent' },
  instructionItem: { fontSize: 11, color: '#78909c', marginBottom: 2 },
  captureBtn: { alignSelf: 'center', marginBottom: 10 },
  captureCircle: { width: 75, height: 75, borderRadius: 38, justifyContent: 'center', alignItems: 'center', elevation: 8 },
});
