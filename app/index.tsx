import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { router } from 'expo-router';
import {calendarTheme} from  '@/constants/Calendar-theme';


export default function CalendarScreen() {
  const [selected, setSelected] = useState('');

  const onDayPress = useCallback((day: { dateString: string }) => {
    setSelected(day.dateString);
    router.push(`/workout/${day.dateString}`);
  }, []);

  return (
    <View style={styles.container}>
      <Calendar
        theme={calendarTheme}
        onDayPress={onDayPress}
        markedDates={{
          [selected]: {
            selected: true,
            disableTouchEvent: true,
            selectedColor: '#00adf5'
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  }
}); 