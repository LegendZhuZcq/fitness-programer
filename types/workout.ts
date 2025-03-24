export interface Workout {
  id: string;
  name: string;
  youtubeLink: string;
  rounds: Round[];
  date: string;
  notes?: string;
}

export interface Round {
  id: string;
  reps: number;
  weight: number;
  isCompleted: boolean;
}

export interface DayWorkouts {
  [date: string]: Workout[];
} 