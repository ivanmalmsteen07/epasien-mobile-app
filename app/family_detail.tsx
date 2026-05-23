import React from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, Dimensions, Platform, StatusBar } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export default function FamilyDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const member = params.data ? JSON.parse(params.data as string) : null;

  if (!member) return null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View style={styles.headerBackground}>
        <LinearGradient colors={['#004d40', '#00796b', '#1abc9c']} style={StyleSheet.absoluteFill} />
        
        {/* CUSTOM HEADER ROW */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitleBox}>
            <Text style={styles.headerTitleText}>Detail Anggota</Text>
            <Text style={styles.headerSubtitleText}>Informasi Rekam Medis Keluarga</Text>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Animated.View entering={FadeInDown.duration(800)} style={styles.profileHero}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarCircle}>
              <FontAwesome5 name={member.jk === 'L' ? 'user-alt' : 'female'} size={50} color="#00796b" />
            </View>
          </View>
          <Text style={styles.userName}>{member.nm_pasien}</Text>
          <View style={styles.hubunganBadge}>
            <Text style={styles.hubunganText}>{member.hubungan.toUpperCase()}</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(200).duration(800)} style={styles.dataCard}>
          <View style={styles.cardHeaderRow}>
            <MaterialCommunityIcons name="account-details" size={22} color="#00796b" />
            <Text style={styles.cardHeader}>DATA PERSONAL</Text>
          </View>

          <DataRow label="NOMOR REKAM MEDIS" value={member.no_rkm_medis} icon="folder-open" color="#00796b" />
          <DataRow label="NIK (KTP)" value={member.no_ktp || '-'} icon="id-card" color="#40c4ff" />
          <DataRow label="JENIS KELAMIN" value={member.jk === 'L' ? 'LAKI-LAKI' : 'PEREMPUAN'} icon="venus-mars" color="#00e676" />
          <DataRow label="TEMPAT LAHIR" value={member.tmp_lahir || '-'} icon="map-marker-alt" color="#ffb74d" />
          <DataRow 
            label="TANGGAL LAHIR" 
            value={new Date(member.tgl_lahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} 
            icon="calendar-alt" 
            color="#f06292" 
          />
          <DataRow label="ALAMAT LENGKAP" value={member.alamat || '-'} icon="home" color="#ba68c8" />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(400)} style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={24} color="#00796b" />
          <Text style={styles.infoText}>Data ini sinkron dengan database SIMRS. Segala perubahan data identitas wajib diproses melalui bagian Pendaftaran Rumah Sakit.</Text>
        </Animated.View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fdfc',
  },
  headerBackground: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 25,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
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
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleBox: {
    marginLeft: 15,
    backgroundColor: 'transparent',
  },
  headerTitleText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitleText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  scrollContent: {
    paddingTop: 20,
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
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 8,
  },
  avatarCircle: {
    flex: 1,
    borderRadius: 50,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#263238',
    marginTop: 15,
  },
  hubunganBadge: {
    backgroundColor: '#00796b',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 10,
  },
  hubunganText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
  },
  dataCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 25,
    padding: 20,
    marginBottom: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    paddingBottom: 10,
  },
  cardHeader: {
    fontSize: 13,
    fontWeight: '900',
    color: '#00796b',
    letterSpacing: 1,
    marginLeft: 10,
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
  infoBanner: {
    flexDirection: 'row',
    marginHorizontal: 20,
    padding: 18,
    backgroundColor: '#e0f2f1',
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#b2dfdb',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#00796b',
    marginLeft: 12,
    lineHeight: 18,
    fontWeight: '500',
  }
});
