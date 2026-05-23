import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform, 
  Dimensions,
  View as RNView,
  Keyboard,
  Image,
  ScrollView
} from 'react-native';
import { Text, View } from '@/components/Themed';
import { useRouter, Stack } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, SlideInRight, SlideInLeft } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { useAudioRecorder, AudioModule, RecordingOptions } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import api from '../services/api';
import CustomAlert from '@/components/CustomAlert';

const { width } = Dimensions.get('window');

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  image?: string;
  action?: { type: 'booking'; kd_poli: string };
}

export default function GejalaAIScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'model',
      text: 'Halo! Saya Asisten Medis Virtual E-Pasien Standard. Silakan ceritakan gejala yang Anda rasakan, saya akan bantu menganalisisnya.',
      timestamp: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const audioRecorder = useAudioRecorder({
    extension: '.m4a',
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 128000,
  });
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  const [alert, setAlert] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info' | 'warning'
  });

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setAlert({ visible: true, title, message, type });
  };

  const handleCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Izin Ditolak', 'Aplikasi butuh izin kamera untuk memotret keluhan.', 'error');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.3,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets[0].base64) {
      setSelectedImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
      showAlert('Gambar Berhasil', 'Gambar sudah siap dikirim. Klik tombol kirim untuk menganalisis.', 'success');
    }
  };

  const handleVoice = async () => {
    try {
      if (audioRecorder.isRecording) {
        // Stop recording
        await audioRecorder.stop();
        const uri = audioRecorder.uri;
        if (uri) {
          const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
          setAudioBase64(base64);
          showAlert('Suara Berhasil', 'Rekaman suara sudah siap dikirim. Klik tombol kirim untuk menganalisis.', 'success');
        }
      } else {
        // Start recording
        const permissions = await AudioModule.requestRecordingPermissionsAsync();
        if (!permissions.granted) {
          showAlert('Izin Ditolak', 'Aplikasi butuh izin mikrofon untuk merekam suara.', 'error');
          return;
        }

        audioRecorder.record();
      }
    } catch (err) {
      console.error('Failed to handle voice', err);
      showAlert('Error', 'Gagal menggunakan mikrofon.', 'error');
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() && !selectedImage && !audioBase64) return;

    const currentImage = selectedImage;
    const currentAudio = audioBase64;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: inputText.trim() || (currentAudio ? 'Menganalisis rekaman suara...' : 'Menganalisis gambar...'),
      timestamp: new Date(),
      image: currentImage || undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    Keyboard.dismiss();

    // Clear UI inputs immediately so user knows it's being processed
    setInputText('');
    setSelectedImage(null);
    setAudioBase64(null);

    try {
      const payload: any = {
        message: userMessage.text,
        session_id: sessionId,
        image_data: currentImage ? (currentImage.split(',')[1] || currentImage) : null,
        image_mime: currentImage ? "image/jpeg" : null,
        audio_data: currentAudio || null,
        audio_mime: currentAudio ? "audio/m4a" : null
      };

      const res = await api.post('/ai_symptom_checker.php', payload);

      if (res.data.status === 'success') {
        let aiText = res.data.data.message;
        let action: any = undefined;

        // Parse booking action
        const bookingMatch = aiText.match(/\[BOOKING:([\w\d]+)\]/);
        if (bookingMatch) {
            action = { type: 'booking', kd_poli: bookingMatch[1] };
            aiText = aiText.replace(/\[BOOKING:[\w\d]+\]/g, '').trim();
        }

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: aiText,
          timestamp: new Date(),
          action: action
        };
        setMessages(prev => [...prev, aiMessage]);
        setSessionId(res.data.data.session_id);
      } else {
        showAlert('Error', res.data.message || 'Gagal memproses permintaan.', 'error');
      }
    } catch (e: any) {
      const errorMsg = e.response?.data?.message || 'Gagal terhubung ke server AI.';
      showAlert('Error', errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 200);
  }, [messages, loading]);

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <Animated.View 
        entering={isUser ? SlideInRight : SlideInLeft}
        style={[
          styles.messageWrapper,
          isUser ? styles.userWrapper : styles.aiWrapper
        ]}
      >
        {!isUser && (
          <RNView style={styles.aiAvatar}>
            <MaterialCommunityIcons name="robot" size={18} color="#fff" />
          </RNView>
        )}
        <RNView style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.aiBubble
        ]}>
          {item.image && (
            <Image source={{ uri: item.image }} style={styles.messageImage} resizeMode="cover" />
          )}
          <Text style={[styles.messageText, isUser ? styles.userText : styles.aiText]}>
            {item.text}
          </Text>

          {item.action && item.action.type === 'booking' && (
            <TouchableOpacity 
                style={styles.actionBtn}
                onPress={() => router.push({ pathname: '/booking_antrian', params: { kd_poli: item.action?.kd_poli } })}
            >
                <Ionicons name="calendar" size={16} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.actionBtnText}>Booking Dokter Sekarang</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.timestamp}>
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </RNView>
      </Animated.View>
    );
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >

      {showDisclaimer ? (
        <LinearGradient colors={['#004d40', '#00796b']} style={styles.disclaimerOverlay}>
          <Animated.View entering={FadeInDown} style={styles.disclaimerCard}>
            <RNView style={styles.disclaimerIcon}>
              <FontAwesome5 name="hand-holding-medical" size={40} color="#00796b" />
            </RNView>
            <Text style={styles.disclaimerTitle}>Sanggahan Medis</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              <Text style={styles.disclaimerText}>
                Fitur **Cek Gejala AI** ini disediakan hanya sebagai alat bantu referensi awal.
                {"\n\n"}
                1. Hasil analisis **BUKAN merupakan diagnosis medis** resmi.
                {"\n"}
                2. AI dapat memberikan informasi yang tidak akurat dalam kondisi tertentu.
                {"\n"}
                3. Jangan menunda pemeriksaan ke dokter berdasarkan hasil dari AI ini.
                {"\n"}
                4. Jika Anda mengalami kondisi darurat (sesak napas, nyeri dada hebat), segera hubungi IGD Rumah Sakit atau ambulans.
                {"\n\n"}
                Dengan menekan "Lanjutkan", Anda setuju untuk menggunakan fitur ini secara bijak.
              </Text>
            </ScrollView>
            <TouchableOpacity 
              style={styles.disclaimerBtn} 
              onPress={() => setShowDisclaimer(false)}
            >
              <Text style={styles.disclaimerBtnText}>Saya Mengerti & Lanjutkan</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 15 }}>
              <Text style={{ color: '#90a4ae', fontWeight: 'bold' }}>Kembali</Text>
            </TouchableOpacity>
          </Animated.View>
        </LinearGradient>
      ) : (
        <>
          <LinearGradient colors={['#004d40', '#00796b']} style={styles.header}>
            <RNView style={styles.headerRow}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Ionicons name="chevron-back" size={26} color="#fff" />
              </TouchableOpacity>
              <RNView style={styles.headerTitleBox}>
                <Text style={styles.headerTitle}>Cek Gejala AI</Text>
                <RNView style={styles.statusRow}>
                  <RNView style={styles.onlineDot} />
                  <Text style={styles.headerStatus}>Online | Asisten Virtual E-Pasien</Text>
                </RNView>
              </RNView>
              <TouchableOpacity onPress={() => setMessages([messages[0]])} style={styles.headerAction}>
                <Ionicons name="refresh-outline" size={22} color="#fff" />
              </TouchableOpacity>
            </RNView>
          </LinearGradient>

          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.chatList}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={loading ? (
              <RNView style={styles.typingIndicator}>
                <ActivityIndicator size="small" color="#00796b" />
                <Text style={styles.typingText}>AI sedang menganalisis...</Text>
              </RNView>
            ) : null}
          />

          { (selectedImage || audioBase64) && (
            <Animated.View entering={FadeIn} style={styles.attachmentPreview}>
              {selectedImage && (
                <RNView style={styles.previewItem}>
                  <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                  <TouchableOpacity style={styles.removePreview} onPress={() => setSelectedImage(null)}>
                    <Ionicons name="close-circle" size={20} color="#e53935" />
                  </TouchableOpacity>
                </RNView>
              )}
              {audioBase64 && (
                <RNView style={styles.previewItem}>
                  <RNView style={styles.audioPreviewIcon}>
                    <MaterialCommunityIcons name="microphone" size={24} color="#00796b" />
                    <Text style={{ fontSize: 10, color: '#00796b', fontWeight: 'bold' }}>READY</Text>
                  </RNView>
                  <TouchableOpacity style={styles.removePreview} onPress={() => setAudioBase64(null)}>
                    <Ionicons name="close-circle" size={20} color="#e53935" />
                  </TouchableOpacity>
                </RNView>
              )}
            </Animated.View>
          )}

          <RNView style={styles.inputContainer}>
            <TouchableOpacity style={styles.attachmentBtn} onPress={handleCamera}>
              <Ionicons name="camera-outline" size={24} color="#00796b" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachmentBtn} onPress={handleVoice}>
              <Ionicons name={audioRecorder.isRecording ? "stop-circle" : "mic-outline"} size={24} color={audioRecorder.isRecording ? "#e53935" : "#00796b"} />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="Ceritakan keluhan Anda..."
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity 
              style={[styles.sendBtn, (!inputText.trim() && !selectedImage) && styles.sendBtnDisabled]} 
              onPress={handleSendMessage}
              disabled={(!inputText.trim() && !selectedImage) || loading}
            >
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </RNView>
        </>
      )}

      <CustomAlert 
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert({ ...alert, visible: false })}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f8fb' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, backgroundColor: 'transparent' },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitleBox: { marginLeft: 15, flex: 1, backgroundColor: 'transparent' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, backgroundColor: 'transparent' },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4caf50', marginRight: 6 },
  headerStatus: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  headerAction: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  chatList: { padding: 20, paddingBottom: 30 },
  messageWrapper: { marginBottom: 20, maxWidth: '85%', flexDirection: 'row', alignItems: 'flex-end' },
  userWrapper: { alignSelf: 'flex-end' },
  aiWrapper: { alignSelf: 'flex-start' },
  aiAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#00796b', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  messageBubble: { padding: 15, borderRadius: 20, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  userBubble: { backgroundColor: '#00796b', borderBottomRightRadius: 4 },
  aiBubble: { backgroundColor: '#fff', borderBottomLeftRadius: 4 },
  messageText: { fontSize: 14, lineHeight: 20 },
  userText: { color: '#fff' },
  aiText: { color: '#37474f' },
  messageImage: { width: 200, height: 150, borderRadius: 15, marginBottom: 10 },
  actionBtn: { backgroundColor: 'rgba(0,121,107,0.8)', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 12, marginTop: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  timestamp: { fontSize: 9, color: 'rgba(0,0,0,0.3)', marginTop: 8, alignSelf: 'flex-end' },
  typingIndicator: { flexDirection: 'row', alignItems: 'center', marginLeft: 40, marginBottom: 20 },
  typingText: { fontSize: 12, color: '#90a4ae', marginLeft: 10, fontStyle: 'italic' },
  attachmentPreview: { flexDirection: 'row', padding: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eceff1', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  previewItem: { marginRight: 15, position: 'relative' },
  previewImage: { width: 60, height: 60, borderRadius: 10 },
  audioPreviewIcon: { width: 60, height: 60, borderRadius: 10, backgroundColor: '#e0f2f1', justifyContent: 'center', alignItems: 'center' },
  removePreview: { position: 'absolute', top: -5, right: -5, backgroundColor: '#fff', borderRadius: 10 },
  inputContainer: { flexDirection: 'row', padding: 15, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eceff1', alignItems: 'center' },
  attachmentBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#f1f4f5', borderRadius: 25, paddingHorizontal: 20, paddingVertical: 10, fontSize: 14, maxHeight: 100, color: '#37474f', marginHorizontal: 5 },
  sendBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#00796b', justifyContent: 'center', alignItems: 'center', marginLeft: 5 },
  sendBtnDisabled: { backgroundColor: '#cfd8dc' },
  disclaimerOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 25 },
  disclaimerCard: { backgroundColor: '#fff', borderRadius: 30, padding: 30, width: '100%', alignItems: 'center' },
  disclaimerIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#e0f2f1', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  disclaimerTitle: { fontSize: 22, fontWeight: 'bold', color: '#263238', marginBottom: 15 },
  disclaimerText: { fontSize: 14, color: '#546e7a', textAlign: 'center', lineHeight: 22 },
  disclaimerBtn: { backgroundColor: '#00796b', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 15, marginTop: 30, width: '100%', alignItems: 'center' },
  disclaimerBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
