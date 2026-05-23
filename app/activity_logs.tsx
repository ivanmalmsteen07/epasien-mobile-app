import React, { useState, useCallback } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, Dimensions, StatusBar, ActivityIndicator, View as RNView, Platform, FlatList, RefreshControl } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import api from '../services/api';

const { width } = Dimensions.get('window');

export default function ActivityLogsScreen() {
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await api.get('/get_activity_logs.php');
      if (res.data.status === 'success') {
        setLogs(res.data.data);
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
      fetchLogs();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchLogs(false);
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const date = new Date(item.created_at);
    const dateStr = date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    return (
      <Animated.View entering={FadeInDown.delay(index * 50)} style={styles.logWrapper}>
        <RNView style={styles.timelineContainer}>
          <RNView style={styles.line} />
          <RNView style={[styles.dot, { backgroundColor: item.activity_type === 'Login' ? '#00796b' : '#ffa000' }]} />
        </RNView>
        
        <RNView style={styles.logCard}>
          <RNView style={styles.logHeader}>
            <Text style={styles.activityType}>{item.activity_type.toUpperCase()}</Text>
            <Text style={styles.logTime}>{timeStr}</Text>
          </RNView>
          
          <RNView style={styles.deviceRow}>
            <MaterialCommunityIcons name="cellphone-text" size={16} color="#78909c" />
            <Text style={styles.deviceText} numberOfLines={1}>{item.device_info}</Text>
          </RNView>
          
          <RNView style={styles.logFooter}>
            <RNView style={styles.ipBadge}>
              <Text style={styles.ipText}>{item.ip_address}</Text>
            </RNView>
            <Text style={styles.logDate}>{dateStr}</Text>
          </RNView>
        </RNView>
      </Animated.View>
    );
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
            <Text style={styles.headerTitle}>Aktivitas Akun</Text>
            <Text style={styles.headerStatus}>Jejak Keamanan Digital Anda</Text>
          </RNView>
        </RNView>
      </LinearGradient>

      {loading ? (
        <RNView style={styles.center}>
          <ActivityIndicator size="large" color="#00796b" />
          <Text style={styles.loadingText}>Memuat riwayat aktivitas...</Text>
        </RNView>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00796b']} />}
          ListEmptyComponent={
            <RNView style={styles.emptyBox}>
              <MaterialCommunityIcons name="history" size={80} color="#e0e0e0" />
              <Text style={styles.emptyTitle}>Belum Ada Aktivitas</Text>
              <Text style={styles.emptyDesc}>Riwayat login dan perubahan keamanan akun Anda akan muncul di sini.</Text>
            </RNView>
          }
          ListHeaderComponent={
            <Animated.View entering={FadeInRight} style={styles.infoAlert}>
              <Ionicons name="shield-checkmark" size={20} color="#00796b" />
              <Text style={styles.infoAlertText}>
                Tinjau riwayat login Anda secara berkala untuk memastikan tidak ada akses yang tidak sah.
              </Text>
            </Animated.View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcfcfc' },
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#666', fontSize: 14 },
  list: { padding: 20 },
  infoAlert: {
    flexDirection: 'row',
    backgroundColor: '#e0f2f1',
    padding: 15,
    borderRadius: 15,
    marginBottom: 25,
    alignItems: 'center',
  },
  infoAlertText: { flex: 1, marginLeft: 12, fontSize: 12, color: '#004d40', lineHeight: 18 },
  logWrapper: { flexDirection: 'row', marginBottom: 5 },
  timelineContainer: { width: 30, alignItems: 'center', backgroundColor: 'transparent' },
  line: { width: 2, flex: 1, backgroundColor: '#e0e0e0' },
  dot: { width: 12, height: 12, borderRadius: 6, zIndex: 1, marginTop: 5, borderWidth: 2, borderColor: '#fff' },
  logCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    marginLeft: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, backgroundColor: 'transparent' },
  activityType: { fontSize: 13, fontWeight: '900', color: '#37474f', letterSpacing: 0.5 },
  logTime: { fontSize: 12, color: '#00796b', fontWeight: 'bold' },
  deviceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, backgroundColor: 'transparent' },
  deviceText: { fontSize: 13, color: '#546e7a', marginLeft: 8, fontWeight: '500' },
  logFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'transparent' },
  ipBadge: { backgroundColor: '#f5f5f5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5 },
  ipText: { fontSize: 10, color: '#90a4ae', fontWeight: 'bold' },
  logDate: { fontSize: 11, color: '#9e9e9e' },
  emptyBox: { marginTop: 80, alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#9e9e9e', marginTop: 15 },
  emptyDesc: { fontSize: 13, color: '#bdbdbd', textAlign: 'center', marginTop: 8, paddingHorizontal: 40 },
});
