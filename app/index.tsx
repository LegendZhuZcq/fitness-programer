import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { router } from 'expo-router';
import { Theme } from 'react-native-calendars/src/types';

const calendarTheme: Theme = {
  backgroundColor: '#ffffff',
  calendarBackground: '#ffffff',
  textSectionTitleColor: '#b6c1cd',
  selectedDayBackgroundColor: '#00adf5',
  selectedDayTextColor: '#ffffff',
  todayTextColor: '#00adf5',
  dayTextColor: '#2d4150',
  textDisabledColor: '#d9e1e8',
  dotColor: '#00adf5',
  selectedDotColor: '#ffffff',
  arrowColor: 'orange',
  monthTextColor: '#2d4150',
  textDayFontFamily: 'System',
  textMonthFontFamily: 'System',
  textDayHeaderFontFamily: 'System',
  textDayFontSize: 16,
  textMonthFontSize: 18,
  textDayHeaderFontSize: 14
};

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