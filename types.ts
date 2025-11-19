export enum GameState {
  START = 'START',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
  LEVEL_COMPLETE = 'LEVEL_COMPLETE'
}

export interface Point {
  x: number;
  y: number;
  z: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
  w: number;
  scale: number;
}

export interface Segment {
  index: number;
  p1: Point;
  p2: Point;
  color: { road: string; grass: string; rumble: string; lane: string };
  curve: number;
  hill: number; // Slope
  clip: number;
}

export interface Car {
  offset: number; // -1 to 1 (x position)
  z: number;      // Distance from start
  sprite: string; // 'car1', 'car2', etc
  speed: number;
}

export interface Environment {
  sky: string;
  fog: number;
  fogColor: string;
  ground: string[];
  rumble: string[];
  road: string[];
  description: string;
}

export interface PitCrewMessage {
  text: string;
  emotion: 'neutral' | 'happy' | 'angry' | 'panic';
}
