
export const FPS = 60;
export const ROAD_WIDTH = 2000;
export const SEGMENT_LENGTH = 200;
export const RUMBLE_LENGTH = 3;
export const LANES = 3;
export const FOV = 100;
export const CAMERA_HEIGHT = 1000;
export const DRAW_DISTANCE = 300;
export const CAMERA_DEPTH = 1 / Math.tan((FOV / 2) * Math.PI / 180);
export const PLAYER_Z = CAMERA_HEIGHT * CAMERA_DEPTH;

// Gameplay
export const CARS_TO_PASS_PER_DAY = 200; // Day 1 target
export const CARS_TO_PASS_INCREMENT = 100; // Adds up each day (200, 300, etc)

// Physics Tuning
export const MAX_SPEED = 12000; 
export const ACCEL = MAX_SPEED / 2; // Reach max speed in ~2 seconds
export const BREAKING = -MAX_SPEED;
export const DECEL = -MAX_SPEED / 5;
export const OFF_ROAD_DECEL = -MAX_SPEED; // Drastic slow down
export const OFF_ROAD_LIMIT = MAX_SPEED / 10; // Max speed on grass is very slow

export const COLORS = {
  SKY: {
    DAY: '#72D7EE',
    DUSK: '#FF9800',
    NIGHT: '#090909',
    DAWN: '#FFD54F',
    SNOW: '#B3E5FC',
    FOG: '#a0a0a0'
  },
  GROUND: {
    DAY: ['#10AA10', '#009A00'],
    NIGHT: ['#111111', '#0a0a0a'],
    SNOW: ['#E0F7FA', '#B2EBF2'], // White/Ice blue
    FOG: ['#424242', '#616161']    // Grey
  },
  ROAD: {
    DAY: ['#6B6B6B', '#696969'],
    NIGHT: ['#333', '#313131'],
    SNOW: ['#90A4AE', '#78909C'],  // Icy road
    FOG: ['#424242', '#303030']
  }
};
