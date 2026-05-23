import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions, View as RNView, Platform, StatusBar } from 'react-native';
import { Text, View } from '@/components/Themed';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import api from '../services/api';

const { width } = Dimensions.get('window');

export default function LabDetailScreen() {
  const router = useRouter();
  const { no_rawat, nm_perawatan, tgl_periksa, jam, nm_pasien } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [header, setHeader] = useState<any>(null);
  const [details, setDetails] = useState<any[]>([]);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await api.get(`/get_lab_detail.php?no_rawat=${no_rawat}&tgl_periksa=${tgl_periksa}&jam=${jam}`);
        if (res.data.status === 'success') {
          setHeader(res.data.header);
          setDetails(res.data.details);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [no_rawat]);

  const parseRange = (rujukan: string, jk?: string) => {
    if (!rujukan) return null;
    
    // Normalize dashes, hyphens, commas, and trim
    let clean = rujukan
      .replace(/[\u2013\u2014]/g, '-') // Normalize En-dash and Em-dash to standard hyphen
      .replace(/,/g, '.') // Convert commas to dots for float parsing
      .trim();

    // Check for gender-specific separation (e.g. "L : 13-16, P : 12-14")
    const hasMaleIndicator = clean.includes('L:') || clean.includes('L :') || clean.includes('PRIA') || clean.includes('LAKI');
    const hasFemaleIndicator = clean.includes('P:') || clean.includes('P :') || clean.includes('WANITA') || clean.includes('PEREMPUAN');
    const isGenderSplit = hasMaleIndicator && hasFemaleIndicator;

    if (isGenderSplit) {
      const isMale = jk && (
        jk.toUpperCase().startsWith('L') || 
        jk.toUpperCase().startsWith('M') || 
        jk.toUpperCase() === 'PRIA'
      );
      
      const parts = clean.split(/[,;\n\r]/);
      let targetPart = '';
      
      for (let part of parts) {
        const partTrimmed = part.trim().toUpperCase();
        if (isMale) {
          if (
            partTrimmed.startsWith('L:') || 
            partTrimmed.startsWith('L :') || 
            partTrimmed.includes('PRIA') || 
            partTrimmed.includes('LAKI') || 
            partTrimmed.startsWith('L ')
          ) {
            targetPart = part.trim();
            break;
          }
        } else {
          if (
            partTrimmed.startsWith('P:') || 
            partTrimmed.startsWith('P :') || 
            partTrimmed.includes('WANITA') || 
            partTrimmed.includes('PEREMPUAN') || 
            partTrimmed.startsWith('P ')
          ) {
            targetPart = part.trim();
            break;
          }
        }
      }
      
      if (!targetPart && parts.length > 0) {
        // Fallback to male range first, or first part
        targetPart = parts.find(p => p.trim().toUpperCase().startsWith('L')) || parts[0];
      }
      
      if (targetPart) {
        clean = targetPart
          .replace(/^(L|P|PRIA|WANITA|LAKI-LAKI|PEREMPUAN|MALE|FEMALE)\s*[:\s\-]\s*/i, '')
          .trim();
      }
    }

    // Check for range: e.g. "4.0 - 10.0" or "4.0-10.0"
    if (clean.includes('-')) {
      const parts = clean.split('-').map(p => parseFloat(p.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return { min: parts[0], max: parts[1] };
      }
    }

    // Check for < or <= threshold: e.g. "< 10" or "<= 10"
    if (clean.startsWith('<')) {
      const val = parseFloat(clean.replace('<', '').replace('=', '').trim());
      if (!isNaN(val)) {
        return { min: -Infinity, max: val };
      }
    }

    // Check for > or >= threshold: e.g. "> 5" or ">= 5"
    if (clean.startsWith('>')) {
      const val = parseFloat(clean.replace('>', '').replace('=', '').trim());
      if (!isNaN(val)) {
        return { min: val, max: Infinity };
      }
    }

    return null;
  };

  const getStatusColor = (item: any) => {
    if (!item) return '#4caf50';

    // 1. Cek keterangan bawaan dulu jika ada dengan regex word boundary yang aman
    const ket = (item.keterangan || '').toUpperCase().trim();
    if (ket) {
      const isHigh = /\b(H|HH|TINGGI|HIGH)\b/i.test(ket) || ket === 'H' || ket === 'HH';
      const isLow = /\b(L|LL|RENDAH|LOW)\b/i.test(ket) || ket === 'L' || ket === 'LL';
      
      if (isHigh) return '#f44336'; // Tinggi (Merah)
      if (isLow) return '#2196f3';  // Rendah (Biru)
    }

    // 2. Cek nilai kualitatif hasil (Positif/Negatif)
    const hasilStr = (item.hasil || '').toUpperCase().trim();
    if (hasilStr === 'POSITIF' || hasilStr === 'REAKTIF' || hasilStr === 'REACTIVE') {
      return '#f44336'; // Tinggi / Abnormal (Merah)
    }
    if (hasilStr === 'NEGATIF' || hasilStr === 'NON REAKTIF' || hasilStr === 'NON-REAKTIF' || hasilStr === 'NON REACTIVE') {
      return '#4caf50'; // Normal (Hijau)
    }

    // 3. Jika keterangan kosong / normal, hitung dinamis dari hasil vs nilai_rujukan
    const cleanHasil = (item.hasil || '').replace(/,/g, '.').trim();
    let hasilVal = parseFloat(cleanHasil);
    if (isNaN(hasilVal)) return '#4caf50'; // Bukan angka, anggap Normal

    let isLessThanHasil = false;
    let isGreaterThanHasil = false;
    if (cleanHasil.startsWith('<')) {
      isLessThanHasil = true;
      hasilVal = parseFloat(cleanHasil.replace('<', '').replace('=', '').trim());
    } else if (cleanHasil.startsWith('>')) {
      isGreaterThanHasil = true;
      hasilVal = parseFloat(cleanHasil.replace('>', '').replace('=', '').trim());
    }

    if (isNaN(hasilVal)) return '#4caf50';

    const rujukan = parseRange(item.nilai_rujukan, header?.jk);
    if (rujukan) {
      if (isLessThanHasil) {
        if (hasilVal <= rujukan.min) return '#2196f3'; // Rendah (Biru)
      } else if (isGreaterThanHasil) {
        if (hasilVal >= rujukan.max) return '#f44336'; // Tinggi (Merah)
      } else {
        if (hasilVal < rujukan.min) return '#2196f3'; // Rendah (Biru)
        if (hasilVal > rujukan.max) return '#f44336'; // Tinggi (Merah)
      }
    }

    return '#4caf50'; // Normal (Hijau)
  };

  const getStatusText = (item: any) => {
    if (!item) return 'Normal';

    // 1. Cek keterangan bawaan dulu jika ada dengan regex word boundary yang aman
    const ket = (item.keterangan || '').toUpperCase().trim();
    if (ket) {
      const isHigh = /\b(H|HH|TINGGI|HIGH)\b/i.test(ket) || ket === 'H' || ket === 'HH';
      const isLow = /\b(L|LL|RENDAH|LOW)\b/i.test(ket) || ket === 'L' || ket === 'LL';
      
      if (isHigh) return 'High';
      if (isLow) return 'Low';
    }

    // 2. Cek nilai kualitatif hasil (Positif/Negatif)
    const hasilStr = (item.hasil || '').toUpperCase().trim();
    if (hasilStr === 'POSITIF' || hasilStr === 'REAKTIF' || hasilStr === 'REACTIVE') {
      return 'High';
    }
    if (hasilStr === 'NEGATIF' || hasilStr === 'NON REAKTIF' || hasilStr === 'NON-REAKTIF' || hasilStr === 'NON REACTIVE') {
      return 'Normal';
    }

    // 3. Jika keterangan kosong / normal, hitung dinamis dari hasil vs nilai_rujukan
    const cleanHasil = (item.hasil || '').replace(/,/g, '.').trim();
    let hasilVal = parseFloat(cleanHasil);
    if (isNaN(hasilVal)) return 'Normal';

    let isLessThanHasil = false;
    let isGreaterThanHasil = false;
    if (cleanHasil.startsWith('<')) {
      isLessThanHasil = true;
      hasilVal = parseFloat(cleanHasil.replace('<', '').replace('=', '').trim());
    } else if (cleanHasil.startsWith('>')) {
      isGreaterThanHasil = true;
      hasilVal = parseFloat(cleanHasil.replace('>', '').replace('=', '').trim());
    }

    if (isNaN(hasilVal)) return 'Normal';

    const rujukan = parseRange(item.nilai_rujukan, header?.jk);
    if (rujukan) {
      if (isLessThanHasil) {
        if (hasilVal <= rujukan.min) return 'Low';
      } else if (isGreaterThanHasil) {
        if (hasilVal >= rujukan.max) return 'High';
      } else {
        if (hasilVal < rujukan.min) return 'Low';
        if (hasilVal > rujukan.max) return 'High';
      }
    }

    return 'Normal';
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <LinearGradient colors={['#004d40', '#00796b', '#1abc9c']} style={styles.header}>
        <RNView style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
          <RNView style={styles.headerTitleBox}>
            <Text style={styles.headerTitle}>Hasil Laboratorium</Text>
            <Text style={styles.headerStatus}>Rincian Parameter Klinis</Text>
          </RNView>
        </RNView>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeIn} style={styles.headerCard}>
          <LinearGradient colors={['#00796b', '#004d40']} style={styles.headerGradient}>
            <RNView style={styles.headerTop}>
              <MaterialCommunityIcons name="flask-outline" size={24} color="#1abc9c" />
              <Text style={styles.headerMainTitle}>{nm_perawatan}</Text>
            </RNView>
            <RNView style={styles.headerDivider} />
            <RNView style={styles.infoGrid}>
              <RNView style={styles.infoItem}>
                <Text style={styles.infoLabel}>NAMA PASIEN</Text>
                <Text style={styles.infoValue}>{nm_pasien}</Text>
              </RNView>
              <RNView style={styles.infoItem}>
                <Text style={styles.infoLabel}>TANGGAL PERIKSA</Text>
                <Text style={styles.infoValue}>{new Date(tgl_periksa as string).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</Text>
              </RNView>
            </RNView>
            <RNView style={styles.infoGrid}>
              <RNView style={styles.infoItem}>
                <Text style={styles.infoLabel}>DOKTER PENANGGUNG JAWAB</Text>
                <Text style={styles.infoValue}>{header?.nm_dokter_pj || '-'}</Text>
              </RNView>
              <RNView style={styles.infoItem}>
                <Text style={styles.infoLabel}>NOMOR RAWAT</Text>
                <Text style={styles.infoValue}>{no_rawat}</Text>
              </RNView>
            </RNView>
          </LinearGradient>
        </Animated.View>

        <RNView style={styles.content}>
          {/* Legend */}
          <RNView style={styles.legendRow}>
            <RNView style={styles.legendItem}><RNView style={[styles.legendDot, {backgroundColor: '#4caf50'}]} /><Text style={styles.legendText}>Normal</Text></RNView>
            <RNView style={styles.legendItem}><RNView style={[styles.legendDot, {backgroundColor: '#f44336'}]} /><Text style={styles.legendText}>High</Text></RNView>
            <RNView style={styles.legendItem}><RNView style={[styles.legendDot, {backgroundColor: '#2196f3'}]} /><Text style={styles.legendText}>Low</Text></RNView>
          </RNView>

          {/* Results Grouped by Category */}
          {Object.entries(
            details.reduce((acc, curr) => {
              (acc[curr.kategori] = acc[curr.kategori] || []).push(curr);
              return acc;
            }, {} as Record<string, any[]>)
          ).map(([kategori, items], catIndex) => (
            <RNView key={catIndex} style={styles.categorySection}>
              <RNView style={styles.categoryHeader}>
                <MaterialCommunityIcons name="label-outline" size={16} color="#00796b" />
                <Text style={styles.categoryTitle}>{kategori}</Text>
              </RNView>

              {/* Table Header for this Category */}
              <RNView style={styles.tableHeader}>
                <Text style={[styles.thText, { flex: 2 }]}>Pemeriksaan</Text>
                <Text style={[styles.thText, { flex: 1.2, textAlign: 'center' }]}>Hasil</Text>
                <Text style={[styles.thText, { flex: 1.5, textAlign: 'right' }]}>Rujukan</Text>
              </RNView>

              {(items as any[]).map((item: any, index: number) => (
                <RNView key={index} style={[styles.tableRow, index % 2 === 0 ? styles.rowEven : styles.rowOdd]}>
                  <RNView style={{ flex: 2 }}>
                    <Text style={styles.pemeriksaanText}>{item.pemeriksaan}</Text>
                  </RNView>
                  <RNView style={{ flex: 1.2, alignItems: 'center' }}>
                    <RNView style={[styles.resultBadge, { backgroundColor: getStatusColor(item) }]}>
                      <Text style={styles.resultValue}>{item.hasil}</Text>
                      <Text style={styles.satuanText}>{item.satuan}</Text>
                    </RNView>
                  </RNView>
                  <RNView style={{ flex: 1.5, alignItems: 'flex-end' }}>
                    <Text style={styles.rujukanText}>{item.nilai_rujukan}</Text>
                  </RNView>
                </RNView>
              ))}
            </RNView>
          ))}

          {/* Saran & Kesan */}
          {(header?.saran || header?.kesan) && (
            <RNView style={styles.saranCard}>
              <RNView style={styles.saranHeader}>
                <MaterialCommunityIcons name="stethoscope" size={18} color="#2e7d32" />
                <Text style={styles.saranTitle}>Saran & Kesan Dokter</Text>
              </RNView>
              {header?.kesan && (
                <RNView style={styles.saranItem}>
                  <Text style={styles.saranLabel}>Kesan:</Text>
                  <Text style={styles.saranText}>{header.kesan}</Text>
                </RNView>
              )}
              {header?.saran && (
                <RNView style={styles.saranItem}>
                  <Text style={styles.saranLabel}>Saran:</Text>
                  <Text style={styles.saranText}>{header.saran}</Text>
                </RNView>
              )}
            </RNView>
          )}

          <RNView style={styles.footerNote}>
            <Ionicons name="information-circle-outline" size={16} color="#9e9e9e" />
            <Text style={styles.footerText}>
              Silakan konsultasikan hasil ini dengan dokter pengirim untuk interpretasi medis yang akurat.
            </Text>
          </RNView>
        </RNView>
      </ScrollView>
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
    marginBottom: 5,
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
  headerCard: { margin: 15, borderRadius: 20, overflow: 'hidden', elevation: 8, shadowColor: '#004d40', shadowOpacity: 0.2, shadowRadius: 10 },
  headerGradient: { padding: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, backgroundColor: 'transparent' },
  headerMainTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginLeft: 10, flex: 1 },
  headerDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 20 },
  infoGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, backgroundColor: 'transparent' },
  infoItem: { flex: 1, backgroundColor: 'transparent' },
  infoLabel: { fontSize: 9, color: 'rgba(255,255,255,0.6)', letterSpacing: 1, marginBottom: 4, fontWeight: 'bold' },
  infoValue: { fontSize: 13, color: '#fff', fontWeight: '700' },
  
  content: { paddingHorizontal: 15, paddingBottom: 30, backgroundColor: 'transparent' },
  legendRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 10 },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
  legendText: { fontSize: 11, color: '#757575' },

  tableHeader: { 
    flexDirection: 'row', 
    backgroundColor: '#f1f8e9', 
    padding: 10, 
    borderRadius: 8,
    marginBottom: 5
  },
  categorySection: {
    marginBottom: 25,
    backgroundColor: 'transparent'
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e0f2f1',
    backgroundColor: 'transparent'
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#00796b',
    marginLeft: 8,
    textTransform: 'uppercase'
  },
  thText: { fontSize: 13, fontWeight: 'bold', color: '#2e7d32' },
  
  tableRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 12, 
    borderRadius: 8,
    marginBottom: 5
  },
  rowEven: { backgroundColor: '#fff' },
  rowOdd: { backgroundColor: '#fafafa' },
  pemeriksaanText: { fontSize: 13, color: '#37474f', fontWeight: '500' },
  resultBadge: { 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 6, 
    alignItems: 'center',
    minWidth: 50
  },
  resultValue: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  satuanText: { fontSize: 9, color: '#fff', opacity: 0.8 },
  rujukanText: { fontSize: 12, color: '#757575' },

  footerNote: { 
    marginTop: 15, 
    flexDirection: 'row', 
    padding: 15, 
    backgroundColor: '#f5f5f5', 
    borderRadius: 12,
    alignItems: 'center'
  },
  footerText: { flex: 1, marginLeft: 10, fontSize: 12, color: '#9e9e9e', fontStyle: 'italic' },

  saranCard: {
    marginTop: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e8f5e9',
    borderRadius: 15,
    padding: 15,
    elevation: 2,
  },
  saranHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f8e9',
    paddingBottom: 8,
    backgroundColor: 'transparent'
  },
  saranTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginLeft: 8,
  },
  saranItem: {
    marginBottom: 10,
    backgroundColor: 'transparent'
  },
  saranLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#455a64',
    marginBottom: 2,
  },
  saranText: {
    fontSize: 13,
    color: '#546e7a',
    lineHeight: 20,
  },
});
