import React from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, Dimensions, StatusBar, View as RNView, Platform } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function ResumeMedisDetailScreen() {
  const router = useRouter();
  const { data } = useLocalSearchParams();
  const resume = JSON.parse(data as string);

  const formatDate = (dateStr: string) => {
    const options: any = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('id-ID', options);
  };

  const Section = ({ title, content, icon, color, index }: any) => (
    <Animated.View entering={FadeInDown.delay(index * 150)} style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: color + '15' }]}>
          <MaterialCommunityIcons name={icon} size={22} color={color} />
        </View>
        <Text style={[styles.sectionTitle, { color: color }]}>{title}</Text>
      </View>
      <View style={styles.sectionBody}>
        <Text style={styles.sectionText}>{content || '-'}</Text>
      </View>
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
            <Text style={styles.headerTitle}>Detail Resume Medis</Text>
            <Text style={styles.headerStatus}>{resume.no_rawat}</Text>
          </RNView>
        </RNView>
      </LinearGradient>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* INFO DOKTER & POLI */}
          <View style={styles.topInfoCard}>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="calendar-clock" size={18} color="#90a4ae" />
              <Text style={styles.infoValue}>{formatDate(resume.tgl_periksa)}</Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="hospital-building" size={18} color="#90a4ae" />
              <Text style={styles.infoValue}>{resume.nm_poli}</Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="doctor" size={18} color="#90a4ae" />
              <Text style={styles.infoValue}>{resume.nm_dokter}</Text>
            </View>
          </View>

          {/* CLINICAL SECTIONS */}
          <Section 
            index={1}
            title="ANAMNESA (KELUHAN)" 
            content={resume.anamnesa} 
            icon="comment-question-outline" 
            color="#2979ff" 
          />
          <Section 
            index={2}
            title="PEMERIKSAAN FISIK" 
            content={resume.pemeriksaan} 
            icon="stethoscope" 
            color="#00bfa5" 
          />
          <Section 
            index={3}
            title="DIAGNOSA (PENILAIAN)" 
            content={resume.diagnosa} 
            icon="clipboard-pulse-outline" 
            color="#f4511e" 
          />
          <Section 
            index={4}
            title="TERAPI / RENCANA LANJUT" 
            content={resume.terapi} 
            icon="pill" 
            color="#673ab7" 
          />

          <View style={styles.disclaimer}>
            <MaterialCommunityIcons name="information-outline" size={16} color="#90a4ae" />
            <Text style={styles.disclaimerText}>
              Informasi di atas adalah resume medis resmi dari SIMRS Rumah Sakit. Gunakan data ini secara bijak untuk keperluan kesehatan Anda.
            </Text>
          </View>
        </View>
        <View style={{ height: 50 }} />
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
  content: { padding: 20 },
  topInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, backgroundColor: 'transparent' },
  infoValue: { fontSize: 13, color: '#455a64', marginLeft: 12, fontWeight: '600' },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#f5f5f5',
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, backgroundColor: 'transparent' },
  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  sectionBody: { backgroundColor: 'transparent' },
  sectionText: { fontSize: 14, color: '#37474f', lineHeight: 22 },
  disclaimer: {
    flexDirection: 'row',
    marginTop: 10,
    paddingHorizontal: 10,
    backgroundColor: 'transparent',
    alignItems: 'flex-start',
  },
  disclaimerText: {
    fontSize: 11,
    color: '#90a4ae',
    marginLeft: 10,
    flex: 1,
    lineHeight: 16,
    fontStyle: 'italic',
  },
});
