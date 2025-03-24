import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const DAY_BUTTON_SIZE = (width - 32) / 7; // 32 is total horizontal padding

interface WeekCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onWeekChange: (direction: 'prev' | 'next') => void;
}

export default function WeekCalendar({ selectedDate, onDateSelect, onWeekChange }: WeekCalendarProps) {
  const [datesWithWorkouts, setDatesWithWorkouts] = useState<string[]>([]);
  const startDate = startOfWeek(selectedDate, { weekStartsOn: 1 });

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(startDate, i);
    return {
      date,
      dayName: format(date, 'EEE'),
      dayNumber: format(date, 'd'),
      formattedDate: format(date, 'yyyy-MM-dd'),
      isToday: isSameDay(date, new Date()),
    };
  });

  useEffect(() => {
    checkWorkoutsForWeek();
  }, [selectedDate]);

  const checkWorkoutsForWeek = async () => {
    try {
      const datesWithWorkouts = await Promise.all(
        weekDays.map(async ({ formattedDate }) => {
          const workouts = await AsyncStorage.getItem(`workouts-${formattedDate}`);
          if (workouts) {
            const parsedWorkouts = JSON.parse(workouts);
            return parsedWorkouts.length > 0 ? formattedDate : null;
          }
          return null;
        })
      );
      setDatesWithWorkouts(datesWithWorkouts.filter(Boolean) as string[]);
    } catch (error) {
      console.error('Error checking workouts:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.arrowButton}
          onPress={() => onWeekChange('prev')}
        >
          <Ionicons name="chevron-back" size={24} color="#00adf5" />
        </TouchableOpacity>
        <Text style={styles.monthText}>
          {format(selectedDate, 'MMMM yyyy')}
        </Text>
        <TouchableOpacity 
          style={styles.arrowButton}
          onPress={() => onWeekChange('next')}
        >
          <Ionicons name="chevron-forward" size={24} color="#00adf5" />
        </TouchableOpacity>
      </View>
      <View style={styles.weekContainer}>
        {weekDays.map(({ date, dayName, dayNumber, formattedDate, isToday }) => {
          const isSelected = isSameDay(date, selectedDate);
          const hasWorkout = datesWithWorkouts.includes(formattedDate);
          
          return (
            <TouchableOpacity
              key={date.toISOString()}
              style={[
                styles.dayButton,
                isToday && styles.todayButton,
                isSelected && styles.selectedDay,
              ]}
              onPress={() => onDateSelect(date)}
            >
              <Text style={[
                styles.dayName,
                isSelected && styles.selectedText,
                isToday && styles.todayText
              ]}>
                {dayName}
              </Text>
              <View style={[
                styles.dayNumberContainer,
                isSelected && styles.selectedDayNumber,
              ]}>
                <Text style={[
                  styles.dayNumber,
                  isSelected && styles.selectedText,
                  isToday && styles.todayText
                ]}>
                  {dayNumber}
                </Text>
              </View>
              {hasWorkout && (
                <View style={[
                  styles.workoutDot,
                  isSelected && styles.selectedDot
                ]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  monthText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  arrowButton: {
    padding: 8,
  },
  weekContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  dayButton: {
    width: DAY_BUTTON_SIZE,
    height: DAY_BUTTON_SIZE + 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  selectedDay: {
    backgroundColor: '#00adf5',
    transform: [{ scale: 1.1 }],
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  todayButton: {
    borderWidth: 1,
    borderColor: '#00adf5',
  },
  dayName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  dayNumberContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  selectedDayNumber: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  selectedText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  todayText: {
    color: '#00adf5',
  },
  workoutDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#00adf5',
    marginTop: 2,
  },
  selectedDot: {
    backgroundColor: '#fff',
  },
}); 