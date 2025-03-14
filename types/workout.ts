export interface Round {
  id: string;
  reps: number;
  weight: number;
  isCompleted: boolean;
}

export interface Workout {
  id: string;
  name: string;
  youtubeLink: string;
  rounds: Round[];
  date: string;
}

export interface DayWorkouts {
  [date: string]: Workout[];
} 