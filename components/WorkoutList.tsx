import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Workout } from '../types/workout';

interface WorkoutListProps {
  workouts: Workout[];
  selectedDate: Date;
  onWorkoutsChange: () => void;
}

export default function WorkoutList({ workouts, selectedDate, onWorkoutsChange }: WorkoutListProps) {
  const handleDeleteWorkout = async (index: number) => {
    Alert.alert(
      'Delete Workout',
      'Are you sure you want to delete this workout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const formattedDate = format(selectedDate, 'yyyy-MM-dd');
            const updatedWorkouts = [...workouts];
            updatedWorkouts.splice(index, 1);
            await AsyncStorage.setItem(
              `workouts-${formattedDate}`,
              JSON.stringify(updatedWorkouts)
            );
            onWorkoutsChange();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.dateText}>{format(selectedDate, 'MMMM d, yyyy')}</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => {
            // TODO: Implement add workout functionality
          }}
        >
          <Ionicons name="add-circle" size={24} color="#00adf5" />
          <Text style={styles.addButtonText}>Add Workout</Text>
        </TouchableOpacity>
      </View>

      {workouts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No workouts for this day</Text>
          <Text style={styles.emptySubText}>Tap the + button to add a workout</Text>
        </View>
      ) : (
        <View style={styles.workoutList}>
          {workouts.map((workout, index) => (
            <View key={index} style={styles.workoutItem}>
              <View style={styles.workoutInfo}>
                <Text style={styles.workoutName}>{workout.name}</Text>
                <Text style={styles.workoutDetails}>
                  {workout.rounds?.length || 0} rounds
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleDeleteWorkout(index)}
                style={styles.deleteButton}
              >
                <Ionicons name="trash-outline" size={20} color="#ff4444" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    padding: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#00adf5',
    marginLeft: 4,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
  },
  workoutList: {
    gap: 12,
  },
  workoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  workoutInfo: {
    flex: 1,
  },
  workoutName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  workoutDetails: {
    fontSize: 14,
    color: '#666',
  },
  deleteButton: {
    padding: 8,
  },
}); 