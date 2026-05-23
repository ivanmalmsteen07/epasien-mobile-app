import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, View, Text, StatusBar, ActivityIndicator, RefreshControl, Dimensions, Platform } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons, MaterialIcons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';

const { width } = Dimensions.get('window');

export default function AnnouncementsScreen() {
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const response = await api.get('/get_pengumuman.php');
      if (response.data.status === 'success') {
        const data = response.data.data;
        setAnnouncements(data);
        if (data.length > 0) {
          const userDataStr = await SecureStore.getItemAsync('userData');
          const userData = userDataStr ? JSON.parse(userDataStr) : null;
          const userScope = userData ? (userData.no_rkm_medis || userData.username || 'guest') : 'guest';

          await SecureStore.setItemAsync(`last_seen_announcement_date_${userScope}`, data[0].tanggal);
          setExpandedId(data[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnnouncements();
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* 1. VIBRANT HEADER (100% Identik dengan Pengaduan) */}
      <View style={styles.headerBackground}>
        <LinearGradient colors={['#004d40', '#00796b', '#1abc9c']} style={StyleSheet.absoluteFill} />
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitleBox}>
            <Text style={styles.headerTitle}>Pusat Informasi</Text>
            <Text style={styles.headerStatus}>Berita Resmi Rumah Sakit</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00796b" />}
      >
        <View style={{ height: 10 }} />
        
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#00796b" />
          </View>
        ) : announcements.length === 0 ? (
          <View style={styles.emptyView}>
            <MaterialCommunityIcons name="bell-off-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>Belum ada pengumuman</Text>
          </View>
        ) : (
          <View style={styles.groupCard}>
            {announcements.map((item, index) => (
              <View key={item.id}>
                <TouchableOpacity 
                  style={[styles.listItem, expandedId === item.id && styles.itemActive]} 
                  onPress={() => toggleExpand(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.listIconBox, { backgroundColor: expandedId === item.id ? '#00796b' : '#f0fdf4' }]}>
                    <MaterialCommunityIcons 
                      name={expandedId === item.id ? "bell-ring" : "bell-outline"} 
                      size={22} 
                      color={expandedId === item.id ? '#fff' : '#00796b'} 
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.listTitle, expandedId === item.id && { color: '#00796b' }]} numberOfLines={1}>
                      {item.isi.substring(0, 35)}...
                    </Text>
                    <Text style={styles.listSub}>{item.tanggal}</Text>
                  </View>
                  <MaterialIcons 
                    name={expandedId === item.id ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                    size={24} 
                    color="#cfd8dc" 
                  />
                </TouchableOpacity>
                
                {expandedId === item.id && (
                  <Animated.View entering={FadeInUp.duration(300)} style={styles.expandContent}>
                    <View style={styles.divider} />
                    <Text style={styles.expandText}>{item.isi}</Text>
                    <View style={styles.authorBadge}>
                      <FontAwesome5 name="user-check" size={10} color="#00796b" />
                      <Text style={styles.authorName}>Petugas: {item.nama_petugas || 'Admin'}</Text>
                    </View>
                  </Animated.View>
                )}
                {index < announcements.length - 1 && <View style={styles.line} />}
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>E-Pasien v.2.0.0 - © 2026 E-Pasien Standard</Text>
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fdfc',
  },
  headerBackground: {
    height: Platform.OS === 'ios' ? 120 : 100,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
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
  scrollContent: {
    padding: 20,
  },
  center: {
    marginTop: 100,
    alignItems: 'center',
  },
  emptyView: {
    marginTop: 80,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 15,
    color: '#90a4ae',
    fontWeight: 'bold',
  },
  groupCard: {
    backgroundColor: '#fff',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#eceff1',
    overflow: 'hidden',
    elevation: 3,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
  },
  itemActive: {
    backgroundColor: '#f9f9f9',
  },
  listIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#263238',
  },
  listSub: {
    fontSize: 11,
    color: '#90a4ae',
    marginTop: 3,
  },
  expandContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingLeft: 77,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f1f1',
    marginBottom: 15,
  },
  expandText: {
    fontSize: 14,
    color: '#546e7a',
    lineHeight: 22,
    marginBottom: 15,
  },
  authorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  authorName: {
    fontSize: 10,
    color: '#00796b',
    fontWeight: 'bold',
    marginLeft: 6,
  },
  line: {
    height: 1,
    backgroundColor: '#f5f5f5',
    marginHorizontal: 15,
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: '#cfd8dc',
    fontWeight: 'bold',
  }
});
