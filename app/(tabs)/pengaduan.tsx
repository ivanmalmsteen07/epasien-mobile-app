import React, { useEffect, useState, useRef, useCallback } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Image, Alert, FlatList, Keyboard, StatusBar, RefreshControl } from 'react-native';
import { Text, View } from '@/components/Themed';
import { Ionicons, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import api from '../../services/api';
import CustomAlert from '../../components/CustomAlert';

interface Message {
  id: string;
  tanggal: string;
  pesan: string;
  pesan_balasan: string | null;
  status_baca: string;
}

export default function PengaduanScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [alert, setAlert] = useState({ visible: false, title: '', message: '', type: 'info' as 'info' | 'success' | 'error' });
  const flatListRef = useRef<FlatList>(null);
  const lastMessageCount = useRef(0);

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setAlert({ visible: true, title, message, type });
  };

  // 1. Efek untuk memuat data user di awal
  useEffect(() => {
    loadUserData();
    const keyboardShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)
    );
    return () => keyboardShowListener.remove();
  }, []);

  // 2. Polling data setiap 10 detik saat layar sedang difokuskan
  useFocusEffect(
    useCallback(() => {
      if (!userData) return;
      const interval = setInterval(() => {
        fetchMessages(userData.no_rkm_medis, true);
      }, 10000);
      fetchMessages(userData.no_rkm_medis, true); // Ambil segera saat fokus
      return () => clearInterval(interval);
    }, [userData])
  );

  // 3. Efek khusus untuk scroll ke bawah SETIAP KALI pesan berubah (termasuk balasan baru)
  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  const loadUserData = async () => {
    try {
      const data = await SecureStore.getItemAsync('userData');
      if (data) {
        const parsed = JSON.parse(data);
        setUserData(parsed);
      } else {
        setLoading(false);
        router.replace('/login');
      }
    } catch (e) {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    if (userData) {
      setRefreshing(true);
      fetchMessages(userData.no_rkm_medis);
    }
  }, [userData]);

  const fetchMessages = async (noRM: string, isBackground = false) => {
    try {
      if (!isBackground && !refreshing) setLoading(true);
      
      const response = await api.get(`/get_pengaduan.php?no_rkm_medis=${noRM}`);
      if (response.data.status === 'success') {
        const newMessages = response.data.data.reverse();
        
        // Tandai sebagai dibaca HANYA jika benar-benar ada balasan dari admin
        newMessages.forEach((msg: Message) => {
          const hasReply = msg.pesan_balasan && msg.pesan_balasan.trim() !== "";
          if (hasReply && msg.status_baca === 'belum_dibaca') {
            markAsRead(msg.id, noRM);
          }
        });

        setMessages(newMessages);
        lastMessageCount.current = newMessages.length;
      }
    } catch (e) {
      // console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const markAsRead = async (id_pengaduan: string, noRM: string) => {
    try {
      await api.post('/read_pengaduan.php', { id_pengaduan, no_rkm_medis: noRM });
    } catch (e) {
      // console.error(e);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !userData) return;
    setSending(true);
    try {
      const response = await api.post('/send_pengaduan.php', {
        no_rkm_medis: userData.no_rkm_medis,
        pesan: inputText
      });
      if (response.data.status === 'success') {
        setInputText('');
        fetchMessages(userData.no_rkm_medis);
        // showAlert dihapus agar pesan langsung terkirim tanpa pop-up berhasil
      } else {
        showAlert('Perhatian', response.data.message || 'Pengaduan gagal dikirim', 'error');
      }
    } catch (error: any) {
      if (error.response && error.response.data && error.response.data.message) {
        showAlert('Perhatian', error.response.data.message, 'error');
      } else {
        showAlert('Kesalahan Koneksi', 'Gagal terhubung ke server.', 'error');
      }
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={styles.messageRow}>
      <View style={styles.patientBubbleBox}>
        <LinearGradient colors={['#1abc9c', '#00796b']} style={styles.patientBubble}>
          <Text style={styles.patientText}>{item.pesan}</Text>
          <Text style={styles.timeText}>{item.tanggal.split(' ')[1].substring(0, 5)}</Text>
        </LinearGradient>
      </View>

      {item.pesan_balasan && (
        <Animated.View entering={FadeInDown} style={styles.adminBubbleBox}>
          <View style={styles.adminAvatar}>
            <Image source={require('../../assets/images/logors.png')} style={styles.miniLogo} />
          </View>
          <View style={styles.adminBubble}>
            <Text style={styles.adminName}>Tim Customer Service Rumah Sakit</Text>
            <Text style={styles.adminText}>{item.pesan_balasan}</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* 1. VIBRANT HEADER */}
      <View style={styles.headerBackground}>
        <LinearGradient colors={['#004d40', '#00796b', '#1abc9c']} style={StyleSheet.absoluteFill} />
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitleBox}>
             <Text style={styles.headerTitle}>Layanan Pengaduan</Text>
             <Text style={styles.headerStatus}>Pusat Bantuan Digital E-Pasien</Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        {loading && !refreshing ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#00796b" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.listPadding}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => {
              // Otomatis gulir ke bawah saat isi daftar bertambah panjang
              flatListRef.current?.scrollToEnd({ animated: true });
            }}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00796b']} />
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="chatbubbles-outline" size={80} color="#e0f2f1" />
                <Text style={styles.emptyTitle}>Ada yang bisa kami bantu?</Text>
                <Text style={styles.emptyDesc}>Kirimkan saran, kritik, atau keluhan Anda. Kami siap mendengarkan.</Text>
              </View>
            }
          />
        )}
      </View>

      {/* 2. MODERN INPUT BAR */}
      <View style={styles.inputBar}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Tulis pesan Anda..."
            placeholderTextColor="#90a4ae"
            value={inputText}
            onChangeText={setInputText}
            onFocus={() => setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 300)}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendBtn, !inputText.trim() && { opacity: 0.5 }]} 
            onPress={sendMessage}
            disabled={sending || !inputText.trim()}
          >
            {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={22} color="#fff" />}
          </TouchableOpacity>
        </View>
      </View>

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
  container: {
    flex: 1,
    backgroundColor: '#f8fdfc',
  },
  headerBackground: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
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
  content: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listPadding: {
    padding: 20,
    paddingBottom: 40,
  },
  messageRow: {
    marginBottom: 25,
    backgroundColor: 'transparent',
  },
  patientBubbleBox: {
    alignItems: 'flex-end',
    backgroundColor: 'transparent',
  },
  patientBubble: {
    padding: 15,
    borderRadius: 22,
    borderTopRightRadius: 4,
    maxWidth: '85%',
    elevation: 3,
    shadowColor: '#00796b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  patientText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 22,
  },
  timeText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 5,
    textAlign: 'right',
  },
  adminBubbleBox: {
    flexDirection: 'row',
    marginTop: 15,
    alignItems: 'flex-end',
    backgroundColor: 'transparent',
  },
  adminAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    elevation: 4,
  },
  miniLogo: {
    width: 20,
    height: 20,
  },
  adminBubble: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 22,
    borderTopLeftRadius: 4,
    maxWidth: '80%',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: '#f1f1f1',
  },
  adminName: {
    fontSize: 10,
    fontWeight: '900',
    color: '#00796b',
    marginBottom: 5,
    letterSpacing: 1,
  },
  adminText: {
    color: '#37474f',
    fontSize: 15,
    lineHeight: 22,
  },
  inputBar: {
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#f1f1f1',
    paddingBottom: Platform.OS === 'ios' ? 35 : 15,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 25,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#f1f1f1',
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#263238',
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00796b',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  empty: {
    alignItems: 'center',
    marginTop: 80,
    backgroundColor: 'transparent',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#263238',
    marginTop: 20,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#90a4ae',
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 40,
    lineHeight: 22,
  },
});
