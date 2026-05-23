import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, Dimensions, Modal, ActivityIndicator, Platform, StatusBar, Image } from 'react-native';
import { Text, View } from '@/components/Themed';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { FontAwesome5, MaterialIcons, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import api from '../../services/api';
import CustomAlert from '../../components/CustomAlert';
import CustomDatePicker from '../../components/CustomDatePicker';
import QRCode from 'react-native-qrcode-svg';
import * as Device from 'expo-device';

const { width, height } = Dimensions.get('window');

export default function ProfilScreen() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const router = useRouter();

  // Edit State
  const [editData, setEditData] = useState({
    jk: '',
    tmp_lahir: '',
    tgl_lahir: '',
    alamat: '',
    gol_darah: '',
    no_tlp: '',
    email: ''
  });

  // Pickers State
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [showGoldarPicker, setShowGoldarPicker] = useState(false);
  const [showNikahPicker, setShowNikahPicker] = useState(false);
  const [showAgamaPicker, setShowAgamaPicker] = useState(false);
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);

  // Link RM State
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showLinkDatePicker, setShowLinkDatePicker] = useState(false);
  const [linkData, setLinkData] = useState({ no_rkm_medis: '', tgl_lahir: '', no_ktp: '' });
  const [linking, setLinking] = useState(false);
  const [alert, setAlert] = useState({ 
    visible: false, 
    title: '', 
    message: '', 
    type: 'info' as 'info' | 'success' | 'error' | 'warning',
    showConfirm: false,
    onConfirm: () => {}
  });

  const showAlert = (
    title: string, 
    message: string, 
    type: 'success' | 'error' | 'info' | 'warning' = 'info',
    showConfirm: boolean = false,
    onConfirm: () => void = () => {}
  ) => {
    setAlert({ visible: true, title, message, type, showConfirm, onConfirm });
  };

  const formatViewDate = (dateString: string) => {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateString;
  };

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const data = await SecureStore.getItemAsync('userData');
      if (data) {
        const parsed = JSON.parse(data);
        setUser(parsed);
        setEditData({
          jk: parsed.jk || '',
          tmp_lahir: parsed.tmp_lahir || '',
          tgl_lahir: parsed.tgl_lahir || '',
          alamat: parsed.alamat || '',
          gol_darah: parsed.gol_darah || '',
          no_tlp: parsed.no_tlp || '',
          email: parsed.email || ''
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const response = await api.post('/update_profile.php', {
        no_rkm_medis: user.no_rkm_medis,
        ...editData
      });

      if (response.data.status === 'success') {
        const updatedUser = { ...user, ...editData };
        await SecureStore.setItemAsync('userData', JSON.stringify(updatedUser));
        setUser(updatedUser);
        setIsEditing(false);
        showAlert('Berhasil', 'Data profil Anda telah diperbarui.', 'success');
      } else {
        showAlert('Gagal', response.data.message, 'error');
      }
    } catch (e) {
      showAlert('Kesalahan', 'Gagal menghubungi server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    showAlert(
      'Konfirmasi Keluar', 
      'Apakah Anda yakin ingin keluar dari aplikasi E-Pasien?', 
      'warning',
      true,
      async () => {
        try {
          const deviceInfo = `${Device.brand} ${Device.modelName} (${Platform.OS})`;
          await api.post('/logout.php', { device_info: deviceInfo });
        } catch (e) {
          console.log('Logout log failed');
        }
        await SecureStore.deleteItemAsync('userToken');
        await SecureStore.deleteItemAsync('userData');
        setAlert(prev => ({ ...prev, visible: false }));
        router.replace('/login');
      }
    );
  };

  const handleLinkRM = async () => {
    if (!linkData.no_rkm_medis || !linkData.tgl_lahir || !linkData.no_ktp) {
      showAlert('Perhatian', 'Harap isi Nomor RM, NIK KTP, dan Tanggal Lahir Anda.', 'info');
      return;
    }
    
    setLinking(true);
    try {
      const response = await api.post('/tautkan_rm.php', linkData);
      if (response.data.status === 'success') {
        const linkedData = response.data.data;
        const updatedUser = { ...user, ...linkedData };
        await SecureStore.setItemAsync('userData', JSON.stringify(updatedUser));
        setUser(updatedUser);
        
        // Reset and refresh edit data
        setEditData({
          jk: linkedData.jk || '',
          tmp_lahir: linkedData.tmp_lahir || '',
          tgl_lahir: linkedData.tgl_lahir || '',
          alamat: linkedData.alamat || '',
          gol_darah: linkedData.gol_darah || '',
          no_tlp: linkedData.no_tlp || '',
          email: linkedData.email || ''
        });

        setShowLinkModal(false);
        setLinkData({ no_rkm_medis: '', tgl_lahir: '', no_ktp: '' });
        showAlert('Berhasil', 'Rekam medis berhasil ditautkan!', 'success');
      } else {
        showAlert('Gagal', response.data.message, 'error');
      }
    } catch (e: any) {
      showAlert('Kesalahan', e.response?.data?.message || 'Terjadi kesalahan sistem.', 'error');
    } finally {
      setLinking(false);
    }
  };

  if (!user) return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* 1. VIBRANT FULL COLOR HEADER */}
      <View style={styles.headerBackground}>
        <LinearGradient colors={['#004d40', '#00796b', '#1abc9c']} style={StyleSheet.absoluteFill} />
        <View style={[styles.blob, { top: -40, right: -40, backgroundColor: '#1abc9c' }]} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* 2. PROFILE HERO */}
        <Animated.View entering={FadeInDown.duration(800)} style={styles.profileHero}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarCircle}>
              <FontAwesome5 name={user.jk === 'L' ? 'user-tie' : 'user-nurse'} size={50} color="#00796b" />
              {user.no_rkm_medis && (
                <View style={styles.verifiedCheck}>
                  <MaterialCommunityIcons name="check-decagram" size={20} color="#2196f3" />
                </View>
              )}
            </View>
            <TouchableOpacity style={styles.editBadge} onPress={() => setIsEditing(!isEditing)}>
              <MaterialIcons name={isEditing ? "close" : "edit"} size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>{user.nm_pasien || user.nama_lengkap}</Text>
          
          {user.no_rkm_medis ? (
            <View style={styles.premiumRMContainer}>
              <LinearGradient colors={['#00796b', '#004d40']} style={styles.premiumRMGradient}>
                <MaterialCommunityIcons name="shield-check" size={14} color="#00e676" />
                <Text style={styles.premiumRMText}>MEDICAL RECORD: {user.no_rkm_medis}</Text>
              </LinearGradient>
            </View>
          ) : (
            <View style={[styles.rmPill, { backgroundColor: '#ff5252' }]}>
              <Text style={styles.rmText}>BELUM TERTAUT RM</Text>
            </View>
          )}
        </Animated.View>

        {/* 3. VIBRANT DATA LISTATAU WARNING BANNER */}
        {!user.no_rkm_medis ? (
          <Animated.View entering={FadeInDown.delay(300)} style={styles.warningCard}>
            <View style={styles.warningIconBox}>
              <MaterialIcons name="warning" size={40} color="#ffb74d" />
            </View>
            <Text style={styles.warningTitle}>Akun Belum Lengkap</Text>
            <Text style={styles.warningDesc}>
              Untuk dapat menggunakan layanan reservasi dan pengaduan, akun ini harus ditautkan dengan Rekam Medis Rumah Sakit.
            </Text>
            <TouchableOpacity style={styles.linkRmBtn} onPress={() => setShowLinkModal(true)}>
              <Text style={styles.linkRmText}>Tautkan Rekam Medis Sekarang</Text>
              <MaterialIcons name="arrow-forward" size={18} color="#fff" style={{marginLeft: 5}} />
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <>
            <Animated.View entering={FadeInDown.delay(300)} style={styles.dataCard}>
              <View style={styles.cardHeaderRow}>
                <MaterialCommunityIcons name="account-details" size={22} color="#00796b" />
                <Text style={styles.cardHeader}>DATA PERSONAL</Text>
              </View>
            
            <DataRow label="NIK (KTP)" value={user.no_ktp} icon="id-card" color="#40c4ff" />
            <EditableRow 
              label="JENIS KELAMIN" 
              value={editData.jk === 'L' ? 'LAKI-LAKI' : 'PEREMPUAN'} 
              icon="venus-mars" 
              color="#00e676" 
              isEditing={isEditing}
              onPress={() => setShowGenderPicker(true)}
            />
            <EditableInput 
              label="TEMPAT LAHIR" 
              value={editData.tmp_lahir} 
              icon="map-marker-alt" 
              color="#ffb74d" 
              isEditing={isEditing}
              onChangeText={(text: string) => setEditData({...editData, tmp_lahir: text})}
            />
            <EditableRow 
              label="TANGGAL LAHIR" 
              value={formatViewDate(editData.tgl_lahir)} 
              icon="calendar-alt" 
              color="#f06292" 
              isEditing={isEditing}
              onPress={() => setShowEditDatePicker(true)}
            />
            <EditableInput 
              label="ALAMAT LENGKAP" 
              value={editData.alamat} 
              icon="home" 
              color="#ba68c8" 
              isEditing={isEditing}
              multiline
              onChangeText={(text: string) => setEditData({...editData, alamat: text})}
            />
            <EditableRow 
              label="GOLONGAN DARAH" 
              value={editData.gol_darah || '-'} 
              icon="tint" 
              color="#ef5350" 
              isEditing={isEditing}
              onPress={() => setShowGoldarPicker(true)}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(500)} style={styles.dataCard}>
            <View style={styles.cardHeaderRow}>
              <MaterialCommunityIcons name="shield-outline" size={22} color="#00796b" />
              <Text style={styles.cardHeader}>ASURANSI & PESERTA</Text>
            </View>
            <DataRow label="NOMOR PESERTA (BPJS)" value={user.no_peserta || '-'} icon="id-card-alt" color="#1abc9c" />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(500)} style={[styles.dataCard, { marginBottom: 20 }]}>
            <View style={styles.cardHeaderRow}>
              <MaterialIcons name="contact-phone" size={22} color="#00796b" />
              <Text style={styles.cardHeader}>KONTAK & SOSIAL</Text>
            </View>
            <EditableInput 
              label="NOMOR TELEPON" 
              value={editData.no_tlp} 
              icon="phone" 
              color="#4db6ac" 
              isEditing={isEditing}
              keyboardType="phone-pad"
              onChangeText={(text: string) => setEditData({...editData, no_tlp: text})}
            />
            <EditableInput 
              label="ALAMAT EMAIL" 
              value={editData.email} 
              icon="envelope" 
              color="#64b5f6" 
              isEditing={isEditing}
              keyboardType="email-address"
              onChangeText={(text: string) => setEditData({...editData, email: text})}
            />
          </Animated.View>
          </>
        )}

        {/* 4. ACTIONS */}
        {isEditing && (
          <TouchableOpacity style={styles.updateBtn} onPress={handleUpdate} disabled={loading}>
            <LinearGradient colors={['#1abc9c', '#00796b']} style={styles.btnGradient}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>SIMPAN PERUBAHAN</Text>}
            </LinearGradient>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.aboutBtn} onPress={() => router.push('/family_manage' as any)}>
          <MaterialCommunityIcons name="account-group" size={20} color="#00796b" />
          <Text style={styles.aboutBtnText}>Kelola Anggota Keluarga</Text>
          <MaterialIcons name="chevron-right" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.aboutBtn} onPress={() => router.push('/about')}>
          <MaterialIcons name="info" size={20} color="#00796b" />
          <Text style={styles.aboutBtnText}>Tentang Aplikasi</Text>
          <MaterialIcons name="chevron-right" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={20} color="#ff5252" />
          <Text style={styles.logoutText}>Keluar Akun</Text>
        </TouchableOpacity>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* LINK RM MODAL */}
      <Modal visible={showLinkModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { width: '90%' }]}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
              <Text style={{fontSize: 18, fontWeight: 'bold', color: '#263238'}}>Tautkan Rekam Medis</Text>
              <TouchableOpacity onPress={() => setShowLinkModal(false)}>
                <MaterialIcons name="close" size={24} color="#90a4ae" />
              </TouchableOpacity>
            </View>
            
            <Text style={{fontSize: 12, color: '#78909c', marginBottom: 20, lineHeight: 18}}>
              Demi keamanan data medis, silakan masukkan detail autentikasi Anda di bawah ini dengan benar.
            </Text>

            <View style={styles.inputGroup}>
              <MaterialIcons name="credit-card" size={20} color="#00796b" style={{marginRight: 10}} />
              <TextInput 
                style={styles.modalInput} 
                placeholder="Nomor Rekam Medis (RM)" 
                placeholderTextColor="#b0bec5"
                value={linkData.no_rkm_medis}
                onChangeText={(val) => setLinkData({...linkData, no_rkm_medis: val})}
              />
            </View>

            <View style={styles.inputGroup}>
              <MaterialIcons name="badge" size={20} color="#00796b" style={{marginRight: 10}} />
              <TextInput 
                style={styles.modalInput} 
                placeholder="Nomor KTP (NIK)" 
                placeholderTextColor="#b0bec5"
                keyboardType="numeric"
                value={linkData.no_ktp}
                onChangeText={(val) => setLinkData({...linkData, no_ktp: val})}
              />
            </View>

            <View style={styles.inputGroup}>
              <FontAwesome5 name="calendar-alt" size={18} color="#00796b" style={{marginRight: 12}} />
              <TouchableOpacity 
                style={{ flex: 1, height: '100%', justifyContent: 'center' }} 
                onPress={() => setShowLinkDatePicker(true)}
              >
                <Text style={{ fontSize: 15, color: linkData.tgl_lahir ? '#263238' : '#b0bec5', fontWeight: '600' }}>
                  {linkData.tgl_lahir ? formatViewDate(linkData.tgl_lahir) : 'Pilih Tanggal Lahir'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.updateBtn, {marginTop: 10, marginHorizontal: 0}]} onPress={handleLinkRM} disabled={linking}>
              <LinearGradient colors={['#1abc9c', '#00796b']} style={[styles.btnGradient, {height: 50}]}>
                {linking ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>VERIFIKASI & TAUTKAN</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        showConfirm={alert.showConfirm}
        onConfirm={alert.onConfirm}
        onClose={() => setAlert({ ...alert, visible: false })}
        confirmText={alert.showConfirm ? (alert.type === 'warning' ? "KELUAR" : "OKE") : "OKE"}
      />

      {/* PICKER MODALS */}
      <CustomPicker 
        visible={showGenderPicker} 
        onClose={() => setShowGenderPicker(false)} 
        onSelect={(val: string) => setEditData({...editData, jk: val})}
        options={[{label: 'LAKI-LAKI', value: 'L'}, {label: 'PEREMPUAN', value: 'P'}]}
      />
      
      <CustomPicker 
        visible={showGoldarPicker} 
        onClose={() => setShowGoldarPicker(false)} 
        onSelect={(val: string) => setEditData({...editData, gol_darah: val})}
        options={['A', 'B', 'AB', 'O'].map(v => ({label: v, value: v}))}
      />

      <CustomPicker 
        visible={showNikahPicker} 
        onClose={() => setShowNikahPicker(false)} 
        onSelect={(val: string) => setEditData({...editData, stts_nikah: val})}
        options={['BELUM MENIKAH', 'MENIKAH', 'DUDA', 'JANDA'].map(v => ({label: v, value: v}))}
      />

      <CustomPicker 
        visible={showAgamaPicker} 
        onClose={() => setShowAgamaPicker(false)} 
        onSelect={(val: string) => setEditData({...editData, agama: val})}
        options={['ISLAM', 'KRISTEN', 'KATHOLIK', 'HINDU', 'BUDHA', 'KONGHUCU'].map(v => ({label: v, value: v}))}
      />

      <CustomDatePicker 
        visible={showLinkDatePicker}
        onClose={() => setShowLinkDatePicker(false)}
        onSelect={(date) => setLinkData({...linkData, tgl_lahir: date})}
        initialDate={linkData.tgl_lahir}
      />

      <CustomDatePicker 
        visible={showEditDatePicker}
        onClose={() => setShowEditDatePicker(false)}
        onSelect={(date) => setEditData({...editData, tgl_lahir: date})}
        initialDate={editData.tgl_lahir}
      />

    </View>
  );
}

