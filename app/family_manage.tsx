import React, { useState, useCallback } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Dimensions, Platform, StatusBar, Image, Alert, Modal } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import api from '../services/api';
import CustomAlert from '../components/CustomAlert';

const { width } = Dimensions.get('window');

export default function FamilyManageScreen() {
  const router = useRouter();
  const [family, setFamily] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  
  const [alert, setAlert] = useState({ 
    visible: false, 
    title: '', 
    message: '', 
    type: 'info' as 'info' | 'success' | 'error' | 'warning',
    showConfirm: false,
    onConfirm: () => {}
  });

  const showAlert = (title: string, message: string, type: 'info' | 'success' | 'error' | 'warning', showConfirm = false, onConfirm = () => {}) => {
    setAlert({ visible: true, title, message, type, showConfirm, onConfirm });
  };

  const fetchFamily = useCallback(async () => {
    try {
      const res = await api.get('/get_family.php');
      if (res.data.status === 'success') {
        setFamily(res.data.data);
      }
    } catch (e) {
      console.error('Gagal mengambil data keluarga:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchFamily();
    }, [fetchFamily])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchFamily();
  };

  const handleUnlink = (member: any) => {
    setShowActionModal(false);
    setTimeout(() => {
      showAlert(
        'Hapus Tautan',
        `Apakah Anda yakin ingin menghapus tautan keluarga dengan ${member.nm_pasien}? Anda tidak dapat mendaftarkan antrean untuk beliau jika tautan dihapus.`,
        'warning',
        true,
        async () => {
          setAlert(prev => ({ ...prev, visible: false }));
          setDeleting(true);
          try {
            const res = await api.post('/delete_family.php', { no_rkm_medis: member.no_rkm_medis });
            if (res.data.status === 'success') {
              showAlert('Berhasil', res.data.message, 'success');
              fetchFamily();
            } else {
              showAlert('Gagal', res.data.message, 'error');
            }
          } catch (e) {
            showAlert('Error', 'Terjadi kesalahan sistem.', 'error');
          } finally {
            setDeleting(false);
          }
        }
      );
    }, 500);
  };

  const handleMemberClick = (member: any) => {
    setSelectedMember(member);
    setShowActionModal(true);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* HEADER IDENTIK DENGAN PENGADUAN */}
      <View style={styles.headerBackground}>
        <LinearGradient colors={['#004d40', '#00796b', '#1abc9c']} style={StyleSheet.absoluteFill} />
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitleBox}>
            <Text style={styles.headerTitle}>Kelola Keluarga</Text>
            <Text style={styles.headerStatus}>Pusat Manajemen Profil Keluarga</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00796b']} />}
      >
        <View style={styles.topSection}>
          <Text style={styles.sectionDesc}>Kelola profil kesehatan orang tersayang dalam satu akun untuk kemudahan pendaftaran antrean.</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#00796b" style={{ marginTop: 50 }} />
        ) : family.length === 0 ? (
          <Animated.View entering={FadeInDown} style={styles.emptyCard}>
            <MaterialCommunityIcons name="account-group-outline" size={80} color="#e0f2f1" />
            <Text style={styles.emptyTitle}>Belum Ada Anggota</Text>
            <Text style={styles.emptyDesc}>Daftarkan anggota keluarga Anda untuk memudahkan proses pendaftaran antrean.</Text>
          </Animated.View>
        ) : (
          family.map((item, index) => (
            <Animated.View key={item.no_rkm_medis} entering={FadeInDown.delay(index * 100)} style={styles.familyCard}>
              <TouchableOpacity 
                style={styles.cardInner} 
                activeOpacity={0.7}
                onPress={() => handleMemberClick(item)}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.avatarCircle}>
                    <FontAwesome5 name={item.jk === 'L' ? 'user-alt' : 'female'} size={24} color="#00796b" />
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{item.nm_pasien}</Text>
                    <View style={styles.badgeRow}>
                      <View style={styles.hubunganBadge}>
                        <Text style={styles.hubunganText}>{item.hubungan.toUpperCase()}</Text>
                      </View>
                      <Text style={styles.rmText}>RM: {item.no_rkm_medis}</Text>
                    </View>
                  </View>
                  <Ionicons name="ellipsis-vertical" size={20} color="#cfd8dc" />
                </View>
                
                <View style={styles.cardDivider} />
                
                <View style={styles.cardFooter}>
                  <View style={styles.infoItem}>
                    <Ionicons name="calendar-outline" size={14} color="#78909c" />
                    <Text style={styles.infoValue}>{new Date(item.tgl_lahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Ionicons name="card-outline" size={14} color="#78909c" />
                    <Text style={styles.infoValue}>{item.no_ktp ? item.no_ktp.replace(/(\d{4})\d{8}(\d{4})/, '$1********$2') : '-'}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))
        )}

        <TouchableOpacity 
          style={styles.addBtn} 
          onPress={() => router.push('/family_add' as any)}
        >
          <LinearGradient colors={['#1abc9c', '#00796b']} style={styles.btnGradient}>
            <Ionicons name="add-circle-outline" size={24} color="#fff" />
            <Text style={styles.btnText}>TAMBAH ANGGOTA KELUARGA</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        showConfirm={alert.showConfirm}
        onConfirm={alert.onConfirm}
        onClose={() => setAlert(prev => ({ ...prev, visible: false }))}
      />

      {/* ACTION MODAL KUSTOM */}
      <Modal visible={showActionModal} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowActionModal(false)}
        >
          <Animated.View entering={FadeInDown} style={styles.actionModal}>
            <View style={styles.actionHeader}>
              <View style={styles.avatarCircleLarge}>
                <FontAwesome5 
                  name={selectedMember?.jk === 'L' ? 'user-alt' : 'female'} 
                  size={32} 
                  color="#00796b" 
                />
              </View>
              <Text style={styles.actionTitle}>{selectedMember?.nm_pasien}</Text>
              <Text style={styles.actionSubtitle}>{selectedMember?.hubungan.toUpperCase()} • RM: {selectedMember?.no_rkm_medis}</Text>
            </View>

            <View style={styles.actionBody}>
              {selectedMember?.hubungan !== 'Diri Sendiri' && (
                <TouchableOpacity 
                  style={styles.actionBtn} 
                  onPress={() => {
                    setShowActionModal(false);
                    router.push({
                      pathname: '/family_detail',
                      params: { data: JSON.stringify(selectedMember) }
                    } as any);
                  }}
                >
                  <Ionicons name="person-outline" size={20} color="#00796b" />
                  <Text style={styles.actionBtnText}>Lihat Profil Lengkap</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={[styles.actionBtn, styles.unlinkBtn]} 
                onPress={() => handleUnlink(selectedMember)}
              >
                <Ionicons name="link-outline" size={20} color="#ff5252" />
                <Text style={styles.unlinkBtnText}>Hapus Tautan (Unlink)</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.closeActionBtn} onPress={() => setShowActionModal(false)}>
                <Text style={styles.closeActionText}>Tutup</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {deleting && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#00796b" />
        </View>
      )}
    </View>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  topSection: {
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  sectionDesc: {
    fontSize: 13,
    color: '#78909c',
    lineHeight: 20,
    marginLeft: 5,
  },
  familyCard: {
    backgroundColor: '#fff',
    borderRadius: 25,
    marginBottom: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  cardInner: {
    padding: 18,
    backgroundColor: 'transparent',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e0f2f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  memberInfo: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#263238',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: 'transparent',
  },
  hubunganBadge: {
    backgroundColor: '#00796b',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 8,
  },
  hubunganText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#fff',
  },
  rmText: {
    fontSize: 11,
    color: '#78909c',
    fontWeight: '600',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#f5f5f5',
    marginVertical: 15,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  infoValue: {
    fontSize: 12,
    color: '#546e7a',
    marginLeft: 6,
    fontWeight: '500',
  },
  emptyCard: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    borderStyle: 'dashed',
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
  },
  addBtn: {
    marginTop: 10,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#1abc9c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  btnGradient: {
    height: 60,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  btnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  // ACTION MODAL STYLES
  actionModal: {
    width: width * 0.85,
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 25,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  actionHeader: {
    alignItems: 'center',
    marginBottom: 25,
    backgroundColor: 'transparent',
  },
  avatarCircleLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e0f2f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#263238',
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#78909c',
    marginTop: 4,
    fontWeight: '600',
  },
  actionBody: {
    gap: 12,
    backgroundColor: 'transparent',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f8f7',
    padding: 16,
    borderRadius: 18,
    gap: 12,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#00796b',
  },
  unlinkBtn: {
    backgroundColor: '#fff5f5',
  },
  unlinkBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ff5252',
  },
  closeActionBtn: {
    marginTop: 10,
    padding: 10,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  closeActionText: {
    color: '#90a4ae',
    fontSize: 14,
    fontWeight: 'bold',
  }
});
