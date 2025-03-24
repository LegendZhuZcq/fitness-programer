import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Dimensions
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import YoutubePlayer from 'react-native-youtube-iframe';
import { Workout, Round } from '../../types/workout';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import {
  PanGestureHandler,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { format } from 'date-fns';

const WINDOW_HEIGHT = Dimensions.get('window').height;

export default function WorkoutScreen() {
  const { date, displayDate } = useLocalSearchParams();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [newWorkout, setNewWorkout] = useState<Partial<Workout>>({
    name: '',
    youtubeLink: '',
    rounds: [{ id: Date.now().toString(), reps: 0, weight: 0, isCompleted: false }]
  });
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [workoutPositions, setWorkoutPositions] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    loadWorkouts();
  }, []);

  const loadWorkouts = async () => {
    try {
      const savedWorkouts = await AsyncStorage.getItem(`workouts-${date}`);
      if (savedWorkouts) {
        const parsed = JSON.parse(savedWorkouts);
        const validatedWorkouts = parsed.map((workout: Workout) => ({
          ...workout,
          rounds: workout.rounds || []
        }));
        setWorkouts(validatedWorkouts);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load workouts');
    }
  };

  const saveWorkout = async () => {
    if (!newWorkout.name) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    try {
      let updatedWorkouts;
      if (editingWorkout) {
        // Update existing workout
        updatedWorkouts = workouts.map(w => 
          w.id === editingWorkout.id 
            ? { ...editingWorkout, ...newWorkout, rounds: newWorkout.rounds || [] }
            : w
        );
      } else {
        // Add new workout
        const workout: Workout = {
          id: Date.now().toString(),
          name: newWorkout.name || '',
          youtubeLink: newWorkout.youtubeLink || '',
          rounds: newWorkout.rounds || [],
          date: date as string
        };
        updatedWorkouts = [...workouts, workout];
      }

      await AsyncStorage.setItem(`workouts-${date}`, JSON.stringify(updatedWorkouts));
      setWorkouts(updatedWorkouts);
      setShowForm(false);
      setEditingWorkout(null);
      setNewWorkout({
        name: '',
        youtubeLink: '',
        rounds: [{ id: Date.now().toString(), reps: 0, weight: 0, isCompleted: false }]
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to save workout');
    }
  };

  const startEditingWorkout = (workout: Workout) => {
    setEditingWorkout(workout);
    setNewWorkout({
      name: workout.name,
      youtubeLink: workout.youtubeLink,
      rounds: workout.rounds
    });
    setShowForm(true);
  };

  const cancelEdit = () => {
    setShowForm(false);
    setEditingWorkout(null);
    setNewWorkout({
      name: '',
      youtubeLink: '',
      rounds: [{ id: Date.now().toString(), reps: 0, weight: 0, isCompleted: false }]
    });
  };

  const deleteWorkout = (workoutId: string, workoutName: string) => {
    Alert.alert(
      'Delete Workout',
      `Are you sure you want to delete "${workoutName}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedWorkouts = workouts.filter(w => w.id !== workoutId);
            try {
              await AsyncStorage.setItem(`workouts-${date}`, JSON.stringify(updatedWorkouts));
              setWorkouts(updatedWorkouts);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete workout');
            }
          }
        }
      ]
    );
  };

  const addRound = () => {
    setNewWorkout(prev => ({
      ...prev,
      rounds: [...(prev.rounds || []), { id: Date.now().toString(), reps: 0, weight: 0, isCompleted: false }]
    }));
  };

  const updateRound = (workoutId: string, roundId: string, isCompleted: boolean) => {
    const updatedWorkouts = workouts.map(workout => {
      if (workout.id === workoutId) {
        return {
          ...workout,
          rounds: (workout.rounds || []).map(round => 
            round.id === roundId ? { ...round, isCompleted } : round
          )
        };
      }
      return workout;
    });
    
    setWorkouts(updatedWorkouts);
    AsyncStorage.setItem(`workouts-${date}`, JSON.stringify(updatedWorkouts));
  };

  const updateNewWorkoutRound = (index: number, field: keyof Round, value: number) => {
    setNewWorkout(prev => ({
      ...prev,
      rounds: (prev.rounds || []).map((round, i) => 
        i === index ? { ...round, [field]: value } : round
      )
    }));
  };

  const getYoutubeVideoId = (url: string) => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : '';
  };

  const renderYoutubePlayer = (url: string) => {
    const videoId = getYoutubeVideoId(url);
    if (Platform.OS === 'web') {
      return (
        <iframe
          width="100%"
          height="200"
          src={`https://www.youtube.com/embed/${videoId}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    }
    return (
      <YoutubePlayer
        height={200}
        videoId={videoId}
      />
    );
  };

  const reorderWorkouts = useCallback((fromIndex: number, toIndex: number) => {
    const newWorkouts = [...workouts];
    const [movedWorkout] = newWorkouts.splice(fromIndex, 1);
    newWorkouts.splice(toIndex, 0, movedWorkout);
    setWorkouts(newWorkouts);
    
    AsyncStorage.setItem(`workouts-${date}`, JSON.stringify(newWorkouts));
  }, [workouts, date]);

  const onGestureEvent = useCallback((index: number) => 
    useAnimatedGestureHandler({
      onStart: (_, context: any) => {
        context.startY = workoutPositions[workouts[index].id] || 0;
        runOnJS(setDraggingIndex)(index);
      },
      onActive: (event, context) => {
        const newY = context.startY + event.translationY;
        const newIndex = Math.round(newY / 150); // Approximate height of a workout card
        
        if (newIndex !== index && newIndex >= 0 && newIndex < workouts.length) {
          runOnJS(reorderWorkouts)(index, newIndex);
          runOnJS(setDraggingIndex)(newIndex);
        }
      },
      onEnd: () => {
        runOnJS(setDraggingIndex)(null);
      },
    }), [workouts, workoutPositions, reorderWorkouts]);

  const WorkoutItem = useCallback(({ workout, index }: { workout: Workout; index: number }) => {
    const animatedStyle = useAnimatedStyle(() => ({
      zIndex: draggingIndex === index ? 1 : 0,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: draggingIndex === index ? 5 : 0,
      },
      shadowOpacity: draggingIndex === index ? 0.25 : 0,
      shadowRadius: draggingIndex === index ? 3.84 : 0,
      elevation: draggingIndex === index ? 5 : 0,
    }));

    return (
      <PanGestureHandler onGestureEvent={onGestureEvent(index)}>
        <Animated.View 
          style={[animatedStyle]}
          onLayout={(event) => {
            const { y } = event.nativeEvent.layout;
            setWorkoutPositions(prev => ({ ...prev, [workout.id]: y }));
          }}
        >
          <View key={workout.id}>
            <View style={styles.workoutCard}>
              <View style={styles.workoutHeader}>
                <View style={styles.dragHandle}>
                  <Ionicons name="menu" size={24} color="#666" />
                </View>
                <Text style={styles.workoutName}>{workout.name}</Text>
                <View style={styles.workoutActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => startEditingWorkout(workout)}
                  >
                    <Ionicons name="pencil" size={20} color="#00adf5" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => deleteWorkout(workout.id, workout.name)}
                  >
                    <Ionicons name="trash" size={20} color="#ff6b6b" />
                  </TouchableOpacity>
                </View>
              </View>
              {renderYoutubePlayer(workout.youtubeLink)}
              <View style={styles.roundsContainer}>
                <Text style={styles.roundsHeader}>Rounds:</Text>
                {(workout.rounds || []).map((round, index) => (
                  <View key={round.id} style={styles.roundItem}>
                    <TouchableOpacity
                      style={styles.checkbox}
                      onPress={() => updateRound(workout.id, round.id, !round.isCompleted)}
                    >
                      {round.isCompleted && <Ionicons name="checkmark" size={24} color="#00adf5" />}
                    </TouchableOpacity>
                    <Text style={styles.roundText}>
                      Round {index + 1}: {round.reps} reps @ {round.weight}kg
                    </Text>
                  </View>
                ))}
              </View>
            </View>
            {editingWorkout?.id === workout.id && renderForm(true, workout)}
          </View>
        </Animated.View>
      </PanGestureHandler>
    );
  }, [draggingIndex, editingWorkout, workouts]);

  const renderForm = (isEditing: boolean = false, workout?: Workout) => (
    <View style={styles.form}>
      <Text style={styles.formTitle}>
        {isEditing ? 'Edit Workout' : 'Add New Workout'}
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Workout Name"
        value={newWorkout.name}
        onChangeText={(text) => setNewWorkout({ ...newWorkout, name: text })}
      />
      <TextInput
        style={styles.input}
        placeholder="YouTube Link"
        value={newWorkout.youtubeLink}
        onChangeText={(text) => setNewWorkout({ ...newWorkout, youtubeLink: text })}
      />
      
      <Text style={styles.roundsHeader}>Rounds:</Text>
      {(newWorkout.rounds || []).map((round, index) => (
        <View key={round.id} style={styles.roundInputContainer}>
          <Text style={styles.roundLabel}>Round {index + 1}:</Text>
          <TextInput
            style={styles.roundInput}
            placeholder="Reps"
            keyboardType="numeric"
            value={round.reps.toString()}
            onChangeText={(text) => updateNewWorkoutRound(index, 'reps', parseInt(text) || 0)}
          />
          <TextInput
            style={styles.roundInput}
            placeholder="Weight (kg)"
            keyboardType="numeric"
            value={round.weight.toString()}
            onChangeText={(text) => updateNewWorkoutRound(index, 'weight', parseInt(text) || 0)}
          />
        </View>
      ))}
      
      <TouchableOpacity
        style={styles.addRoundButton}
        onPress={addRound}
      >
        <Text style={styles.addRoundButtonText}>Add Round</Text>
      </TouchableOpacity>

      <View style={styles.formButtons}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={cancelEdit}
        >
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.saveButton]}
          onPress={saveWorkout}
        >
          <Text style={styles.buttonText}>
            {isEditing ? 'Update' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderNoWorkouts = () => (
    <View style={styles.noWorkoutsContainer}>
      <Ionicons name="barbell-outline" size={64} color="#ccc" />
      <Text style={styles.noWorkoutsText}>
        No workouts have been programmed for this day
      </Text>
    </View>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
        <Text style={styles.dateHeader}>
          Workouts for {displayDate?.toString().replace(/-/g, ' ')}
        </Text>
        
        {workouts.length === 0 ? (
          renderNoWorkouts()
        ) : (
          workouts.map((workout, index) => (
            <WorkoutItem key={workout.id} workout={workout} index={index} />
          ))
        )}

        {!showForm && !editingWorkout && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowForm(true)}
          >
            <Text style={styles.addButtonText}>Add Workout</Text>
          </TouchableOpacity>
        )}
        
        {showForm && !editingWorkout && renderForm()}
      </ScrollView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  dateHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  workoutCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  workoutName: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
  },
  roundsContainer: {
    marginTop: 12,
  },
  roundsHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  roundItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#00adf5',
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roundText: {
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#00adf5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  form: {
    marginTop: 16,
  },
  input: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  roundInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  roundLabel: {
    width: 80,
    fontSize: 16,
  },
  roundInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  addRoundButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 8,
  },
  addRoundButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#ff6b6b',
  },
  saveButton: {
    backgroundColor: '#00adf5',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  workoutActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  dragHandle: {
    padding: 8,
    marginRight: 8,
  },
  noWorkoutsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginVertical: 16,
  },
  noWorkoutsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
  },
}); 