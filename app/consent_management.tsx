import React, { useState, useCallback } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, Dimensions, StatusBar, ActivityIndicator, View as RNView, Platform, FlatList, RefreshControl, Switch } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Device from 'expo-device';
import api from '../services/api';
import CustomAlert from '../components/CustomAlert';

const { width } = Dimensions.get('window');

export default function ConsentManagementScreen() {
  const router = useRouter();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [alert, setAlert] = useState({ visible: false, title: '', message: '', type: 'info' as 'info' | 'success' | 'error' });

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await api.get(`/get_consent_list.php?t=${Date.now()}`);
      if (res.data.status === 'success') {
        setPatients(res.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(false);
  };

  const toggleConsent = async (no_rkm_medis: string, currentStatus: number) => {
    setUpdatingId(no_rkm_medis);
    try {
      const deviceInfo = `${Device.brand} ${Device.modelName} (${Platform.OS})`;
      const res = await api.post('/update_consent.php', {
        no_rkm_medis,
        is_active: currentStatus === 1 ? 0 : 1,
        device_info: deviceInfo
      });
      
      if (res.data.status === 'success') {
        // Update local state
        setPatients(prev => prev.map(p => 
          p.no_rkm_medis === no_rkm_medis ? { ...p, is_active: currentStatus === 1 ? 0 : 1 } : p
        ));
        setAlert({
          visible: true,
          title: 'Pembaruan Berhasil',
          message: `Izin akses data untuk ${res.data.message === 'success' ? 'pasien' : no_rkm_medis} telah ${currentStatus === 1 ? 'dicabut' : 'diaktifkan'}.`,
          type: 'success'
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingId(null);
    }
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => (
    <Animated.View key={item.no_rkm_medis} entering={FadeInDown.delay(index * 100)} style={styles.card}>
      <RNView style={styles.cardTop}>
        <RNView style={[styles.avatar, { backgroundColor: item.jk === 'L' ? '#e3f2fd' : '#fce4ec' }]}>
          <FontAwesome5 name={item.jk === 'L' ? 'user-alt' : 'female'} size={20} color={item.jk === 'L' ? '#1e88e5' : '#d81b60'} />
        </RNView>
        <RNView style={styles.patientInfo}>
          <Text style={styles.patientName}>{item.nm_pasien}</Text>
          <Text style={styles.patientDetail}>RM: {item.no_rkm_medis} • {item.hubungan}</Text>
        </RNView>
        <Switch
          trackColor={{ false: '#e0e0e0', true: '#a5d6a7' }}
          thumbColor={item.is_active === 1 ? '#4caf50' : '#f5f5f5'}
          onValueChange={() => toggleConsent(item.no_rkm_medis, item.is_active)}
          value={item.is_active === 1}
          disabled={updatingId === item.no_rkm_medis}
        />
      </RNView>
      
      <RNView style={styles.cardBottom}>
        <Ionicons 
          name={item.is_active === 1 ? "shield-checkmark" : "shield-outline"} 
          size={14} 
          color={item.is_active === 1 ? "#4caf50" : "#9e9e9e"} 
        />
        <Text style={[styles.statusText, { color: item.is_active === 1 ? "#4caf50" : "#9e9e9e" }]}>
          {item.is_active === 1 ? "Izin Akses Aktif" : "Izin Akses Dicabut"}
        </Text>
        {updatingId === item.no_rkm_medis && (
          <ActivityIndicator size="small" color="#00796b" style={{ marginLeft: 10 }} />
        )}
      </RNView>
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
            <Text style={styles.headerTitle}>Persetujuan Akses</Text>
            <Text style={styles.headerStatus}>Kontrol Privasi Data Medis</Text>
          </RNView>
        </RNView>
      </LinearGradient>

      <ScrollView 
        style={styles.scroll} 
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00796b']} />}
      >
        <RNView style={styles.infoBox}>
          <MaterialCommunityIcons name="shield-account" size={30} color="#00796b" />
          <RNView style={styles.infoTextBox}>
            <Text style={styles.infoTitle}>Manajemen Privasi</Text>
            <Text style={styles.infoDesc}>
              Gunakan halaman ini untuk memberikan atau mencabut izin akses digital ke rekam medis Anda dan keluarga. Data medis tidak akan muncul jika izin dicabut.
            </Text>
          </RNView>
        </RNView>

        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#00796b" style={{ marginTop: 50 }} />
        ) : (
          patients.map((item, index) => renderItem({ item, index }))
        )}

        <RNView style={styles.footerNote}>
          <Ionicons name="information-circle-outline" size={16} color="#90a4ae" />
          <Text style={styles.footerText}>
            Pencabutan izin hanya berlaku untuk akses digital melalui aplikasi ini. Dokumen fisik di RS tetap tersimpan sesuai regulasi.
          </Text>
        </RNView>
      </ScrollView>

      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert({ ...alert, visible: false })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fdfc' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, backgroundColor: 'transparent' },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleBox: { marginLeft: 15, backgroundColor: 'transparent' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  headerStatus: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  scroll: { flex: 1 },
  content: { padding: 20 },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 20,
    marginBottom: 25,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0f2f1',
  },
  infoTextBox: { flex: 1, marginLeft: 15, backgroundColor: 'transparent' },
  infoTitle: { fontSize: 15, fontWeight: 'bold', color: '#263238', marginBottom: 4 },
  infoDesc: { fontSize: 12, color: '#546e7a', lineHeight: 18 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, backgroundColor: 'transparent' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  patientInfo: { flex: 1, backgroundColor: 'transparent' },
  patientName: { fontSize: 15, fontWeight: 'bold', color: '#37474f' },
  patientDetail: { fontSize: 12, color: '#78909c', marginTop: 2 },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
    backgroundColor: 'transparent',
  },
  statusText: { fontSize: 12, fontWeight: 'bold', marginLeft: 6 },
  footerNote: {
    marginTop: 15,
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#f1f1f1',
    borderRadius: 15,
    alignItems: 'flex-start',
  },
  footerText: { flex: 1, marginLeft: 10, fontSize: 11, color: '#90a4ae', lineHeight: 16, fontStyle: 'italic' },
});
