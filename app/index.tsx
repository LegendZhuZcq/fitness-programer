import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Platform, Dimensions, KeyboardAvoidingView, KeyboardAvoidingViewProps, Modal } from 'react-native';
import { format, addWeeks, addDays, subDays } from 'date-fns';
import WeekCalendar from '../components/WeekCalendar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Workout, Round, Exercise, DayWorkouts } from '../types/workout';
import { Ionicons } from '@expo/vector-icons';
import YoutubePlayer from 'react-native-youtube-iframe';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
  GestureEvent,
  PanGestureHandlerEventPayload
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  withSpring,
  runOnJS,
  useSharedValue,
  useAnimatedGestureHandler
} from 'react-native-reanimated';
import { Calendar } from 'react-native-calendars';

const WINDOW_HEIGHT = Dimensions.get('window').height;
const WORKOUT_ITEM_HEIGHT = 200; // Approximate height of a workout card

type GestureContext = {
  startY: number;
};

interface WorkoutWithExercises extends Omit<Workout, 'exercises'> {
  exercises: Exercise[];
}

export default function HomeScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [workouts, setWorkouts] = useState<WorkoutWithExercises[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showWorkoutForm, setShowWorkoutForm] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [newExercise, setNewExercise] = useState<Partial<Exercise>>({
    name: '',
    youtubeLink: '',
    rounds: [{ id: Date.now().toString(), reps: 0, weight: 0, isCompleted: false }],
    isCompleted: false
  });
  const [newWorkoutName, setNewWorkoutName] = useState('');
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [exercisePositions, setExercisePositions] = useState<{ [key: string]: number }>({});
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedWorkoutForMove, setSelectedWorkoutForMove] = useState<string | null>(null);

  useEffect(() => {
    loadWorkouts();
  }, [selectedDate]);

  const loadWorkouts = async () => {
    try {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const savedWorkouts = await AsyncStorage.getItem(`workouts-${formattedDate}`);
      
      if (savedWorkouts) {
        const parsed = JSON.parse(savedWorkouts);
        // Ensure each workout has the required properties
        const validatedWorkouts = parsed.map((workout: Workout) => {
          // Ensure each workout has an exercises array
          const exercises = workout.exercises?.map(exercise => ({
            ...exercise,
            // Ensure each exercise has its own rounds array
            rounds: Array.isArray(exercise.rounds) ? exercise.rounds : [],
            // Ensure required exercise properties
            id: exercise.id || Date.now().toString(),
            name: exercise.name || '',
            date: exercise.date || formattedDate,
            isCompleted: exercise.isCompleted || false
          })) || [];

          return {
            ...workout,
            id: workout.id || Date.now().toString(),
            exercises: exercises,
            note: workout.note || '',
            // Ensure workout level rounds array exists
            rounds: Array.isArray(workout.rounds) ? workout.rounds : [],
            date: workout.date || formattedDate
          };
        });
        
        setWorkouts(validatedWorkouts);
      } else {
        setWorkouts([]);
      }
    } catch (error) {
      console.error('Error loading workouts:', error);
      setWorkouts([]);
    }
  };

  const saveWorkout = async () => {
    if (!newWorkoutName.trim()) {
      Alert.alert('Error', 'Please enter a workout name');
      return;
    }

    try {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const newWorkout: Workout = {
        id: Date.now().toString(),
        name: newWorkoutName,
        exercises: [],
        note: '',
        rounds: [],
        date: formattedDate
      };

      const updatedWorkouts = [...workouts, newWorkout];
      setWorkouts(updatedWorkouts);
      await AsyncStorage.setItem(`workouts-${formattedDate}`, JSON.stringify(updatedWorkouts));
      
      // Reset form state
      setShowWorkoutForm(false);
      setNewWorkoutName('');
    } catch (error) {
      Alert.alert('Error', 'Failed to save workout');
    }
  };

  const saveExercise = async () => {
    if (!newExercise.name) {
      Alert.alert('Error', 'Please fill in exercise name');
      return;
    }

    try {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      let updatedWorkouts = [...workouts];

      // Add/Update exercise in existing workout
      updatedWorkouts = workouts.map(w => {
        if (w.id === selectedWorkout?.id) {
          const exercises = editingExercise 
            ? w.exercises.map(e => e.id === editingExercise.id 
                ? { ...newExercise, id: e.id, date: formattedDate } as Exercise
                : e)
            : [...w.exercises, { ...newExercise, id: Date.now().toString(), date: formattedDate } as Exercise];
          return { ...w, exercises };
        }
        return w;
      });

      setWorkouts(updatedWorkouts);
      await AsyncStorage.setItem(`workouts-${formattedDate}`, JSON.stringify(updatedWorkouts));
      
      // Reset form state
      setShowForm(false);
      setEditingExercise(null);
      setSelectedWorkout(null);
      setNewExercise({
        name: '',
        youtubeLink: '',
        rounds: [{ id: Date.now().toString(), reps: 0, weight: 0, isCompleted: false }],
        isCompleted: false
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to save exercise');
    }
  };

  const startEditingExercise = (workout: Workout, exercise: Exercise) => {
    setEditingExercise(exercise);
    setSelectedWorkout(workout);
    setNewExercise({
      name: exercise.name,
      youtubeLink: exercise.youtubeLink,
      rounds: exercise.rounds,
      isCompleted: exercise.isCompleted
    });
    setShowForm(true);
  };

  const deleteExercise = async (workoutId: string, exerciseId: string) => {
    try {
      const updatedWorkouts = workouts.map(workout => {
        if (workout.id === workoutId) {
          return {
            ...workout,
            exercises: workout.exercises.filter(e => e.id !== exerciseId)
          };
        }
        return workout;
      }).filter(workout => workout.exercises.length > 0); // Remove workouts with no exercises

      setWorkouts(updatedWorkouts);
      await AsyncStorage.setItem(`workouts-${format(selectedDate, 'yyyy-MM-dd')}`, JSON.stringify(updatedWorkouts));
    } catch (error) {
      console.error('Error deleting exercise:', error);
      Alert.alert('Error', 'Failed to delete exercise');
    }
  };

  const updateRound = (workoutId: string, exerciseId: string, roundId: string, isCompleted: boolean) => {
    const updatedWorkouts = workouts.map(workout => {
      if (workout.id === workoutId) {
        return {
          ...workout,
          exercises: workout.exercises.map(exercise => {
            if (exercise.id === exerciseId) {
              return {
                ...exercise,
                rounds: exercise.rounds.map(round => 
                  round.id === roundId ? { ...round, isCompleted } : round
                )
              };
            }
            return exercise;
          })
        };
      }
      return workout;
    });
    
    setWorkouts(updatedWorkouts);
    AsyncStorage.setItem(`workouts-${format(selectedDate, 'yyyy-MM-dd')}`, JSON.stringify(updatedWorkouts));
  };

  const removeExerciseRound = async (workoutId: string, exerciseId: string, roundId: string) => {
    const updatedWorkouts = workouts.map(workout => {
      if (workout.id === workoutId) {
        return {
          ...workout,
          exercises: workout.exercises.map(exercise => {
            if (exercise.id === exerciseId) {
              return {
                ...exercise,
                rounds: exercise.rounds.filter(round => round.id !== roundId)
              };
            }
            return exercise;
          })
        };
      }
      return workout;
    });
    
    setWorkouts(updatedWorkouts);
    await AsyncStorage.setItem(`workouts-${format(selectedDate, 'yyyy-MM-dd')}`, JSON.stringify(updatedWorkouts));
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

  const handleWeekDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleCalendarDateSelect = (day: { dateString: string }) => {
    if (selectedWorkoutForMove) {
      // Create date at start of day in local timezone
      const selectedDate = new Date(day.dateString + 'T00:00:00');
      moveWorkout(selectedWorkoutForMove, selectedDate);
      setSelectedWorkoutForMove(null);
      setShowCalendar(false);
    }
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
    setNewExercise((prev: Partial<Exercise>) => ({
      ...prev,
      rounds: (prev.rounds || []).filter((_: Round, i: number) => i !== index)
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

  const deleteWorkout = async (workoutId: string) => {
    Alert.alert(
      'Delete Workout',
      'Are you sure you want to delete this workout and all its exercises?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedWorkouts = workouts.filter(w => w.id !== workoutId);
              setWorkouts(updatedWorkouts);
              await AsyncStorage.setItem(
                `workouts-${format(selectedDate, 'yyyy-MM-dd')}`,
                JSON.stringify(updatedWorkouts)
              );
            } catch (error) {
              console.error('Error deleting workout:', error);
              Alert.alert('Error', 'Failed to delete workout');
            }
          }
        }
      ]
    );
  };

  const moveWorkout = async (workoutId: string, newDate: Date) => {
    try {
      // Get the workout to move
      const workoutToMove = workouts.find(w => w.id === workoutId);
      if (!workoutToMove) return;

      // Remove workout from current date
      const updatedCurrentWorkouts = workouts.filter(w => w.id !== workoutId);
      await AsyncStorage.setItem(
        `workouts-${format(selectedDate, 'yyyy-MM-dd')}`,
        JSON.stringify(updatedCurrentWorkouts)
      );
      setWorkouts(updatedCurrentWorkouts);

      // Add workout to new date
      const formattedNewDate = format(newDate, 'yyyy-MM-dd');
      const targetDateWorkoutsStr = await AsyncStorage.getItem(`workouts-${formattedNewDate}`);
      const targetDateWorkouts = targetDateWorkoutsStr ? JSON.parse(targetDateWorkoutsStr) : [];
      
      const updatedWorkout = {
        ...workoutToMove,
        date: formattedNewDate,
        exercises: workoutToMove.exercises.map(exercise => ({
          ...exercise,
          date: formattedNewDate
        }))
      };

      await AsyncStorage.setItem(
        `workouts-${formattedNewDate}`,
        JSON.stringify([...targetDateWorkouts, updatedWorkout])
      );

      Alert.alert('Success', 'Workout moved successfully');
    } catch (error) {
      console.error('Error moving workout:', error);
      Alert.alert('Error', 'Failed to move workout');
    }
  };

  const showDatePicker = (workoutId: string) => {
    const today = new Date();
    const formattedToday = format(today, 'yyyy-MM-dd');
    const formattedSelected = format(selectedDate, 'yyyy-MM-dd');

    // Only show "Move to Today" option if we're not already on today's date
    const options = formattedToday !== formattedSelected ? [
      {
        text: 'Move to Today',
        onPress: () => moveWorkout(workoutId, today)
      },
      {
        text: 'Choose Date',
        onPress: () => {
          setSelectedWorkoutForMove(workoutId);
          setShowCalendar(true);
        }
      }
    ] : [
      {
        text: 'Choose Date',
        onPress: () => {
          setSelectedWorkoutForMove(workoutId);
          setShowCalendar(true);
        }
      }
    ];

    Alert.alert(
      'Move Workout',
      'Choose where to move the workout',
      [
        ...options,
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const WorkoutItem = ({ workout, index }: { workout: WorkoutWithExercises; index: number }) => {
    const calculateCompletionPercentage = (workout: WorkoutWithExercises): number => {
      let totalRounds = 0;
      let completedRounds = 0;

      workout.exercises.forEach(exercise => {
        totalRounds += exercise.rounds.length;
        completedRounds += exercise.rounds.filter(round => round.isCompleted).length;
      });

      return totalRounds === 0 ? 0 : Math.round((completedRounds / totalRounds) * 100);
    };

    const completionPercentage = calculateCompletionPercentage(workout);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        {
          translateY: withSpring(
            draggingIndex === index ? exercisePositions[workout.id] || 0 : 0,
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

    const panGesture = useAnimatedGestureHandler<PanGestureHandlerGestureEvent, GestureContext>({
      onStart: (_, context) => {
        context.startY = exercisePositions[workout.id] || 0;
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

    const isAddingExerciseToThisWorkout = selectedWorkout?.id === workout.id && showForm;

    return (
      <PanGestureHandler onGestureEvent={panGesture}>
        <Animated.View style={[styles.workoutCard, animatedStyle]}>
          <View style={styles.workoutTitleContainer}>
            <View style={styles.dragHandle}>
              <Ionicons name="menu" size={24} color="#666" />
            </View>
            <View style={styles.workoutTitleSection}>
              <Text style={styles.workoutTitle}>{workout.name}</Text>
              <View style={[
                styles.completionBadge,
                { backgroundColor: completionPercentage === 100 ? '#4CAF50' : '#00adf5' }
              ]}>
                <Text style={styles.completionText}>{completionPercentage}% Complete</Text>
              </View>
            </View>
            <View style={styles.workoutActions}>
              <TouchableOpacity
                style={styles.moveWorkoutButton}
                onPress={() => showDatePicker(workout.id)}
              >
                <Ionicons name="calendar" size={24} color="#00adf5" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteWorkoutButton}
                onPress={() => deleteWorkout(workout.id)}
              >
                <Ionicons name="trash" size={24} color="#ff6b6b" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.exercisesContainer}>
            {workout.exercises.map((exercise) => (
              <View key={exercise.id} style={styles.exerciseItem}>
                <View style={styles.exerciseHeader}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <View style={styles.exerciseActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => startEditingExercise(workout, exercise)}
                    >
                      <Ionicons name="pencil" size={20} color="#00adf5" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => deleteExercise(workout.id, exercise.id)}
                    >
                      <Ionicons name="trash" size={20} color="#ff6b6b" />
                    </TouchableOpacity>
                  </View>
                </View>

                {exercise.youtubeLink && renderYoutubePlayer(exercise.youtubeLink)}
                
                <View style={styles.roundsContainer}>
                  <Text style={styles.roundsHeader}>Rounds:</Text>
                  {exercise.rounds.map((round, roundIndex) => (
                    <View key={round.id} style={styles.roundItem}>
                      <TouchableOpacity
                        style={styles.checkbox}
                        onPress={() => updateRound(workout.id, exercise.id, round.id, !round.isCompleted)}
                      >
                        {round.isCompleted && <Ionicons name="checkmark" size={24} color="#00adf5" />}
                      </TouchableOpacity>
                      <Text style={styles.roundText}>
                        Round {roundIndex + 1}: {round.reps} reps @ {round.weight} kg
                      </Text>
                      {exercise.rounds.length > 1 && (
                        <TouchableOpacity
                          style={styles.removeRoundButton}
                          onPress={() => removeExerciseRound(workout.id, exercise.id, round.id)}
                        >
                          <Ionicons name="close-circle" size={24} color="#ff6b6b" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            ))}
            
            {isAddingExerciseToThisWorkout ? (
              <View style={styles.exerciseFormContainer}>
                <Text style={styles.formTitle}>Add New Exercise</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Exercise Name"
                  value={newExercise.name}
                  onChangeText={(text) => setNewExercise({ ...newExercise, name: text })}
                />
                <TextInput
                  style={styles.input}
                  placeholder="YouTube Link"
                  value={newExercise.youtubeLink}
                  onChangeText={(text) => setNewExercise({ ...newExercise, youtubeLink: text })}
                />
                
                <Text style={styles.roundsHeader}>Rounds:</Text>
                <View style={styles.roundLabelsContainer}>
                  <View style={styles.roundInputWrapper}>
                    <Text style={styles.inputLabel}>Reps</Text>
                  </View>
                  <View style={styles.roundInputWrapper}>
                    <Text style={styles.inputLabel}>Weight (kg)</Text>
                  </View>
                </View>
                {(newExercise.rounds || []).map((round, index) => (
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
                        value={round.weight.toString()}
                        onChangeText={(text) => updateNewWorkoutRound(index, 'weight', parseInt(text) || 0)}
                      />
                    </View>
                    <TouchableOpacity
                      style={styles.removeRoundButton}
                      onPress={() => removeRound(index)}
                      disabled={newExercise.rounds?.length === 1}
                    >
                      <Ionicons 
                        name="close-circle" 
                        size={24} 
                        color={newExercise.rounds?.length === 1 ? '#ccc' : '#ff6b6b'} 
                      />
                    </TouchableOpacity>
                  </View>
                ))}
                
                <View style={styles.formActions}>
                  <TouchableOpacity
                    style={[styles.button, styles.addRoundButton]}
                    onPress={addRound}
                  >
                    <Text style={styles.addRoundButtonText}>Add Round</Text>
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
                    onPress={saveExercise}
                  >
                    <Text style={styles.buttonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addExerciseButtonContainer}
                onPress={() => {
                  setSelectedWorkout(workout);
                  setShowForm(true);
                }}
              >
                <View style={styles.addExerciseButtonContent}>
                  <Ionicons name="add-circle" size={24} color="#00adf5" />
                  <Text style={styles.addExerciseButtonText}>Add exercise</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </PanGestureHandler>
    );
  };

  const renderWorkoutForm = () => (
    <View style={styles.form}>
      <Text style={styles.formTitle}>Add New Workout</Text>
      <TextInput
        style={styles.input}
        placeholder="Workout Name"
        value={newWorkoutName}
        onChangeText={setNewWorkoutName}
      />
      <View style={styles.formButtons}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={() => {
            setShowWorkoutForm(false);
            setNewWorkoutName('');
          }}
        >
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.saveButton]}
          onPress={saveWorkout}
        >
          <Text style={styles.buttonText}>Save</Text>
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

  const addRound = () => {
    setNewExercise((prev: Partial<Exercise>) => {
      const rounds = prev.rounds || [];
      const lastRound = rounds[rounds.length - 1];
      
      const newRound: Round = {
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

  const updateNewWorkoutRound = (index: number, field: keyof Round, value: number) => {
    setNewExercise((prev: Partial<Exercise>) => ({
      ...prev,
      rounds: (prev.rounds || []).map((round: Round, i: number) => {
        if (i !== index) return round;
        return { ...round, [field]: value };
      })
    }));
  };

  const cancelEdit = () => {
    setShowForm(false);
    setEditingExercise(null);
    setSelectedWorkout(null);
    setNewExercise({
      name: '',
      youtubeLink: '',
      rounds: [{ id: Date.now().toString(), reps: 0, weight: 0, isCompleted: false }],
      isCompleted: false
    });
  };

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
              onDateSelect={handleWeekDateSelect}
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

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              setShowWorkoutForm(true);
              setNewWorkoutName('');
            }}
          >
            <Text style={styles.addButtonText}>Add Workout</Text>
          </TouchableOpacity>
          
          {showWorkoutForm && renderWorkoutForm()}
        </ScrollView>

        <Modal
          visible={showCalendar}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowCalendar(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.calendarContainer}>
              <View style={styles.calendarHeader}>
                <Text style={styles.calendarTitle}>Select Date</Text>
                <TouchableOpacity
                  onPress={() => setShowCalendar(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              <Calendar
                onDayPress={handleCalendarDateSelect}
                markedDates={{
                  [format(selectedDate, 'yyyy-MM-dd')]: {
                    selected: true,
                    selectedColor: '#00adf5'
                  }
                }}
                theme={{
                  todayTextColor: '#00adf5',
                  selectedDayBackgroundColor: '#00adf5',
                  arrowColor: '#00adf5',
                }}
              />
            </View>
          </View>
        </Modal>
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
    marginBottom: 16,
    overflow: 'hidden',
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
    alignItems: 'center',
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
    marginVertical: 8,
  },
  addRoundButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
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
  workoutTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  workoutTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  workoutTitleSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  completionBadge: {
    backgroundColor: '#00adf5',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  completionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  addExerciseButtonContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#00adf5',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  addExerciseButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addExerciseButtonText: {
    color: '#00adf5',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  exerciseCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
  },
  exerciseActions: {
    flexDirection: 'row',
    gap: 8,
  },
  deleteWorkoutButton: {
    padding: 8,
  },
  exercisesContainer: {
    padding: 16,
  },
  exerciseItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  exerciseFormContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#00adf5',
    borderStyle: 'dashed',
  },
  moveWorkoutButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '90%',
    maxWidth: 400,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
}); 