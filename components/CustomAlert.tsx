import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, Dimensions } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  onClose: () => void;
  onConfirm?: () => void;
  showConfirm?: boolean;
  cancelText?: string;
  confirmText?: string;
}

export default function CustomAlert({ 
  visible, 
  title, 
  message, 
  type, 
  onClose, 
  onConfirm, 
  showConfirm = false,
  cancelText = "BATAL",
  confirmText = "OKE"
}: CustomAlertProps) {
  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success': return { name: 'check-circle', color: '#2ecc71' };
      case 'error': return { name: 'exclamation-circle', color: '#e74c3c' };
      case 'warning': return { name: 'exclamation-triangle', color: '#f1c40f' };
      default: return { name: 'info-circle', color: '#3498db' };
    }
  };

  const iconData = getIcon();

  return (
    <Modal transparent visible={visible} animationType="none">
      <Animated.View 
        entering={FadeIn} 
        exiting={FadeOut} 
        style={styles.overlay}
      >
        <Animated.View 
          entering={ZoomIn} 
          exiting={ZoomOut} 
          style={styles.alertBox}
        >
          <View style={[styles.iconWrapper, { backgroundColor: iconData.color + '20' }]}>
            <FontAwesome5 name={iconData.name} size={40} color={iconData.color} />
          </View>
          
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          
          <View style={styles.buttonContainer}>
            {showConfirm && (
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]} 
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>{cancelText}</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.button, { backgroundColor: iconData.color }, showConfirm && { flex: 1, marginLeft: 10 }]} 
              onPress={() => {
                if (onConfirm) onConfirm();
                onClose();
              }}
            >
              <Text style={styles.buttonText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBox: {
    width: width * 0.85,
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 30,
    alignItems: 'center',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
  },
  button: {
    paddingVertical: 15,
    borderRadius: 15,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    flex: 1,
    marginRight: 0,
  },
  cancelButtonText: {
    color: '#95a5a6',
    fontSize: 14,
    fontWeight: 'bold',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  }
});
