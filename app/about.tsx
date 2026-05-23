import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, Image, Linking, Platform, Dimensions, StatusBar, View as RNView, Modal, TextInput, ActivityIndicator } from 'react-native';
import { Text, View } from '@/components/Themed';
import { Ionicons, MaterialIcons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp, SlideInUp } from 'react-native-reanimated';
import api from '@/services/api';
import * as SecureStore from 'expo-secure-store';
import CustomAlert from '@/components/CustomAlert';

const { width, height } = Dimensions.get('window');

const REVIEW_CATEGORIES = [
  "Kemudahan Penggunaan",
  "Kecepatan Aplikasi",
  "Tampilan / UI",
  "Keakuratan Layanan",
  "Lainnya / Saran"
];

export default function AboutScreen() {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    pasien: 0,
    faskes: '100+',
    rating: '0.0',
    total_ulasan: 0,
    list_ulasan: [] as any[],
    rating_breakdown: { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 } as Record<string, number>
  });

  // Modals State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showListUlasanModal, setShowListUlasanModal] = useState(false);

  // Form State
  const [rating, setRating] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Alert State
  const [alert, setAlert] = useState({ visible: false, title: '', message: '', type: 'info' as 'info' | 'success' | 'error' });

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setAlert({ visible: true, title, message, type });
  };

  useEffect(() => {
    fetchStats();
    loadUser();
  }, []);

  const loadUser = async () => {
    const data = await SecureStore.getItemAsync('userData');
    if (data) setUser(JSON.parse(data));
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/get_stats.php');
      if (response.data.status === 'success') {
        const data = response.data.data;
        setStats({
          pasien: data.pasien || 0,
          faskes: data.faskes_mitra || '100+',
          rating: data.rating || '0.0',
          total_ulasan: data.total_ulasan || 0,
          list_ulasan: data.list_ulasan || [],
          rating_breakdown: data.rating_breakdown || { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 }
        });
      }
    } catch (e: any) {
      console.error("Gagal ambil statistik:", e);
    }
  };

  const handleSubmitReview = async () => {
    if (rating === 0) return showAlert("Perhatian", "Silakan berikan rating bintang terlebih dahulu.", "info");
    if (!selectedCategory) return showAlert("Perhatian", "Silakan pilih kategori ulasan.", "info");
    if (comment.trim().length < 5) return showAlert("Perhatian", "Harap berikan komentar atau saran minimal 5 karakter.", "info");

    setSubmitting(true);
    try {
      const response = await api.post('/send_ulasan.php', {
        rating,
        kategori: selectedCategory,
        komentar: comment,
        no_rkm_medis: user?.no_rkm_medis || null
      });

      if (response.data.status === 'success') {
        showAlert("Terima Kasih", response.data.message, "success");
        setShowReviewModal(false);
        setRating(0);
        setSelectedCategory("");
        setComment("");
        fetchStats();
      } else {
        showAlert("Gagal", response.data.message, "error");
      }
    } catch (e: any) {
      if (e.response && e.response.status === 401) {
        showAlert("Sesi Berakhir", "Sesi login Anda telah habis. Silakan login kembali untuk mengirim ulasan.", "error");
      } else {
        showAlert("Kesalahan", "Gagal mengirim ulasan ke server. Harap periksa koneksi internet Anda.", "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch(err => console.error("Error", err));
  };

  return (
    <RNView style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <RNView style={styles.headerBackground}>
        <LinearGradient colors={['#004d40', '#00796b', '#1abc9c']} style={StyleSheet.absoluteFill} />
        <RNView style={[styles.blob, { top: -40, right: -40, backgroundColor: '#1abc9c' }]} />
      </RNView>

      <RNView style={styles.navbar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tentang Aplikasi</Text>
        <RNView style={{ width: 40 }} />
      </RNView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        <Animated.View entering={FadeInDown.duration(600)} style={styles.heroCard}>
          <RNView style={styles.appIconContainer}>
            <Image
              source={require('../assets/images/logors.png')}
              style={styles.logoImg}
              resizeMode="contain"
            />
          </RNView>
          <Text style={styles.appName}>E-Pasien</Text>
          <Text style={styles.tagline}>
            Solusi kesehatan digital terpadu untuk pasien Indonesia — aman, cepat, dan terpercaya.
          </Text>
          <RNView style={styles.badgeRow}>
            <RNView style={[styles.badge, { backgroundColor: '#e3f2fd' }]}>
              <Text style={[styles.badgeText, { color: '#1976d2' }]}>v.2.0.0</Text>
            </RNView>
          </RNView>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200)} style={styles.statsRow}>
          <StatCard value={stats.pasien.toLocaleString('id-ID')} label="Pasien Terdaftar E-Pasien" color="#1976d2" />
          <StatCard value={stats.faskes} label="Faskes mitra" color="#2e7d32" />
          <TouchableOpacity onPress={() => setShowListUlasanModal(true)}>
            <StatCard
              value={stats.rating}
              label={`Rating E-Pasien\n(${stats.total_ulasan} ulasan)`}
              color="#ef6c00"
              hasAction
            />
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.sectionTitle}>INFORMASI APLIKASI</Text>
        <RNView style={styles.groupCard}>
          <AccordionItem
            id="visi"
            icon="bullseye-arrow"
            iconColor="#2196f3"
            title="Visi & Misi"
            sub="Tujuan dan nilai kami"
            content={
              <RNView>
                 <Text style={styles.expandTextBold}>Visi Rumah Sakit</Text>
                 <Text style={styles.expandText}>“Terwujudnya pelayanan kesehatan digital terpercaya dan profesional bagi seluruh lapisan masyarakat”</Text>
                 <Text style={[styles.expandTextBold, { marginTop: 15 }]}>Misi Rumah Sakit</Text>
                <Text style={styles.expandText}>• Menjadikan Islam sebagai pedoman aktifitas rumah sakit</Text>
                <Text style={styles.expandText}>• Memberikan layanan bermutu dengan akhlakul karimah</Text>
                <Text style={styles.expandText}>• Meningkatkan kualitas sumber daya manusia sesuai kompetensi</Text>
                <Text style={styles.expandText}>• Mengoptimalkan dan melengkapi sarana dan prasarana</Text>
                <Text style={styles.expandText}>• Mendorong Rumah Sakit untuk tumbuh dan berkembang</Text>
                <Text style={styles.expandText}>• Menciptakan rasa Aman dan Nyaman di lingkungan Rumah Sakit</Text>
              </RNView>
            }
            expandedId={expandedId}
            onToggle={toggleExpand}
          />
          <Divider />
          <AccordionItem
            id="tim"
            icon="account-group"
            iconColor="#673ab7"
            title="Tim pengembang"
            sub="Orang-orang di balik E-Pasien"
            content={
              <RNView>
                <Text style={styles.expandText}>1. Ivanofiq Adami Aji, S.Kom (Pengembang Utama)</Text>
                <Text style={styles.expandText}>2. Mustafiah (Kontributor Ide)</Text>
                <RNView style={styles.poweredByBox}>
                  <Text style={styles.poweredByText}>Powered By </Text>
                  <MaterialCommunityIcons name="creation" size={16} color="#4285F4" />
                  <Text style={styles.poweredByTextBold}> Agent AI Google Gemini</Text>
                </RNView>
              </RNView>
            }
            expandedId={expandedId}
            onToggle={toggleExpand}
          />
          <Divider />
          <AccordionItem
            id="legal"
            icon="check-decagram"
            iconColor="#4caf50"
            title="Legalitas & sertifikasi"
            sub="Kominfo, BPOM, PERMENKES"
            content="Aplikasi ini telah memenuhi standar regulasi kesehatan digital sesuai dengan peraturan PERMENKES dan perundang-undangan yang berlaku di Indonesia."
            badge="Terverifikasi"
            badgeColor="#e8f5e9"
            badgeTextColor="#2e7d32"
            expandedId={expandedId}
            onToggle={toggleExpand}
          />
        </RNView>

        <Text style={styles.sectionTitle}>KEAMANAN & PRIVASI</Text>
        <RNView style={styles.groupCard}>
          <AccordionItem id="privasi" icon="lock-outline" iconColor="#1e88e5" title="Kebijakan privasi" sub="UU PDP No. 27/2022" content="Data Anda aman bersama kami." expandedId={expandedId} onToggle={toggleExpand} />
          <Divider />
          <AccordionItem id="syarat" icon="file-document-outline" iconColor="#546e7a" title="Syarat & ketentuan" sub="Diperbarui 1 Jan 2025" content="Penggunaan aplikasi tunduk pada syarat dan ketentuan." expandedId={expandedId} onToggle={toggleExpand} />
          <Divider />
          <AccordionItem id="hak" icon="clock-outline" iconColor="#43a047" title="Hak pengguna atas data" sub="Akses, koreksi, hapus data" content="Anda berhak mengakses, memperbaiki, dan meminta penghapusan data." expandedId={expandedId} onToggle={toggleExpand} />
          <Divider />
          <AccordionItem id="security" icon="alert-octagon-outline" iconColor="#e53935" title="Laporkan kerentanan" sub="Bug bounty & responsible disclosure" content="Kami sangat menghargai keamanan." badge="Security" badgeColor="#ffebee" badgeTextColor="#c62828" expandedId={expandedId} onToggle={toggleExpand} />
        </RNView>

        <Text style={styles.sectionTitle}>BANTUAN & KONTAK</Text>
        <RNView style={styles.groupCard}>
          <AccordionItem id="kontak" icon="message-outline" iconColor="#00897b" title="Hubungi kami" sub="Informasi kontak & Sosial media"
            content={
              <RNView>
                <ContactRow icon="phone" label="Pendaftaran: 085713146025" onPress={() => openLink('tel:085713146025')} />
                <ContactRow icon="whatsapp" label="IGD: 081575540540" color="#25D366" onPress={() => openLink('https://wa.me/6281575540540')} />
                 <ContactRow icon="email-outline" label="support@epasien-standard.com" onPress={() => openLink('mailto:support@epasien-standard.com')} />
              </RNView>
            }
            expandedId={expandedId}
            onToggle={toggleExpand}
          />
          <Divider />
          <ListItem icon="star-outline" iconColor="#ffb300" title="Beri ulasan" sub="Bantu kami berkembang" hasChevron onPress={() => setShowReviewModal(true)} />
        </RNView>

        <RNView style={styles.quoteCard}>
          <Text style={styles.quoteText}>"Kami percaya setiap warga Indonesia berhak mendapat akses layanan kesehatan yang mudah, aman, dan bermartabat."</Text>
           <Text style={styles.quoteAuthor}>— Civitas Hospital E-Pasien Standard</Text>
        </RNView>

        <RNView style={styles.integrasiSection}>
          <Text style={styles.integrasiTitle}>Terintegrasi & didukung oleh</Text>
          <RNView style={styles.logoPartnerRow}>
            <Image source={require('../assets/images/logo_kemenkes.png')} style={styles.partnerLogo} resizeMode="contain" />
            <Image source={require('../assets/images/logo_bpjs.png')} style={styles.partnerLogo} resizeMode="contain" />
            <Image source={require('../assets/images/logo_dukcapil.png')} style={styles.partnerLogo} resizeMode="contain" />
            <Image source={require('../assets/images/logo_gemini.png')} style={styles.partnerLogo} resizeMode="contain" />
          </RNView>
        </RNView>

        <RNView style={styles.footer}>
           <Text style={styles.footerText}>E-Pasien v.2.0.0 - © 2026 E-Pasien Standard</Text>
        </RNView>
        <RNView style={{ height: 50 }} />
      </ScrollView>

      {/* MODAL: INPUT ULASAN */}
      <Modal visible={showReviewModal} animationType="slide" transparent>
        <RNView style={styles.modalOverlay}>
          <Animated.View entering={SlideInUp} style={styles.bottomModal}>
            <RNView style={styles.modalHandle} />
            <RNView style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Beri Ulasan Aplikasi</Text>
              <TouchableOpacity 
                onPress={() => setShowReviewModal(false)}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                style={{ padding: 6 }}
              >
                <Ionicons name="close" size={24} color="#546e7a" />
              </TouchableOpacity>
            </RNView>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              <RNView style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <TouchableOpacity key={s} onPress={() => setRating(s)}>
                    <Ionicons name={rating >= s ? "star" : "star-outline"} size={40} color={rating >= s ? "#ffb300" : "#cfd8dc"} style={{ marginHorizontal: 5 }} />
                  </TouchableOpacity>
                ))}
              </RNView>
              <Text style={styles.inputLabel}>Pilih Kategori Ulasan</Text>
              <RNView style={styles.categoryRow}>
                {REVIEW_CATEGORIES.map((cat) => (
                  <TouchableOpacity key={cat} style={[styles.catChip, selectedCategory === cat && styles.catChipActive]} onPress={() => setSelectedCategory(cat)}>
                    <Text style={[styles.catText, selectedCategory === cat && styles.catTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </RNView>
              <TextInput style={styles.commentInput} placeholder="Tuliskan pengalaman atau saran Anda..." multiline value={comment} onChangeText={setComment} />
              <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.7 }]} onPress={handleSubmitReview} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Kirim Ulasan</Text>}
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </RNView>
      </Modal>

      {/* MODAL: LIST ULASAN */}
      <Modal visible={showListUlasanModal} animationType="slide" transparent>
        <RNView style={styles.modalOverlay}>
          <Animated.View entering={SlideInUp} style={styles.bottomModal}>
            <RNView style={styles.modalHandle} />
            <RNView style={styles.modalHeader}>
              <RNView>
                <Text style={styles.modalTitle}>Ulasan Pengguna</Text>
                <Text style={styles.modalSubtitle}>{stats.total_ulasan} Total Ulasan • Rating {stats.rating}</Text>
              </RNView>
              <TouchableOpacity 
                onPress={() => setShowListUlasanModal(false)}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                style={{ padding: 6 }}
              >
                <Ionicons name="close" size={24} color="#546e7a" />
              </TouchableOpacity>
            </RNView>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
              {/* Rating Breakdown Section */}
              <RNView style={styles.breakdownContainer}>
                <RNView style={styles.breakdownLeft}>
                  <Text style={styles.bigRating}>{stats.rating}</Text>
                  <RNView style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Ionicons key={s} name={Math.floor(Number(stats.rating)) >= s ? "star" : "star-outline"} size={14} color="#ffb300" />
                    ))}
                  </RNView>
                  <Text style={styles.totalUlasanText}>{stats.total_ulasan} ulasan</Text>
                </RNView>
                <RNView style={styles.breakdownRight}>
                  {['5', '4', '3', '2', '1'].map((r) => {
                    const count = stats.rating_breakdown[r] || 0;
                    const percent = stats.total_ulasan > 0 ? (count / stats.total_ulasan) * 100 : 0;
                    return (
                      <RNView key={r} style={styles.breakdownBarRow}>
                        <Text style={styles.barLabel}>{r}</Text>
                        <RNView style={styles.barBg}>
                          <RNView style={[styles.barFill, { width: `${percent}%` }]} />
                        </RNView>
                      </RNView>
                    );
                  })}
                </RNView>
              </RNView>

              <Divider />
              <Text style={styles.recentReviewsTitle}>Ulasan Terbaru</Text>

              {stats.list_ulasan.length > 0 ? (
                stats.list_ulasan.map((item, index) => (
                  <RNView key={index} style={styles.reviewCard}>
                    <RNView style={styles.reviewHeader}>
                      <Text style={styles.reviewName}>{item.nama}</Text>
                      <Text style={styles.reviewDate}>{item.tanggal || 'Baru saja'}</Text>
                    </RNView>
                    <RNView style={styles.reviewStars}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Ionicons key={s} name={item.rating >= s ? "star" : "star-outline"} size={12} color={item.rating >= s ? "#ffb300" : "#cfd8dc"} style={{ marginRight: 2 }} />
                      ))}
                      <Text style={styles.reviewCategory}> • {item.kategori}</Text>
                    </RNView>
                    <Text style={styles.reviewComment}>{item.komentar ? `"${item.komentar}"` : "Memberikan rating bintang"}</Text>
                  </RNView>
                ))
              ) : (
                <Text style={{ textAlign: 'center', marginVertical: 30, color: '#90a4ae' }}>Belum ada ulasan</Text>
              )}
            </ScrollView>
          </Animated.View>
        </RNView>
      </Modal>

      <CustomAlert visible={alert.visible} title={alert.title} message={alert.message} type={alert.type} onClose={() => setAlert({ ...alert, visible: false })} />
    </RNView>
  );
}

