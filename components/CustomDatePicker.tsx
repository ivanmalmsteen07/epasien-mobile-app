import React, { useState, useEffect } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, Dimensions, FlatList } from 'react-native';
import { FontAwesome5, Ionicons, MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

interface CustomDatePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (dateString: string) => void; // Format: YYYY-MM-DD for DB
  initialDate?: string;
  minDate?: string; // YYYY-MM-DD
  maxDate?: string; // YYYY-MM-DD
}

export default function CustomDatePicker({ visible, onClose, onSelect, initialDate, minDate, maxDate }: CustomDatePickerProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'year' | 'month'>('calendar');

  const getISODate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  useEffect(() => {
    if (visible) {
      if (initialDate && initialDate.length === 10) {
        const d = new Date(initialDate);
        if (!isNaN(d.getTime())) {
          setSelectedDate(d);
          setCurrentDate(d);
        }
      }
      setViewMode('calendar');
    }
  }, [visible, initialDate]);

  if (!visible) return null;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleSelectDay = (day: number) => {
    const newDate = new Date(year, month, day);
    const isoStr = getISODate(newDate);

    if (minDate && isoStr < minDate) return;
    if (maxDate && isoStr > maxDate) return;

    setSelectedDate(newDate);
    onSelect(isoStr);
    onClose();
  };

  const renderCalendar = () => {
    const days = [];
    const weekdays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

    const headers = weekdays.map((day, index) => (
      <View key={`header-${index}`} style={styles.dayBox}>
        <Text style={styles.weekdayText}>{day}</Text>
      </View>
    ));

    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<View key={`empty-${i}`} style={styles.dayBox} />);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const thisDate = new Date(year, month, d);
      const isoStr = getISODate(thisDate);

      const isSelected = 
        selectedDate.getDate() === d && 
        selectedDate.getMonth() === month && 
        selectedDate.getFullYear() === year;

      const isToday = 
        new Date().getDate() === d && 
        new Date().getMonth() === month && 
        new Date().getFullYear() === year;

      let isDisabled = false;
      if (minDate && isoStr < minDate) isDisabled = true;
      if (maxDate && isoStr > maxDate) isDisabled = true;

      days.push(
        <TouchableOpacity 
          key={`day-${d}`} 
          style={[styles.dayBox, isSelected && styles.selectedDayBox]} 
          disabled={isDisabled}
          onPress={() => handleSelectDay(d)}
        >
          {isSelected ? (
            <LinearGradient colors={['#1abc9c', '#00796b']} style={styles.selectedDayGradient}>
              <Text style={styles.selectedDayText}>{d}</Text>
            </LinearGradient>
          ) : (
            <Text style={[
              styles.dayText, 
              isToday && styles.todayText,
              isDisabled && styles.disabledDayText
            ]}>{d}</Text>
          )}
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.calendarContainer}>
        <View style={styles.weekRow}>{headers}</View>
        <View style={styles.daysGrid}>{days}</View>
      </View>
    );
  };

  const renderYears = () => {
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 100 }, (_, i) => currentYear - i); // Last 100 years

    return (
      <FlatList
        data={years}
        keyExtractor={(item) => item.toString()}
        numColumns={3}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 10 }}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.yearBox, item === year && styles.selectedYearBox]}
            onPress={() => {
              setCurrentDate(new Date(item, month, 1));
              setViewMode('calendar');
            }}
          >
            <Text style={[styles.yearText, item === year && styles.selectedYearText]}>{item}</Text>
          </TouchableOpacity>
        )}
      />
    );
  };

  const renderMonths = () => {
    return (
      <View style={styles.monthsGrid}>
        {MONTHS.map((m, index) => (
          <TouchableOpacity 
            key={m} 
            style={[styles.monthBox, index === month && styles.selectedMonthBox]}
            onPress={() => {
              setCurrentDate(new Date(year, index, 1));
              setViewMode('calendar');
            }}
          >
            <Text style={[styles.monthText, index === month && styles.selectedMonthText]}>{m.substring(0, 3)}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <Modal transparent visible={visible} animationType="none">
      <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        
        <Animated.View entering={SlideInDown.springify()} exiting={SlideOutDown} style={styles.pickerContainer}>
          <View style={styles.handleBar} />
          
          <View style={styles.header}>
            <Text style={styles.title}>Pilih Tanggal</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#78909c" />
            </TouchableOpacity>
          </View>

          {/* Controls */}
          <View style={styles.controlsRow}>
            {viewMode === 'calendar' && (
              <TouchableOpacity style={styles.arrowBtn} onPress={handlePrevMonth}>
                <Ionicons name="chevron-back" size={24} color="#00796b" />
              </TouchableOpacity>
            )}

            <View style={styles.selectors}>
              <TouchableOpacity style={styles.selectorBtn} onPress={() => setViewMode(viewMode === 'month' ? 'calendar' : 'month')}>
                <Text style={styles.selectorText}>{MONTHS[month]}</Text>
                <MaterialIcons name="arrow-drop-down" size={20} color="#00796b" />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.selectorBtn} onPress={() => setViewMode(viewMode === 'year' ? 'calendar' : 'year')}>
                <Text style={styles.selectorText}>{year}</Text>
                <MaterialIcons name="arrow-drop-down" size={20} color="#00796b" />
              </TouchableOpacity>
            </View>

            {viewMode === 'calendar' && (
              <TouchableOpacity style={styles.arrowBtn} onPress={handleNextMonth}>
                <Ionicons name="chevron-forward" size={24} color="#00796b" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.contentBody}>
            {viewMode === 'calendar' && renderCalendar()}
            {viewMode === 'year' && renderYears()}
            {viewMode === 'month' && renderMonths()}
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
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 10,
    height: 480,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
  },
  handleBar: {
    width: 50,
    height: 5,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#263238',
    letterSpacing: 1,
  },
  closeBtn: {
    padding: 5,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#f8fbfc',
    padding: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0eef0',
  },
  arrowBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  selectors: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'center',
    gap: 15,
  },
  selectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2f1',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },
  selectorText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#00796b',
    marginRight: 5,
  },
  contentBody: {
    flex: 1,
  },
  calendarContainer: {
    flex: 1,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayBox: {
    width: '14.28%',
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#90a4ae',
  },
  dayText: {
    fontSize: 16,
    color: '#37474f',
    fontWeight: '500',
  },
  todayText: {
    color: '#1abc9c',
    fontWeight: '900',
  },
  disabledDayText: {
    color: '#e0e0e0',
  },
  selectedDayBox: {
    backgroundColor: 'transparent',
  },
  selectedDayGradient: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#1abc9c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  selectedDayText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingTop: 10,
  },
  monthBox: {
    width: '30%',
    aspectRatio: 2,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
    marginBottom: 15,
  },
  selectedMonthBox: {
    backgroundColor: '#00796b',
    elevation: 4,
  },
  monthText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#546e7a',
    textTransform: 'uppercase',
  },
  selectedMonthText: {
    color: '#fff',
  },
  yearBox: {
    flex: 1,
    margin: 5,
    height: 50,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
  },
  selectedYearBox: {
    backgroundColor: '#00796b',
    elevation: 4,
  },
  yearText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#546e7a',
  },
  selectedYearText: {
    color: '#fff',
  }
});