// PREMIUM SUB-COMPONENTS
function DataRow({ label, value, icon, color }: any) {
  return (
    <View style={styles.row}>
      <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
        <FontAwesome5 name={icon} size={16} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

function EditableRow({ label, value, icon, color, isEditing, onPress }: any) {
  return (
    <TouchableOpacity style={styles.row} disabled={!isEditing} onPress={onPress}>
      <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
        <FontAwesome5 name={icon} size={16} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={[styles.rowValue, isEditing && { color: '#00796b', textDecorationLine: 'underline' }]}>{value}</Text>
      </View>
      {isEditing && <MaterialIcons name="arrow-drop-down" size={24} color="#00796b" />}
    </TouchableOpacity>
  );
}

function EditableInput({ label, value, icon, color, isEditing, ...props }: any) {
  return (
    <View style={styles.row}>
      <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
        <FontAwesome5 name={icon} size={16} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {isEditing ? (
          <TextInput 
            style={styles.inputField} 
            value={value} 
            placeholderTextColor="#ccc"
            {...props} 
          />
        ) : (
          <Text style={styles.rowValue}>{value}</Text>
        )}
      </View>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function CustomPicker({ visible, onClose, onSelect, options }: any) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.modalCard}>
          {options.map((opt: any) => (
            <TouchableOpacity key={opt.value} style={styles.pickerItem} onPress={() => { onSelect(opt.value); onClose(); }}>
              <Text style={styles.pickerText}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fdfc',
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 280,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    opacity: 0.3,
  },
  scrollContent: {
    paddingTop: 60,
  },
  profileHero: {
    alignItems: 'center',
    marginBottom: 30,
    backgroundColor: 'transparent',
  },
  avatarWrapper: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    position: 'relative',
  },
  avatarCircle: {
    flex: 1,
    borderRadius: 50,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#00796b',
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 15,
  },
  rmPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 8,
  },
  rmText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
  },
  cardHeader: {
    fontSize: 14,
    fontWeight: '900',
    color: '#00796b',
    letterSpacing: 1,
    marginLeft: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 10,
  },
  dataCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 25,
    padding: 20,
    marginBottom: 15,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  rowLabel: {
    fontSize: 10,
    color: '#90a4ae',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  rowValue: {
    fontSize: 15,
    color: '#263238',
    fontWeight: '600',
    marginTop: 2,
  },
  inputField: {
    fontSize: 15,
    color: '#00796b',
    fontWeight: 'bold',
    borderBottomWidth: 1,
    borderBottomColor: '#1abc9c',
    paddingVertical: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#f5f5f5',
    marginLeft: 55,
  },
  updateBtn: {
    marginHorizontal: 20,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    elevation: 8,
    shadowColor: '#00796b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  btnGradient: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  aboutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    padding: 18,
    borderRadius: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#f1f1f1',
  },
  aboutBtnText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#263238',
    marginLeft: 12,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ffedeb',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ff5252',
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '80%',
  },
  pickerItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  pickerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#263238',
    textAlign: 'center',
  },
  verifiedCheck: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 1,
  },
  premiumRMContainer: {
    marginTop: 15,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  premiumRMGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  premiumRMText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    marginLeft: 8,
    letterSpacing: 1,
  },

  // WARNING CARD STYLES
  warningCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 25,
    padding: 25,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: '#ffe0b2',
    alignItems: 'center',
    marginBottom: 30,
  },
  warningIconBox: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff8e1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ef6c00',
    marginBottom: 10,
  },
  warningDesc: {
    fontSize: 13,
    color: '#78909c',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 25,
  },
  linkRmBtn: {
    flexDirection: 'row',
    backgroundColor: '#ef6c00',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#ef6c00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  linkRmText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fbfc',
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 55,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0eef0',
  },
  modalInput: {
    flex: 1,
    fontSize: 15,
    color: '#263238',
    fontWeight: '600',
  },
});
