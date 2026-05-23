import React, { useState, useCallback } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, Dimensions, StatusBar, ActivityIndicator, View as RNView, Platform } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import api from '../services/api';

const { width } = Dimensions.get('window');

export default function ResepSelectionScreen() {
  const router = useRouter();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/get_family.php');
      if (res.data.status === 'success') {
        setPatients(res.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const checkAccess = async (patient: any) => {
    try {
      setLoading(true);
      const res = await api.get(`/check_resume_access.php?no_rkm_medis=${patient.no_rkm_medis}`);
      if (res.data.status === 'success') {
        if (res.data.is_active) {
          router.push({
            pathname: '/resep_history',
            params: { no_rkm_medis: patient.no_rkm_medis, nm_pasien: patient.nm_pasien }
          });
        } else {
          router.push({
            pathname: '/resume_medis_consent',
            params: { no_rkm_medis: patient.no_rkm_medis, nm_pasien: patient.nm_pasien, from: '/resep_history' }
          });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <LinearGradient colors={['#004d40', '#00796b', '#1abc9c']} style={styles.header}>
        <RNView style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
          <RNView style={styles.headerTitleBox}>
            <Text style={styles.headerTitle}>Resep Digital</Text>
            <Text style={styles.headerStatus}>Pilih Profil Pasien</Text>
          </RNView>
        </RNView>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Animated.View entering={FadeInDown} style={styles.infoBox}>
          <MaterialCommunityIcons name="pill" size={30} color="#00796b" />
          <Text style={styles.infoText}>
            Pilih profil di bawah ini untuk melihat riwayat pemberian obat, dosis, dan aturan pakai dari dokter.
          </Text>
        </Animated.View>

        {loading ? (
          <ActivityIndicator size="large" color="#00796b" style={{ marginTop: 50 }} />
        ) : (
          patients.map((item, index) => (
            <Animated.View key={item.no_rkm_medis} entering={FadeInDown.delay(index * 100)}>
              <TouchableOpacity 
                style={styles.patientCard}
                onPress={() => checkAccess(item)}
              >
                <LinearGradient colors={['#e0f2f1', '#b2dfdb']} style={styles.avatar}>
                  <FontAwesome5 name={item.jk === 'L' ? 'user-alt' : 'female'} size={24} color="#00796b" />
                </LinearGradient>
                <RNView style={styles.patientInfo}>
                  <Text style={styles.patientName}>{item.nm_pasien}</Text>
                  <Text style={styles.patientRM}>RM: {item.no_rkm_medis} • {item.hubungan}</Text>
                </RNView>
                <Ionicons name="chevron-forward" size={20} color="#b0bec5" />
              </TouchableOpacity>
            </Animated.View>
          ))
        )}
      </ScrollView>
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
  content: { padding: 25 },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 20,
    marginBottom: 25,
    elevation: 4,
    shadowColor: '#00796b',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    alignItems: 'center',
  },
  infoText: { flex: 1, marginLeft: 15, fontSize: 12, color: '#455a64', lineHeight: 18 },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 20,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  patientInfo: { flex: 1, backgroundColor: 'transparent' },
  patientName: { fontSize: 16, fontWeight: 'bold', color: '#263238' },
  patientRM: { fontSize: 12, color: '#90a4ae', marginTop: 2 },
});
