import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, Alert, Dimensions, Image, StatusBar, Platform, Modal, View as RNView, Linking, ActivityIndicator } from 'react-native';
import { Text, View } from '@/components/Themed';
import * as SecureStore from 'expo-secure-store';
import { useRouter, useFocusEffect } from 'expo-router';
import { FontAwesome5, MaterialCommunityIcons, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp, FadeInRight } from 'react-native-reanimated';
import QRCode from 'react-native-qrcode-svg';
import * as ScreenOrientation from 'expo-screen-orientation';
import api from '@/services/api';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync, savePushToken } from '../../services/notification';


const { width, height } = Dimensions.get('window');

// PENGELOMPOKAN MENU BERDASARKAN PETA FITUR BARU
// 8 MENU UNGGULAN YANG TAMPIL DI BERANDA
const FEATURED_MENUS = [
  { id: 'antrian', title: 'Booking Antrian', icon: 'calendar-clock', color: '#00c853', desc: 'Booking Poli', route: '/booking_antrian' },
  { id: 'antrian_realtime', title: 'Antrian Live', icon: 'monitor-dashboard', color: '#ff1744', desc: 'Pantau Antrean', route: '/queue_dashboard' },
  { id: 'gejala_ai', title: 'Tanya Gejala AI', icon: 'robot', color: '#1abc9c', desc: 'Analisa Gejala', route: '/gejala_ai' },
  { id: 'rm', title: 'Resume Medis', icon: 'clipboard-pulse', color: '#2979ff', desc: 'Data Klinis', route: '/resume_medis' },
  { id: 'lab', title: 'Hasil Lab', icon: 'flask-round-bottom', color: '#651fff', desc: 'Hasil Lab', route: '/lab_selection' },
  { id: 'rad', title: 'Hasil Radiologi', icon: 'image-filter-black-white', color: '#00bfa5', desc: 'Hasil Rontgen', route: '/radiologi_selection' },
  { id: 'resep_digital', title: 'Resep Digital', icon: 'pill', color: '#ff9100', desc: 'E-Resep', route: '/resep_selection' },
  { id: 'health_tracker', title: 'Health Tracker', icon: 'heart-pulse', color: '#e91e63', desc: 'Monitor Vital', route: '/health_tracker' },
];

// URL Behold.so (Menggunakan feed media sosial rumah sakit)
const BEHOLD_URL = "https://feeds.behold.so/AX766tgLwtTttD7XLGh0";

const HEALTH_INSIGHTS = [
  { id: 1, title: 'Menjaga Imunitas di Musim Hujan', image: 'https://images.unsplash.com/photo-1505751172107-16d7a46e9690?q=80&w=400&auto=format&fit=crop', category: 'Tips Sehat' },
  { id: 2, title: 'Layanan Vaksinasi Booster 2026', image: 'https://images.unsplash.com/photo-1576091160550-2173dad99968?q=80&w=400&auto=format&fit=crop', category: 'Informasi' },
];

