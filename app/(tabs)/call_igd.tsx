import { StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Text, View } from '@/components/Themed';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function CallIGDScreen() {
  const handleCall = () => {
    Linking.openURL('tel:081575540540');
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#e74c3c', '#c0392b']} style={styles.card}>
        <FontAwesome5 name="ambulance" size={80} color="#fff" />
        <Text style={styles.title}>DARURAT IGD</Text>
        <Text style={styles.desc}>Klik tombol di bawah untuk menghubungi layanan gawat darurat Rumah Sakit.</Text>
        
        <TouchableOpacity style={styles.callBtn} onPress={handleCall}>
          <FontAwesome5 name="phone-alt" size={24} color="#e74c3c" />
          <Text style={styles.callText}>HUBUNGI SEKARANG</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  card: {
    width: '100%',
    borderRadius: 30,
    padding: 40,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
  },
  desc: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  callBtn: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 30,
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
  },
  callText: {
    color: '#e74c3c',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 15,
  },
});
