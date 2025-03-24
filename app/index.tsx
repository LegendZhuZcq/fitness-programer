import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Platform, Dimensions, KeyboardAvoidingView, KeyboardAvoidingViewProps } from 'react-native';
import { format, addWeeks } from 'date-fns';
import WeekCalendar from '../components/WeekCalendar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Workout, Round } from '../types/workout';
import { Ionicons } from '@expo/vector-icons';
import YoutubePlayer from 'react-native-youtube-iframe';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

const WINDOW_HEIGHT = Dimensions.get('window').height;
const WORKOUT_ITEM_HEIGHT = 200; // Approximate height of a workout card

export default function HomeScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [editingWeightUnit, setEditingWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [newWorkout, setNewWorkout] = useState<Partial<Workout>>({
    name: '',
    youtubeLink: '',
    rounds: [{ id: Date.now().toString(), reps: 0, weight: 0, isCompleted: false }]
  });
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [workoutPositions, setWorkoutPositions] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    loadWorkouts();
    loadWeightUnitPreference();
  }, [selectedDate]);

  const loadWorkouts = async () => {
    try {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const savedWorkouts = await AsyncStorage.getItem(`workouts-${formattedDate}`);
      if (savedWorkouts) {
        const parsed = JSON.parse(savedWorkouts);
        const validatedWorkouts = parsed.map((workout: Workout) => ({
          ...workout,
          rounds: workout.rounds || []
        }));
        setWorkouts(validatedWorkouts);
      } else {
        setWorkouts([]);
      }
    } catch (error) {
      console.error('Error loading workouts:', error);
      setWorkouts([]);
    }
  };

  const loadWeightUnitPreference = async () => {
    try {
      const savedUnit = await AsyncStorage.getItem('weightUnit');
      if (savedUnit) {
        setWeightUnit(savedUnit as 'kg' | 'lbs');
        setEditingWeightUnit(savedUnit as 'kg' | 'lbs');
      }
    } catch (error) {
      console.error('Error loading weight unit preference:', error);
    }
  };

  const toggleWeightUnit = async () => {
    const newUnit = editingWeightUnit === 'kg' ? 'lbs' : 'kg';
    setEditingWeightUnit(newUnit);
  };

  const convertWeight = (weight: number, from: 'kg' | 'lbs', to: 'kg' | 'lbs'): number => {
    if (from === to) return weight;
    return from === 'kg' ? weight * 2.20462 : weight / 2.20462;
  };

  const displayWeight = (weight: number, isEditing: boolean = false): string => {
    const unit = isEditing ? editingWeightUnit : weightUnit;
    const converted = unit === 'kg' ? weight : convertWeight(weight, 'kg', 'lbs');
    return `${Math.round(converted)} ${unit}`;
  };

  const saveWorkout = async () => {
    if (!newWorkout.name) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    try {
      let updatedWorkouts;
      if (editingWorkout) {
        updatedWorkouts = workouts.map(w => 
          w.id === editingWorkout.id 
            ? { ...editingWorkout, ...newWorkout, rounds: newWorkout.rounds || [] }
            : w
        );
      } else {
        const workout: Workout = {
          id: Date.now().toString(),
          name: newWorkout.name || '',
          youtubeLink: newWorkout.youtubeLink || '',
          rounds: newWorkout.rounds || [],
          date: format(selectedDate, 'yyyy-MM-dd')
        };
        updatedWorkouts = [...workouts, workout];
      }

      await AsyncStorage.setItem(`workouts-${format(selectedDate, 'yyyy-MM-dd')}`, JSON.stringify(updatedWorkouts));
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

  const deleteWorkout = async (workoutId: string, workoutName: string) => {
    try {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const updatedWorkouts = workouts.filter(w => w.id !== workoutId);
      await AsyncStorage.setItem(`workouts-${formattedDate}`, JSON.stringify(updatedWorkouts));
      setWorkouts(updatedWorkouts);
    } catch (error) {
      console.error('Error deleting workout:', error);
      Alert.alert('Error', 'Failed to delete workout');
    }
  };

  const addRound = () => {
    setNewWorkout(prev => {
      const rounds = prev.rounds || [];
      const lastRound = rounds[rounds.length - 1];
      
      const newRound = {
        id: Date.now().toString(),
        reps: rounds.length === 0 ? 1 : lastRound.reps,
        weight: rounds.length === 0 ? 0 : lastRound.weight,
        isCompleted: false
      };

      return {
        ...prev,
        rounds: [...rounds, newRound]
      };
    });
  };

  const updateRound = (workoutId: string, roundId: string, isCompleted: boolean) => {
    const updatedWorkouts = workouts.map(workout => {
      if (workout.id === workoutId) {
        return {
          ...workout,
          rounds: workout.rounds.map(round => 
            round.id === roundId ? { ...round, isCompleted } : round
          )
        };
      }
      return workout;
    });
    
    setWorkouts(updatedWorkouts);
    AsyncStorage.setItem(`workouts-${format(selectedDate, 'yyyy-MM-dd')}`, JSON.stringify(updatedWorkouts));
  };

  const updateNewWorkoutRound = (index: number, field: keyof Round, value: number) => {
    setNewWorkout(prev => ({
      ...prev,
      rounds: (prev.rounds || []).map((round, i) => {
        if (i !== index) return round;
        if (field === 'weight' && editingWeightUnit === 'lbs') {
          // Convert lbs to kg for storage
          value = convertWeight(value, 'lbs', 'kg');
        }
        return { ...round, [field]: value };
      })
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

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleWeekChange = (direction: 'prev' | 'next') => {
    setSelectedDate(current => 
      direction === 'next' 
        ? addWeeks(current, 1)
        : addWeeks(current, -1)
    );
  };

  const reorderWorkouts = async (fromIndex: number, toIndex: number) => {
    const newWorkouts = [...workouts];
    const [movedWorkout] = newWorkouts.splice(fromIndex, 1);
    newWorkouts.splice(toIndex, 0, movedWorkout);
    setWorkouts(newWorkouts);
    
    // Save the new order
    const formattedDate = format(selectedDate, 'yyyy-MM-dd');
    await AsyncStorage.setItem(`workouts-${formattedDate}`, JSON.stringify(newWorkouts));
  };

  const removeRound = (index: number) => {
    setNewWorkout(prev => ({
      ...prev,
      rounds: (prev.rounds || []).filter((_, i) => i !== index)
    }));
  };

  const removeWorkoutRound = async (workoutId: string, roundId: string) => {
    const updatedWorkouts = workouts.map(workout => {
      if (workout.id === workoutId) {
        return {
          ...workout,
          rounds: workout.rounds.filter(round => round.id !== roundId)
        };
      }
      return workout;
    });
    
    setWorkouts(updatedWorkouts);
    await AsyncStorage.setItem(`workouts-${format(selectedDate, 'yyyy-MM-dd')}`, JSON.stringify(updatedWorkouts));
  };

  const WorkoutItem = ({ workout, index }: { workout: Workout; index: number }) => {
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        {
          translateY: withSpring(
            draggingIndex === index ? workoutPositions[workout.id] || 0 : 0,
            { damping: 50 }
          )
        }
      ],
      zIndex: draggingIndex === index ? 1 : 0,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: draggingIndex === index ? 10 : 0,
      },
      shadowOpacity: draggingIndex === index ? 0.3 : 0,
      shadowRadius: draggingIndex === index ? 10 : 0,
      elevation: draggingIndex === index ? 5 : 0,
    }));

    const panGesture = useAnimatedGestureHandler({
      onStart: (_, context: any) => {
        context.startY = workoutPositions[workout.id] || 0;
        runOnJS(setDraggingIndex)(index);
      },
      onActive: (event, context) => {
        const newY = context.startY + event.translationY;
        const newIndex = Math.round(newY / WORKOUT_ITEM_HEIGHT);
        
        if (newIndex !== index && newIndex >= 0 && newIndex < workouts.length) {
          runOnJS(reorderWorkouts)(index, newIndex);
          runOnJS(setDraggingIndex)(newIndex);
        }
      },
      onEnd: () => {
        runOnJS(setDraggingIndex)(null);
      },
    });

    return (
      <PanGestureHandler onGestureEvent={panGesture}>
        <Animated.View 
          style={[styles.workoutCardContainer, animatedStyle]}
          onLayout={(event) => {
            const { y } = event.nativeEvent.layout;
            setWorkoutPositions(prev => ({ ...prev, [workout.id]: y }));
          }}
        >
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
            {workout.youtubeLink && renderYoutubePlayer(workout.youtubeLink)}
            <View style={styles.roundsContainer}>
              <Text style={styles.roundsHeader}>Rounds:</Text>
              {workout.rounds.map((round, roundIndex) => (
                <View key={round.id} style={styles.roundItem}>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => updateRound(workout.id, round.id, !round.isCompleted)}
                  >
                    {round.isCompleted && <Ionicons name="checkmark" size={24} color="#00adf5" />}
                  </TouchableOpacity>
                  <Text style={styles.roundText}>
                    Round {roundIndex + 1}: {round.reps} reps @ {displayWeight(round.weight, true)}
                  </Text>
                  {workout.rounds.length > 1 && (
                    <TouchableOpacity
                      style={styles.removeRoundButton}
                      onPress={() => removeWorkoutRound(workout.id, round.id)}
                    >
                      <Ionicons name="close-circle" size={24} color="#ff6b6b" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          </View>
          {editingWorkout?.id === workout.id && renderForm(true)}
        </Animated.View>
      </PanGestureHandler>
    );
  };

  const renderForm = (isEditing: boolean = false) => (
    <View style={styles.form}>
      <Text style={styles.formTitle}>
        {isEditing ? 'Edit Exercose' : 'Add New Exercise'}
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Exercise Name"
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
      <View style={styles.roundLabelsContainer}>
        <View style={styles.roundInputWrapper}>
          <Text style={styles.inputLabel}>Reps</Text>
        </View>
        <View style={styles.roundInputWrapper}>
          <Text style={styles.inputLabel}>Weight ({editingWeightUnit})</Text>
        </View>
      </View>
      {(newWorkout.rounds || []).map((round, index) => (
        <View key={round.id} style={styles.roundInputContainer}>
          <Text style={styles.roundLabel}>Round {index + 1}</Text>
          <View style={styles.roundInputWrapper}>
            <TextInput
              style={styles.roundInput}
              placeholder="Reps"
              keyboardType="numeric"
              value={round.reps.toString()}
              onChangeText={(text) => updateNewWorkoutRound(index, 'reps', parseInt(text) || 0)}
            />
          </View>
          <View style={styles.roundInputWrapper}>
            <TextInput
              style={styles.roundInput}
              placeholder="Weight"
              keyboardType="numeric"
              value={editingWeightUnit === 'kg' ? 
                round.weight.toString() : 
                Math.round(convertWeight(round.weight, 'kg', 'lbs')).toString()}
              onChangeText={(text) => updateNewWorkoutRound(index, 'weight', parseInt(text) || 0)}
            />
          </View>
          <TouchableOpacity
            style={styles.removeRoundButton}
            onPress={() => removeRound(index)}
            disabled={newWorkout.rounds?.length === 1}
          >
            <Ionicons 
              name="close-circle" 
              size={24} 
              color={newWorkout.rounds?.length === 1 ? '#ccc' : '#ff6b6b'} 
            />
          </TouchableOpacity>
        </View>
      ))}
      
      <View style={styles.formActions}>
        <TouchableOpacity
          style={styles.addRoundButton}
          onPress={addRound}
        >
          <Text style={styles.addRoundButtonText}>Add Round</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.unitToggle}
          onPress={toggleWeightUnit}
        >
          <Text style={styles.unitToggleText}>
            {editingWeightUnit.toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>

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
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView 
          style={styles.scrollView}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollViewContent}
        >
          <View style={styles.header}>
            <WeekCalendar
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              onWeekChange={handleWeekChange}
            />
          </View>
          
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
      </KeyboardAvoidingView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 120 : 80,
  },
  workoutCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dragHandle: {
    padding: 8,
    marginRight: 8,
  },
  workoutName: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
  },
  workoutActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
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
    justifyContent: 'space-between',
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
    flex: 1,
    marginRight: 8,
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
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  input: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  roundLabelsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  roundNumberLabel: {
    width: 80,
  },
  roundInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  roundLabel: {
    width: 80,
    fontSize: 16,
  },
  roundInputWrapper: {
    flex: 1,
    marginHorizontal: 4,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  roundInput: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
  },
  formActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  addRoundButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  addRoundButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  unitToggle: {
    backgroundColor: '#00adf5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitToggleText: {
    color: '#fff',
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
  workoutCardContainer: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  removeRoundButton: {
    padding: 8,
    marginLeft: 4,
  },
}); 