export default function DashboardScreen() {
  const [user, setUser] = useState<any>(null);
  const [greeting, setGreeting] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [igPosts, setIgPosts] = useState<any[]>([]);
  const [loadingIg, setLoadingIg] = useState(true);
  const [notifCount, setNotifCount] = useState(0);
  const [showLandscapeCard, setShowLandscapeCard] = useState(false);
  const [lastAlertedDate, setLastAlertedDate] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadUserData();
    updateGreeting();
    fetchIgPosts();
    
    // Refresh notif every 30 seconds for background updates
    const interval = setInterval(fetchNotificationSummary, 30000);
    return () => clearInterval(interval);
  }, []);

  // Refresh notif seketika saat halaman Beranda difokuskan (kembali dari halaman lain)
  useFocusEffect(
    React.useCallback(() => {
      loadUserData();
      fetchNotificationSummary();
      fetchIgPosts();
    }, [])
  );

  const fetchIgPosts = async () => {
    try {
      setLoadingIg(true);
      if (!BEHOLD_URL || BEHOLD_URL.includes("YOUR_API_KEY")) {
        setLoadingIg(false);
        return;
      }
      const response = await fetch(BEHOLD_URL);
      const data = await response.json();
      const posts = data.posts || data;
      setIgPosts(Array.isArray(posts) ? posts.slice(0, 6) : []);
    } catch (error) {
      console.log('Error fetching IG posts:', error);
    } finally {
      setLoadingIg(false);
    }
  };

  const fetchNotificationSummary = async () => {
    try {
      const response = await api.get('/get_notifications_summary.php');
      if (response.data.status === 'success') {
        const data = response.data.data;
        
        // Ikon lonceng di Beranda sekarang murni HANYA untuk Pengumuman baru
        let count = 0;
        
        const userDataStr = await SecureStore.getItemAsync('userData');
        const userData = userDataStr ? JSON.parse(userDataStr) : null;
        const userScope = userData ? (userData.no_rkm_medis || userData.username || 'guest') : 'guest';

        const lastSeenAnn = await SecureStore.getItemAsync(`last_seen_announcement_date_${userScope}`);
        if (data.latest_announcement_date && (!lastSeenAnn || data.latest_announcement_date > lastSeenAnn)) {
          count = 1; 

          // Trigger Notifikasi Pop-up HANYA JIKA belum pernah diberitahukan untuk tanggal ini
          if (data.latest_announcement_date !== lastAlertedDate) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: '📢 Pengumuman Baru',
                body: 'Ada informasi terbaru untuk Anda. Silakan cek di pusat informasi.',
                data: { url: '/announcements' },
                sound: true,
                priority: Notifications.AndroidNotificationPriority.MAX,
              },
              trigger: null,
            });
            setLastAlertedDate(data.latest_announcement_date);
          }
        }
        
        setNotifCount(count);
      }
    } catch (e) {
      // console.log("Gagal ambil summary notif");
    }
  };

  const loadUserData = async () => {
    try {
      const data = await SecureStore.getItemAsync('userData');
      if (data) {
        setUser(JSON.parse(data));
        // Sinkronisasi Push Token otomatis setiap kali memuat halaman beranda
        try {
          const token = await registerForPushNotificationsAsync();
          if (token) {
            await savePushToken(token);
          }
        } catch (tokenError) {
          console.log("Gagal registrasi push token di beranda:", tokenError);
        }
      } else {
        router.replace('/login');
      }
    } catch (error) {
      router.replace('/login');
    }
  };

  const updateGreeting = () => {
    const hours = new Date().getHours();
    if (hours >= 5 && hours < 11) setGreeting('Selamat Pagi');
    else if (hours >= 11 && hours < 15) setGreeting('Selamat Siang');
    else if (hours >= 15 && hours < 18) setGreeting('Selamat Sore');
    else setGreeting('Selamat Malam');
  };

  const toggleLandscapeCard = async (visible: boolean) => {
    if (visible) await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);
    else await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    setShowLandscapeCard(visible);
  };

  if (!user) return <View style={styles.loading} />;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* 1. VIBRANT IMMERSIVE HEADER */}
      <View style={styles.headerBackground}>
        <LinearGradient colors={['#004d40', '#00796b', '#1abc9c']} style={StyleSheet.absoluteFill} />
        <View style={[styles.blob, { top: -60, right: -60, backgroundColor: '#1abc9c' }]} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* 2. USER PROFILE HEADER */}
        <Animated.View entering={FadeInDown.duration(800)} style={styles.userHeader}>
          <View style={styles.userInfo}>
            <Text style={styles.greetingText}>{greeting},</Text>
            <Text style={styles.userNameText}>{user?.nm_pasien || user?.nama_lengkap || 'Pasien'}</Text>
          </View>
          <TouchableOpacity style={styles.notifyBtn} onPress={() => router.push('/announcements')}>
            <Ionicons name="notifications" size={24} color="#fff" />
            {notifCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{notifCount > 9 ? '9+' : notifCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* 3. DIGITAL CARD - ULTIMATE ABSOLUTE PREMIUM */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.cardContainer}>
          <TouchableOpacity activeOpacity={0.9} onPress={() => toggleLandscapeCard(true)}>
            <RNView style={styles.cardWrapper}>
              <LinearGradient 
                colors={['#000000', '#1a1a1a', '#2c3e50']} 
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.digitalId}
              >
                {/* 3D Reflection Streak */}
                <LinearGradient
                  colors={['transparent', 'rgba(255,255,255,0.08)', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />

                <RNView style={styles.cardTop}>
                  <RNView style={styles.cardLogo}>
                    <RNView style={styles.logoCircle}>
                      <Image source={require('../../assets/images/logors.png')} style={styles.miniLogo} />
                    </RNView>
                    <RNView style={{ marginLeft: 12 }}>
                      <Text style={styles.rsTitle}>RUMAH SAKIT STANDARD</Text>
                      <Text style={styles.cardSubTitle}>HOSPITAL DIGITAL IDENTITY</Text>
                    </RNView>
                  </RNView>
                  <RNView style={styles.chipWrapper}>
                    <MaterialCommunityIcons name="integrated-circuit-chip" size={38} color="#FFD700" />
                  </RNView>
                </RNView>
                
                <RNView style={styles.cardMid}>
                  <RNView style={styles.labelRow}>
                    <Text style={styles.idLabel}>PATIENT MEDICAL RECORD</Text>
                    <RNView style={styles.securityPill}>
                      <Ionicons name="shield-checkmark" size={10} color="#FFD700" />
                      <Text style={styles.securityText}>SECURE ID</Text>
                    </RNView>
                  </RNView>
                  <Text style={styles.idValue}>{user?.no_rkm_medis || 'BELUM TERTAUT'}</Text>
                </RNView>

                <RNView style={styles.cardBottom}>
                  <RNView style={{ flex: 1 }}>
                    <Text style={styles.idLabel}>OFFICIAL PATIENT NAME</Text>
                    <Text style={styles.idName} numberOfLines={1}>{(user?.nm_pasien || user?.nama_lengkap || 'PASIEN').toUpperCase()}</Text>
                    <RNView style={styles.statusContainer}>
                      <RNView style={[styles.onlineDot, { backgroundColor: user?.no_rkm_medis ? '#00e676' : '#ffb74d' }]} />
                      <Text style={styles.statusText}>{user?.no_rkm_medis ? 'VERIFIED SYSTEM ACCESS' : 'AKUN BELUM TERTAUT RM'}</Text>
                    </RNView>
                  </RNView>
                  <TouchableOpacity onPress={() => setShowQrModal(true)} style={styles.qrGlassWrapper}>
                    <QRCode 
                      value={user?.no_rkm_medis || user?.username || 'GUEST'} 
                      size={55} 
                      color="black" 
                      backgroundColor="white"
                      logo={require('../../assets/images/logors.png')}
                      logoSize={15}
                      logoBackgroundColor="white"
                      logoBorderRadius={4}
                    />
                  </TouchableOpacity>
                </RNView>
              </LinearGradient>
            </RNView>
          </TouchableOpacity>
        </Animated.View>

        {/* 4. TOP 8 FEATURED SERVICES */}
        <Animated.View 
          entering={FadeInDown.delay(300)} 
          style={styles.section}
        >
          <Text style={styles.sectionHeader}>FITUR UNGGULAN</Text>
          <View style={styles.serviceGrid}>
            {FEATURED_MENUS.map((item, index) => (
              <View key={item.id} style={styles.serviceItem}>
                <TouchableOpacity 
                  style={styles.serviceBtn}
                  onPress={() => {
                    if (item.route) {
                      router.push(item.route);
                    } else {
                      Alert.alert('E-Pasien', `Layanan ${item.title} sedang disiapkan.`);
                    }
                  }}
                >
                  <View style={[styles.iconBox, { backgroundColor: item.color + '10' }]}>
                    <MaterialCommunityIcons name={item.icon as any} size={28} color={item.color} />
                  </View>
                  <Text style={styles.serviceLabel} numberOfLines={1}>{item.title}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* SEE ALL BUTTON */}
          <TouchableOpacity 
            style={styles.seeAllBtn}
            onPress={() => router.push('/all_menus')}
          >
            <Text style={styles.seeAllText}>LIHAT SEMUA LAYANAN</Text>
            <Ionicons name="arrow-forward-circle" size={20} color="#00796b" />
          </TouchableOpacity>
        </Animated.View>

        {/* 4.5 INSTAGRAM FEED WIDGET (Cara 3: Native Live via Behold.so) */}
        <Animated.View entering={FadeInDown.delay(500)} style={styles.section}>
          <View style={styles.igHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'transparent' }}>
              <LinearGradient
                colors={['#f09433', '#e6683c', '#dc2743', '#cc2366', '#bc1888']}
                style={styles.igIconCircle}
              >
                <Ionicons name="logo-instagram" size={14} color="#fff" />
              </LinearGradient>
              <View style={{ marginLeft: 10, backgroundColor: 'transparent' }}>
                <Text style={styles.igHandle}>@epasien_standard</Text>
                <Text style={styles.igStatus}>Update Real-time</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => Linking.openURL('https://instagram.com/epasien_standard')}>
              <Text style={styles.igFollowBtn}>IKUTI</Text>
            </TouchableOpacity>
          </View>

          {loadingIg ? (
            <View style={[styles.igCard, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5', width: '100%' }]}>
              <ActivityIndicator color="#1abc9c" />
              <Text style={{ marginTop: 10, fontSize: 12, color: '#999' }}>Menghubungkan ke Instagram...</Text>
            </View>
          ) : igPosts.length > 0 ? (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.igScroll}
              snapToInterval={width * 0.7 + 15}
              decelerationRate="fast"
            >
              {igPosts.map((post: any) => (
                <TouchableOpacity 
                  key={post.id} 
                  activeOpacity={0.9}
                  onPress={() => Linking.openURL(post.permalink)}
                  style={styles.igCard}
                >
                  <Image source={{ uri: post.mediaUrl }} style={styles.igImage} />
                  <View style={styles.igOverlay}>
                    <View style={styles.igPostHeader}>
                      <Ionicons name="heart" size={16} color="#ff5252" />
                      <Text style={styles.igLikes}>LIVE</Text>
                    </View>
                    <Text style={styles.igCaption} numberOfLines={4}>{post.caption || 'Lihat postingan di Instagram'}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.igCard, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5', width: '100%' }]}>
              <Ionicons name="logo-instagram" size={40} color="#ccc" />
              <Text style={{ marginTop: 10, fontSize: 12, color: '#999' }}>Postingan belum tersedia</Text>
            </View>
          )}
        </Animated.View>



        <View style={{ height: 120 }} />
      </ScrollView>

      {/* PREMIUM QR MODAL */}
      <Modal visible={showQrModal} transparent animationType="slide">
        <RNView style={styles.modalOverlay}>
          <TouchableOpacity 
            activeOpacity={1} 
            style={StyleSheet.absoluteFill} 
            onPress={() => setShowQrModal(false)} 
          />
          <Animated.View entering={FadeInDown} style={styles.modalCard}>
            <RNView style={styles.modalHeader}>
              <RNView style={styles.modalIconBox}>
                <Ionicons name="qr-code" size={24} color="#1abc9c" />
              </RNView>
              <RNView style={{ marginLeft: 15 }}>
                <Text style={styles.modalTitle}>VERIFIED PATIENT ID</Text>
                <Text style={styles.modalSubtitle}>Scan for internal medical access</Text>
              </RNView>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowQrModal(false)}>
                <Ionicons name="close" size={24} color="#ccc" />
              </TouchableOpacity>
            </RNView>

            <RNView style={styles.qrMainWrapper}>
              <RNView style={styles.qrInnerFrame}>
                <QRCode 
                  value={user?.no_rkm_medis || user?.username || 'GUEST'} 
                  size={220} 
                  color="black" 
                  backgroundColor="white"
                  logo={require('../../assets/images/logors.png')}
                  logoSize={55}
                  logoBackgroundColor="white"
                  logoBorderRadius={12}
                  logoMargin={2}
                />
              </RNView>
            </RNView>

            <RNView style={styles.modalFooter}>
              <RNView style={styles.patientInfoBox}>
                <Text style={styles.modalRmText}>{user?.no_rkm_medis || 'BELUM TERTAUT'}</Text>
                <Text style={styles.modalNameText}>{(user?.nm_pasien || user?.nama_lengkap || 'PASIEN').toUpperCase()}</Text>
              </RNView>
              
              <RNView style={styles.securityBadge}>
                <MaterialIcons name="security" size={14} color="#00e676" />
                <Text style={styles.securityBadgeText}>ENCRYPTED IDENTITY</Text>
              </RNView>
            </RNView>

            <TouchableOpacity style={styles.dismissBtn} onPress={() => setShowQrModal(false)}>
              <Text style={styles.dismissBtnText}>TUTUP</Text>
            </TouchableOpacity>
          </Animated.View>
        </RNView>
      </Modal>

      {/* LANDSCAPE ID MODAL */}
      <Modal visible={showLandscapeCard} transparent animationType="slide">
        <RNView style={styles.landscapeWrapper}>
          <LinearGradient 
            colors={['#000000', '#1a1a1a', '#2c3e50']} 
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.landscapeCard}
          >
            {/* Glossy Streak for Landscape */}
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.05)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />

            <TouchableOpacity style={styles.closeLand} onPress={() => toggleLandscapeCard(false)}>
              <Ionicons name="close-circle" size={40} color="rgba(255,255,255,0.3)" />
            </TouchableOpacity>
            
            <RNView style={styles.landContent}>
              <RNView style={{ flex: 1.5, justifyContent: 'center' }}>
                <RNView style={styles.landHeader}>
                  <RNView style={styles.landLogoBox}>
                    <Image source={require('../../assets/images/logors.png')} style={styles.landLogo} />
                  </RNView>
                  <RNView style={{ marginLeft: 20 }}>
                    <Text style={styles.landRsTitle}>RUMAH SAKIT E-PASIEN</Text>
                    <Text style={styles.landRsSub}>DIGITAL PATIENT IDENTITY CARD</Text>
                  </RNView>
                </RNView>

                <RNView style={styles.landBody}>
                  <RNView style={styles.landRow}>
                    <RNView style={{ flex: 1 }}>
                      <Text style={styles.landLabel}>MEDICAL RECORD NUMBER</Text>
                      <Text style={styles.landRmText}>{user?.no_rkm_medis || 'BELUM TERTAUT'}</Text>
                    </RNView>
                    <RNView style={styles.landChipBox}>
                      <MaterialCommunityIcons name="integrated-circuit-chip" size={50} color="#FFD700" />
                    </RNView>
                  </RNView>

                  <RNView style={{ marginTop: 20 }}>
                    <Text style={styles.landLabel}>FULL NAME</Text>
                    <Text style={styles.landNameText}>{(user?.nm_pasien || user?.nama_lengkap || 'PASIEN').toUpperCase()}</Text>
                  </RNView>

                  <RNView style={styles.landDetailRow}>
                    <RNView>
                      <Text style={styles.landLabel}>NIK NUMBER</Text>
                      <Text style={styles.landValText}>{user?.no_ktp || '-'}</Text>
                    </RNView>
                    <RNView style={{ marginLeft: 40 }}>
                      <Text style={styles.landLabel}>SEX / GENDER</Text>
                      <Text style={styles.landValText}>{user?.jk === 'L' ? 'LAKI-LAKI' : (user?.jk === 'P' ? 'PEREMPUAN' : '-')}</Text>
                    </RNView>
                    <RNView style={styles.landSecurityPill}>
                      <Ionicons name="shield-checkmark" size={14} color="#FFD700" />
                      <Text style={styles.landSecurityText}>{user?.no_rkm_medis ? 'OFFICIAL' : 'UNVERIFIED'}</Text>
                    </RNView>
                  </RNView>
                </RNView>
              </RNView>

              <RNView style={styles.landQrSide}>
                <RNView style={styles.landQrGlass}>
                  <QRCode 
                    value={user?.no_rkm_medis || user?.username || 'GUEST'} 
                    size={180} 
                    color="black" 
                    backgroundColor="white"
                    logo={require('../../assets/images/logors.png')}
                    logoSize={45}
                    logoBackgroundColor="white"
                    logoBorderRadius={10}
                    logoMargin={2}
                  />
                </RNView>
                <Text style={styles.landScanInfo}>SCAN FOR HOSPITAL VERIFICATION</Text>
              </RNView>
            </RNView>
          </LinearGradient>
        </RNView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fdfc',
  },
  loading: {
    flex: 1,
    backgroundColor: '#004d40',
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
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
  },
  scrollContent: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    marginBottom: 20,
  },
  userInfo: {
    backgroundColor: 'transparent',
  },
  greetingText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  userNameText: {
    fontSize: 22,
    color: '#fff',
    fontWeight: 'bold',
  },
  notifyBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#ff5252',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00796b',
    paddingHorizontal: 2,
  },
  notifBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  cardContainer: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  cardWrapper: {
    borderRadius: 32,
    backgroundColor: '#000',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  digitalId: {
    borderRadius: 30,
    padding: 22,
    height: 230,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    borderTopColor: 'rgba(255,255,255,0.25)',
    borderLeftColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: 'transparent',
  },
  chipWrapper: {
    transform: [{ rotate: '90deg' }],
    opacity: 0.9,
  },
  cardLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  logoCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  miniLogo: {
    width: 28,
    height: 28,
  },
  rsTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
  },
  cardSubTitle: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: -2,
  },
  cardMid: {
    marginTop: 15,
    backgroundColor: 'transparent',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  securityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  securityText: {
    fontSize: 7,
    color: '#FFD700',
    fontWeight: '900',
    marginLeft: 3,
    letterSpacing: 1,
  },
  idLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  idValue: {
    fontSize: 42,
    color: '#fff',
    fontWeight: '900',
    letterSpacing: 3,
    marginTop: -5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 'auto',
    backgroundColor: 'transparent',
  },
  idName: {
    fontSize: 19,
    color: '#fff',
    fontWeight: '800',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    backgroundColor: 'transparent',
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00e676',
    marginRight: 6,
    shadowColor: '#00e676',
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  statusText: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  qrGlassWrapper: {
    padding: 6,
    backgroundColor: '#fff',
    borderRadius: 14,
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 30,
    marginHorizontal: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#00796b',
    letterSpacing: 1,
    marginRight: 8,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '900',
    color: '#90a4ae',
    letterSpacing: 1.5,
    marginBottom: 15,
  },
  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    backgroundColor: 'transparent',
    marginTop: 10,
  },
  serviceItem: {
    width: '25%', // Pasti 4 kolom
    alignItems: 'center',
    marginBottom: 20,
  },
  serviceBtn: {
    alignItems: 'center',
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#455a64',
    textAlign: 'center',
  },
  // INSTAGRAM WIDGET STYLES
  igHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: 'transparent',
  },
  igIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  igHandle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#263238',
  },
  igStatus: {
    fontSize: 9,
    color: '#90a4ae',
    fontWeight: '600',
    marginTop: -2,
  },
  igFollowBtn: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0095f6',
  },
  igScroll: {
    paddingBottom: 5,
  },
  igCard: {
    width: width * 0.75,
    height: 280,
    borderRadius: 25,
    marginRight: 15,
    backgroundColor: '#000',
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  igImage: {
    width: '100%',
    height: '100%',
    opacity: 0.9,
  },
  igOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  igPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  igLikes: {
    fontSize: 13,
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 6,
  },
  igCaption: {
    fontSize: 12,
    color: '#fff',
    lineHeight: 18,
    fontWeight: '500',
  },
  carousel: {
    backgroundColor: 'transparent',
  },
  newsCard: {
    width: 280,
    height: 160,
    borderRadius: 25,
    marginRight: 15,
    overflow: 'hidden',
    elevation: 5,
  },
  newsImg: {
    width: '100%',
    height: '100%',
  },
  newsOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
    padding: 15,
    justifyContent: 'flex-end',
  },
  newsTag: {
    fontSize: 10,
    color: '#1abc9c',
    fontWeight: 'bold',
  },
  newsTitle: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    padding: 25,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 40,
    padding: 25,
    elevation: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
    backgroundColor: 'transparent',
  },
  modalIconBox: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: 'rgba(26,188,156,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#333',
    letterSpacing: 0.5,
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
    marginTop: 2,
  },
  modalCloseBtn: {
    marginLeft: 'auto',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrMainWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    backgroundColor: 'transparent',
  },
  qrInnerFrame: {
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    elevation: 5,
  },
  qrScanLine: {
    position: 'absolute',
    width: '90%',
    height: 2,
    backgroundColor: 'rgba(26,188,156,0.3)',
    borderRadius: 1,
    top: '50%',
  },
  modalFooter: {
    marginTop: 25,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  patientInfoBox: {
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  modalRmText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1abc9c',
    letterSpacing: 2,
  },
  modalNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginTop: 4,
    textAlign: 'center',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    backgroundColor: '#f8fdfc',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0f2f1',
  },
  securityBadgeText: {
    fontSize: 9,
    color: '#00e676',
    fontWeight: '900',
    marginLeft: 8,
    letterSpacing: 1,
  },
  dismissBtn: {
    marginTop: 30,
    backgroundColor: '#f5f5f5',
    height: 55,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#999',
    letterSpacing: 1.5,
  },
  landscapeWrapper: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  landscapeCard: {
    flex: 1,
    padding: 40,
    flexDirection: 'row',
  },
  closeLand: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
  },
  landContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  landHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    backgroundColor: 'transparent',
  },
  landLogoBox: {
    width: 60,
    height: 60,
    borderRadius: 15,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
  },
  landLogo: {
    width: 40,
    height: 40,
  },
  landRsTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 2,
  },
  landRsSub: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  landBody: {
    backgroundColor: 'transparent',
  },
  landRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  landLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  landRmText: {
    fontSize: 54,
    color: '#fff',
    fontWeight: '900',
    letterSpacing: 4,
    marginTop: -5,
  },
  landChipBox: {
    transform: [{ rotate: '90deg' }],
  },
  landNameText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '800',
    letterSpacing: 1,
  },
  landDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 25,
    backgroundColor: 'transparent',
  },
  landValText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
    marginTop: 2,
  },
  landSecurityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
    marginLeft: 'auto',
  },
  landSecurityText: {
    fontSize: 10,
    color: '#FFD700',
    fontWeight: '900',
    marginLeft: 6,
    letterSpacing: 1,
  },
  landQrSide: {
    flex: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  landQrGlass: {
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 20,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
  },
  landScanInfo: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: 'bold',
    marginTop: 15,
    letterSpacing: 2,
  },
});