// SUB-COMPONENTS
function StatCard({ value, label, color, hasAction }: any) {
  return (
    <RNView style={[styles.statCard, hasAction && { borderColor: color + '40', borderStyle: 'dashed' }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {hasAction && (
        <RNView style={{ marginTop: 5, flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 9, color, fontWeight: '700' }}>LIHAT DETAIL</Text>
          <Ionicons name="chevron-forward" size={10} color={color} />
        </RNView>
      )}
    </RNView>
  );
}

function AccordionItem({ id, icon, iconColor, title, sub, content, badge, badgeColor, badgeTextColor, expandedId, onToggle }: any) {
  const isExpanded = expandedId === id;
  return (
    <RNView>
      <TouchableOpacity style={styles.listItem} onPress={() => onToggle(id)}>
        <RNView style={[styles.listIconBox, { backgroundColor: iconColor + '15' }]}><MaterialCommunityIcons name={icon} size={24} color={iconColor} /></RNView>
        <RNView style={{ flex: 1 }}><Text style={styles.listTitle}>{title}</Text><Text style={styles.listSub}>{sub}</Text></RNView>
        <MaterialIcons name={isExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"} size={24} color="#cfd8dc" />
      </TouchableOpacity>
      {isExpanded && <Animated.View entering={FadeInUp} style={styles.expandContent}>{typeof content === 'string' ? <Text style={styles.expandText}>{content}</Text> : content}</Animated.View>}
    </RNView>
  );
}

function ContactRow({ icon, label, onPress, color = "#546e7a" }: any) {
  return (
    <TouchableOpacity style={styles.contactRow} onPress={onPress}>
      <MaterialCommunityIcons name={icon} size={18} color={color} />
      <Text style={[styles.contactLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ListItem({ icon, iconColor, title, sub, hasChevron, onPress }: any) {
  return (
    <TouchableOpacity style={styles.listItem} onPress={onPress}>
      <RNView style={[styles.listIconBox, { backgroundColor: iconColor + '15' }]}><MaterialCommunityIcons name={icon} size={24} color={iconColor} /></RNView>
      <RNView style={{ flex: 1 }}><Text style={styles.listTitle}>{title}</Text><Text style={styles.listSub}>{sub}</Text></RNView>
      {hasChevron && <MaterialIcons name="chevron-right" size={24} color="#cfd8dc" />}
    </TouchableOpacity>
  );
}

function Divider() { return <RNView style={styles.divider} />; }
function Chip({ label }: { label: string }) { return <RNView style={styles.chip}><Text style={styles.chipText}>{label}</Text></RNView>; }

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fbfc' },
  headerBackground: { height: 180, width: '100%', position: 'absolute', top: 0 },
  blob: { position: 'absolute', width: 200, height: 200, borderRadius: 100, opacity: 0.2 },
  navbar: { height: Platform.OS === 'ios' ? 100 : 80, paddingTop: Platform.OS === 'ios' ? 50 : 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, zIndex: 10 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  scrollContent: { padding: 20 },
  heroCard: { backgroundColor: '#fff', borderRadius: 30, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: '#eceff1', marginBottom: 20, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
  appIconContainer: { width: 90, height: 90, borderRadius: 25, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 20, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.1, shadowRadius: 10 },
  logoImg: { width: 65, height: 65 },
  appName: { fontSize: 26, fontWeight: '800', color: '#263238', marginBottom: 15 },
  tagline: { fontSize: 15, color: '#546e7a', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  badgeRow: { flexDirection: 'row', gap: 10 },
  badge: { paddingHorizontal: 15, paddingVertical: 6, borderRadius: 15 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  statCard: { width: (width - 60) / 3, backgroundColor: '#fff', borderRadius: 20, padding: 15, alignItems: 'center', borderWidth: 1, borderColor: '#eceff1', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
  statValue: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  statLabel: { fontSize: 10, color: '#78909c', textAlign: 'center' },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#90a4ae', marginBottom: 15, marginLeft: 5 },
  groupCard: { backgroundColor: '#fff', borderRadius: 25, paddingHorizontal: 5, borderWidth: 1, borderColor: '#eceff1', marginBottom: 30, overflow: 'hidden' },
  listItem: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  listIconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  listTitle: { fontSize: 15, fontWeight: '700', color: '#263238' },
  listSub: { fontSize: 12, color: '#78909c', marginTop: 2 },
  expandContent: { paddingHorizontal: 20, paddingBottom: 20, paddingLeft: 74 },
  expandText: { fontSize: 13, color: '#546e7a', lineHeight: 20 },
  expandTextBold: { fontSize: 13, color: '#263238', fontWeight: 'bold' },
  poweredByBox: { flexDirection: 'row', alignItems: 'center', marginTop: 10, backgroundColor: '#f5f5f5', padding: 8, borderRadius: 10, alignSelf: 'flex-start' },
  poweredByText: { fontSize: 11, color: '#78909c' },
  poweredByTextBold: { fontSize: 11, color: '#4285F4', fontWeight: 'bold' },
  contactRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  contactLabel: { fontSize: 13, marginLeft: 10, fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#eceff1', marginHorizontal: 15 },
  quoteCard: { backgroundColor: '#fff', borderRadius: 25, padding: 25, borderWidth: 1, borderColor: '#eceff1', marginBottom: 30 },
  quoteText: { fontSize: 14, color: '#546e7a', fontStyle: 'italic', lineHeight: 22, marginBottom: 15 },
  quoteAuthor: { fontSize: 12, color: '#90a4ae', fontWeight: '600' },
  integrasiSection: { backgroundColor: '#fff', borderRadius: 25, padding: 25, borderWidth: 1, borderColor: '#eceff1', marginBottom: 30 },
  integrasiTitle: { fontSize: 14, fontWeight: '700', color: '#546e7a', marginBottom: 15 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { backgroundColor: '#f5f5f5', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#e0e0e0' },
  chipText: { fontSize: 12, fontWeight: '700', color: '#455a64' },
  footer: { alignItems: 'center', paddingBottom: 40 },
  footerText: { fontSize: 11, color: '#90a4ae', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  bottomModal: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: height * 0.9 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#263238' },
  modalSubtitle: { fontSize: 12, color: '#90a4ae' },
  starsContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 30 },
  inputLabel: { fontSize: 13, fontWeight: '800', color: '#90a4ae', marginBottom: 10 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  catChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#e0e0e0' },
  catChipActive: { backgroundColor: '#e0f2f1', borderColor: '#00796b' },
  catText: { fontSize: 12, color: '#455a64', fontWeight: '600' },
  catTextActive: { color: '#00796b' },
  commentInput: { backgroundColor: '#f8fbfc', borderRadius: 15, padding: 15, fontSize: 14, color: '#263238', borderWidth: 1, borderColor: '#eceff1', height: 100, marginBottom: 25 },
  submitBtn: { backgroundColor: '#00796b', height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  reviewItem: { padding: 15 },
  reviewName: { fontSize: 14, fontWeight: '700', color: '#263238' },
  reviewDate: { fontSize: 11, color: '#90a4ae' },
  reviewStars: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  reviewCategory: { fontSize: 11, color: '#00796b', fontWeight: '600' },
  reviewComment: { fontSize: 13, color: '#546e7a', lineHeight: 18 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  breakdownContainer: { flexDirection: 'row', paddingVertical: 20, alignItems: 'center', marginBottom: 10 },
  breakdownLeft: { alignItems: 'center', width: '35%', borderRightWidth: 1, borderRightColor: '#eceff1' },
  bigRating: { fontSize: 48, fontWeight: '800', color: '#263238' },
  starsRow: { flexDirection: 'row', marginVertical: 5 },
  totalUlasanText: { fontSize: 12, color: '#90a4ae' },
  breakdownRight: { flex: 1, paddingLeft: 20 },
  breakdownBarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  barLabel: { fontSize: 11, color: '#78909c', width: 10, marginRight: 8, fontWeight: '700' },
  barBg: { flex: 1, height: 6, backgroundColor: '#f0f0f0', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#ffb300', borderRadius: 3 },
  recentReviewsTitle: { fontSize: 14, fontWeight: '800', color: '#263238', marginVertical: 15 },
  reviewCard: { backgroundColor: '#f8fbfc', padding: 15, borderRadius: 15, marginBottom: 10, borderWidth: 1, borderColor: '#eceff1' },
  modalHandle: { width: 40, height: 5, backgroundColor: '#eceff1', borderRadius: 3, alignSelf: 'center', marginBottom: 10 },
  logoPartnerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 15, gap: 8 },
  partnerLogo: { width: (width - 96) / 4, height: 48 },
});
