
import React, { useRef, useEffect, useCallback } from 'react';
import { 
  FPS, ROAD_WIDTH, SEGMENT_LENGTH, RUMBLE_LENGTH, FOV, 
  CAMERA_HEIGHT, CAMERA_DEPTH, DRAW_DISTANCE, MAX_SPEED, ACCEL, 
  BREAKING, DECEL, OFF_ROAD_DECEL, OFF_ROAD_LIMIT, COLORS, PLAYER_Z,
  CARS_TO_PASS_PER_DAY, CARS_TO_PASS_INCREMENT
} from '../constants';
import { Segment, Car, GameState, Environment } from '../types';
import { audioService } from '../services/audioService';

interface GameCanvasProps {
  gameState: GameState;
  onStatsUpdate: (speed: number, passed: number, position: number, day: number, remaining: number, sunPosition: number) => void;
  onCollision: () => void;
  onLevelComplete: () => void;
  onGameOver: () => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ 
  gameState, 
  onStatsUpdate, 
  onCollision,
  onLevelComplete,
  onGameOver
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  const statsUpdateRef = useRef(onStatsUpdate);
  const collisionRef = useRef(onCollision);
  const levelCompleteRef = useRef(onLevelComplete);
  const gameOverRef = useRef(onGameOver);

  useEffect(() => { statsUpdateRef.current = onStatsUpdate; }, [onStatsUpdate]);
  useEffect(() => { collisionRef.current = onCollision; }, [onCollision]);
  useEffect(() => { levelCompleteRef.current = onLevelComplete; }, [onLevelComplete]);
  useEffect(() => { gameOverRef.current = onGameOver; }, [onGameOver]);

  const segments = useRef<Segment[]>([]);
  const cars = useRef<Car[]>([]);
  const playerX = useRef(0);
  const position = useRef(0);
  const speed = useRef(0);
  const timeOfDay = useRef(0); 
  const dayCounter = useRef(1);
  const totalCarsPassed = useRef(0); 
  const levelCompleteTriggered = useRef(false);
  
  const envRef = useRef<Environment>({
    sky: COLORS.SKY.DAY,
    fog: 0,
    fogColor: COLORS.SKY.DAY,
    ground: COLORS.GROUND.DAY,
    rumble: ['#555', '#BBBBBB'],
    road: COLORS.ROAD.DAY,
    description: 'Sunny'
  });

  // Helper: Utils
  const easeIn = (a: number, b: number, percent: number) => a + (b - a) * Math.pow(percent, 2);
  const easeInOut = (a: number, b: number, percent: number) => a + (b - a) * ((-Math.cos(percent * Math.PI) / 2) + 0.5);
  const percentRemaining = (n: number, total: number) => (n % total) / total;
  const lerp = (a: number, b: number, percent: number) => a + (b - a) * percent;

  // --- Input Handling ---
  const keys = useRef<{ [key: string]: boolean }>({});
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => keys.current[e.code] = true;
    const handleKeyUp = (e: KeyboardEvent) => keys.current[e.code] = false;
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // --- Track Generation ---
  const resetRoad = useCallback((newDay = false) => {
    if (newDay) {
        // New Day: Reset passed counter for the new day's target
        // Note: In strict Enduro, you keep the total, but the logic here is daily target.
        // Let's reset the "daily passed" concept visually but track total internally if needed.
        // For simplicity, we reset `totalCarsPassed` so the counter starts at target and goes down.
        totalCarsPassed.current = 0;
    } else {
        // Full Game Reset
        totalCarsPassed.current = 0;
        speed.current = 0;
        position.current = 0;
        timeOfDay.current = 0;
        dayCounter.current = 1;
    }
    
    levelCompleteTriggered.current = false;

    // Determine Weather Condition based on Day
    const weatherCycle = (dayCounter.current - 1) % 3; 
    
    // We still regenerate track to change colors/layout slightly
    segments.current = [];
    const addSegment = (curve: number, y: number) => {
      const n = segments.current.length;
      const lastY = n === 0 ? 0 : segments.current[n - 1].p2.y;
      
      // Select Colors based on Weather
      let roadColors = COLORS.ROAD.DAY;
      let groundColors = COLORS.GROUND.DAY;
      
      if (weatherCycle === 1) { // Snow (Day 2)
          roadColors = COLORS.ROAD.SNOW;
          groundColors = COLORS.GROUND.SNOW;
      } else if (weatherCycle === 2) { // Fog (Day 3)
          roadColors = COLORS.ROAD.FOG;
          groundColors = COLORS.GROUND.FOG;
      } else {
          roadColors = COLORS.ROAD.DAY;
          groundColors = COLORS.GROUND.DAY;
      }

      segments.current.push({
        index: n,
        p1: { x: 0, y: lastY, z: n * SEGMENT_LENGTH },
        p2: { x: 0, y: y, z: (n + 1) * SEGMENT_LENGTH },
        curve,
        hill: 0, 
        color: {
          road: Math.floor(n / RUMBLE_LENGTH) % 2 ? roadColors[0] : roadColors[1],
          grass: Math.floor(n / RUMBLE_LENGTH) % 2 ? groundColors[0] : groundColors[1],
          rumble: Math.floor(n / RUMBLE_LENGTH) % 2 ? envRef.current.rumble[0] : envRef.current.rumble[1],
          lane: Math.floor(n / RUMBLE_LENGTH) % 2 ? 'transparent' : '#CCCCCC'
        },
        clip: 0
      });
    };

    const addRoad = (enter: number, hold: number, leave: number, curve: number, y: number) => {
      const startY = segments.current.length === 0 ? 0 : segments.current[segments.current.length - 1].p2.y;
      const endY = startY + (y * SEGMENT_LENGTH);
      const total = enter + hold + leave;
      for(let n = 0; n < enter; n++) addSegment(easeIn(0, curve, n/enter), easeInOut(startY, endY, n/total));
      for(let n = 0; n < hold; n++) addSegment(curve, easeInOut(startY, endY, (enter+n)/total));
      for(let n = 0; n < leave; n++) addSegment(easeInOut(curve, 0, n/leave), easeInOut(startY, endY, (enter+hold+n)/total));
    };

    // Build Track
    for(let i=0; i<50; i++) addRoad(0, 10, 0, 0, 0); 
    for(let i=0; i<40; i++) {
      const curve = (Math.random() * 8) * (Math.random() > 0.5 ? 1 : -1);
      const hill = (Math.random() * 20) * (Math.random() > 0.5 ? 1 : -1);
      addRoad(20, 40, 20, curve, hill);
    }
    addRoad(0, 50, 0, 0, 0); 

    // Populate Cars
    cars.current = [];
    const totalSegments = segments.current.length;
    // Increase density slightly for challenge
    for (let n = 0; n < totalSegments / 30; n++) { 
        const offset = (Math.random() * 1.8) - 0.9; 
        const z = Math.floor(Math.random() * totalSegments) * SEGMENT_LENGTH;
        const sprite = 'car' + Math.floor(Math.random() * 3);
        const carSpeed = MAX_SPEED * 0.25 + Math.random() * MAX_SPEED * 0.3; 
        cars.current.push({ offset, z, sprite, speed: carSpeed });
    }
    
    if (newDay) {
        timeOfDay.current = 0; // Reset time to dawn
    }

  }, []);

  // --- Game Loop Helpers ---
  const findSegment = useCallback((z: number) => {
    if (segments.current.length === 0) return { p1: {y:0}, p2: {y:0}, index: 0, color: {road:'', grass:'', rumble:'', lane:''}, curve: 0, hill: 0, clip: 0 } as Segment;
    return segments.current[Math.floor(z / SEGMENT_LENGTH) % segments.current.length];
  }, []);

  const project = (p: {x:number, y:number, z:number}, cameraX:number, cameraY:number, cameraZ:number, cameraDepth:number, width:number, height:number, roadWidth:number) => {
    const worldX = p.x;
    const worldY = p.y;
    const worldZ = p.z;

    const cx = worldX - cameraX;
    const cy = worldY - cameraY;
    const cz = worldZ - cameraZ;

    const scale = cameraDepth / cz;
    const x = Math.round((width / 2) + (scale * cx * width / 2));
    const y = Math.round((height / 2) - (scale * cy * height / 2));
    const w = Math.round(scale * roadWidth * width / 2);
    return { x, y, w, scale };
  };

  const renderPolygon = (ctx: CanvasRenderingContext2D, x1:number, y1:number, x2:number, y2:number, x3:number, y3:number, x4:number, y4:number, color:string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.lineTo(x4, y4);
    ctx.closePath();
    ctx.fill();
  };

  // --- Drawing Sprites ---
  const drawSprite = (ctx: CanvasRenderingContext2D, width: number, height: number, roadWidth: number, sprite: string, scale: number, destX: number, destY: number, clipY: number) => {
    const screenRoadW = (scale * roadWidth * width / 2) * 2; 
    const destW = screenRoadW * 0.25;
    const destH = destW * 0.5;

    const l = destX - destW/2;
    const t = destY - destH;
    
    if (clipY > 0 && t + destH > clipY) {
        if(t > clipY) return;
    }

    const drawRetroCar = (color1: string, color2: string) => {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(l + destW*0.1, t + destH*0.8, destW*0.8, destH*0.15);
        ctx.fillStyle = color1;
        ctx.fillRect(l, t + destH*0.4, destW, destH*0.5);
        ctx.fillStyle = color2;
        ctx.fillRect(l + destW*0.2, t, destW*0.6, destH*0.4);
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(l + destW*0.1, t + destH*0.55, destW*0.15, destH*0.15);
        ctx.fillRect(l + destW*0.75, t + destH*0.55, destW*0.15, destH*0.15);
    };

    if (sprite.startsWith('car')) {
        const variant = parseInt(sprite.replace('car', ''));
        const colors = [['#d32f2f', '#ef5350'], ['#1976d2', '#42a5f5'], ['#388e3c', '#66bb6a']];
        drawRetroCar(colors[variant % 3][0], colors[variant % 3][1]);
    }
  };

  const drawPlayer = (ctx: CanvasRenderingContext2D, width: number, height: number, scale: number, destY: number, steer: number) => {
      const destW = width * 0.25; 
      const destH = destW * 0.5;
      
      const l = (width/2) - (destW/2) + (steer * destW * 0.2);
      const t = destY - destH - 10; 

      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(l + destW*0.05, t + destH*0.85, destW*0.9, destH*0.1);
      ctx.fillStyle = '#FFFFFF'; 
      ctx.fillRect(l, t + destH*0.3, destW, destH*0.4);
      ctx.fillStyle = '#ccc';
      ctx.fillRect(l, t + destH*0.5, destW, destH*0.2);
      ctx.fillStyle = '#111';
      ctx.fillRect(l - destW*0.05, t + destH*0.5, destW*0.1, destH*0.25);
      ctx.fillRect(l + destW*0.95, t + destH*0.5, destW*0.1, destH*0.25);
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(l + destW*0.1, t + destH*0.55, destW*0.2, destH*0.1);
      ctx.fillRect(l + destW*0.7, t + destH*0.55, destW*0.2, destH*0.1);
  };

  const drawFlag = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
     const x = width - 150;
     const y = 50;
     ctx.fillStyle = '#FFF';
     ctx.fillRect(x, y, 10, 200);
     
     for(let r=0; r<4; r++) {
         for(let c=0; c<4; c++) {
             ctx.fillStyle = (r+c)%2 === 0 ? '#000' : '#FFF';
             ctx.fillRect(x - (4-c)*20, y + r*20, 20, 20);
         }
     }
     ctx.fillStyle = '#FFFF00';
     ctx.font = '20px "Press Start 2P"';
     ctx.fillText("GOAL!", x - 60, y + 100);
  };

  const updateEnvironment = () => {
    // Adjust Time Speed: 0.008 is roughly ~200s per day at 60FPS
    // Slowed down slightly more to allow completion of ~200 cars
    timeOfDay.current += 0.008; 
    
    const weatherCycle = (dayCounter.current - 1) % 3; 
    
    // Define phases: 0-20 (Dawn), 20-60 (Day), 60-70 (Dusk), 70-100 (Night)
    // Game Over trigger at 100 (next Dawn)

    if (timeOfDay.current >= 100) {
        const target = (CARS_TO_PASS_PER_DAY + ((dayCounter.current - 1) * CARS_TO_PASS_INCREMENT));
        const remaining = Math.max(0, target - totalCarsPassed.current);
        
        if (remaining > 0 && !levelCompleteTriggered.current) {
             gameOverRef.current();
             return;
        }
        timeOfDay.current = 0; 
    }

    // Base Sky Colors
    let sky = COLORS.SKY.DAY;
    let desc = "Day";
    let fog = 0;
    let fogColor = COLORS.SKY.DAY;

    if (timeOfDay.current < 20) {
        sky = COLORS.SKY.DAWN;
        desc = "Dawn";
    } else if (timeOfDay.current < 60) {
        sky = COLORS.SKY.DAY;
        desc = "Day";
    } else if (timeOfDay.current < 75) {
        sky = COLORS.SKY.DUSK;
        desc = "Dusk";
    } else {
        sky = COLORS.SKY.NIGHT;
        desc = "Night";
    }

    // Weather Overrides
    if (weatherCycle === 1) { // SNOW
        if (desc === "Day" || desc === "Dawn") {
             sky = COLORS.SKY.SNOW;
             desc = "Snow";
        }
        fog = 0.3;
        fogColor = '#E0F7FA';
    } else if (weatherCycle === 2) { // FOG
        if (desc === "Day" || desc === "Dawn") {
            sky = COLORS.SKY.FOG;
            desc = "Fog";
        }
        fog = 0.85;
        fogColor = '#a0a0a0';
    }

    envRef.current.sky = sky;
    envRef.current.description = desc;
    envRef.current.fog = fog;
    envRef.current.fogColor = fogColor;
  };

  const loop = useCallback((time: number) => {
    if (!canvasRef.current) return;
    
    if (gameState === GameState.START || gameState === GameState.GAME_OVER) {
        const ctx = canvasRef.current.getContext('2d');
        if(ctx) {
            ctx.fillStyle = '#000';
            ctx.fillRect(0,0, canvasRef.current.width, canvasRef.current.height);
        }
        requestRef.current = requestAnimationFrame(loop);
        return;
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    const dt = 1/FPS;

    const isLevelComplete = gameState === GameState.LEVEL_COMPLETE;

    if (!isLevelComplete) {
        if (keys.current['ArrowUp']) speed.current += ACCEL * dt;
        else if (keys.current['ArrowDown']) speed.current += BREAKING * dt;
        else speed.current += DECEL * dt;

        if ((playerX.current < -1 || playerX.current > 1)) {
            if (speed.current > OFF_ROAD_LIMIT) {
                speed.current += OFF_ROAD_DECEL * dt;
            }
        }

        speed.current = Math.max(0, Math.min(speed.current, MAX_SPEED));

        const dx = dt * 2 * (speed.current / MAX_SPEED);
        if (keys.current['ArrowLeft']) playerX.current -= dx;
        else if (keys.current['ArrowRight']) playerX.current += dx;

        position.current += speed.current * dt;
        
        updateEnvironment();
        audioService.updateEngine(speed.current / MAX_SPEED);
    } else {
        speed.current = 0;
        audioService.updateEngine(0);
    }

    const trackLength = segments.current.length * SEGMENT_LENGTH;
    
    if (position.current >= trackLength) position.current -= trackLength;
    while (position.current < 0) position.current += trackLength;

    // Render Sky
    ctx.fillStyle = envRef.current.sky;
    ctx.fillRect(0, 0, width, height);

    // Render Sun/Moon (only if not foggy)
    if (envRef.current.fog < 0.5) {
        if (timeOfDay.current < 20 || timeOfDay.current > 60) {
            // Draw Sun near horizon during Dawn/Dusk, Moon at Night
            const isSun = timeOfDay.current < 75;
            const sunY = isSun ? height * 0.3 : height * 0.2;
            const sunX = isSun ? width * 0.2 + (timeOfDay.current * 2) : width * 0.8 - ((timeOfDay.current - 75) * 2);
            
            ctx.fillStyle = isSun ? '#FF5722' : '#EEE';
            ctx.beginPath();
            ctx.arc(sunX, sunY, isSun ? 40 : 20, 0, Math.PI*2);
            ctx.fill();
        }
    }

    // Draw Ground
    // Use weather specific ground logic
    const weatherCycle = (dayCounter.current - 1) % 3;
    const groundColor = weatherCycle === 1 ? COLORS.GROUND.SNOW[1] : 
                        weatherCycle === 2 ? COLORS.GROUND.FOG[1] : COLORS.GROUND.DAY[1];
    ctx.fillStyle = groundColor;
    ctx.fillRect(0, height/2, width, height/2);

    const carMap = new Map<number, Car[]>();
    cars.current.forEach(car => {
        if (!isLevelComplete) {
            let oldRelZ = car.z - (position.current - speed.current * dt); 
            while (oldRelZ < -trackLength/2) oldRelZ += trackLength;
            while (oldRelZ > trackLength/2) oldRelZ -= trackLength;

            const oldZ = car.z;
            car.z += car.speed * dt;
            if (car.z > trackLength) car.z -= trackLength;
            if (car.z < 0) car.z += trackLength;

            let newRelZ = car.z - position.current;
            while (newRelZ < -trackLength/2) newRelZ += trackLength;
            while (newRelZ > trackLength/2) newRelZ -= trackLength;

            if (oldRelZ > 0 && newRelZ <= 0) {
                if (speed.current > car.speed) {
                    totalCarsPassed.current++;
                    audioService.playPass();
                }
            }
            else if (oldRelZ < 0 && newRelZ >= 0) {
                if (car.speed > speed.current) {
                    totalCarsPassed.current--;
                }
            }
        }

        let renderZ = car.z - position.current;
        if (renderZ < -CAMERA_HEIGHT) renderZ += trackLength; 
        if (renderZ > trackLength - CAMERA_HEIGHT) renderZ -= trackLength;

        if (!isLevelComplete) {
            const carW = 0.25; 
            if (renderZ > 0 && renderZ < SEGMENT_LENGTH * 2) { 
                if (playerX.current > car.offset - carW && playerX.current < car.offset + carW) {
                    if (speed.current > car.speed) {
                        speed.current = car.speed * 0.8; 
                        audioService.playCrash();
                        collisionRef.current(); 
                    }
                }
            }
        }
        
        const segIdx = Math.floor(car.z / SEGMENT_LENGTH) % segments.current.length;
        if (!carMap.has(segIdx)) carMap.set(segIdx, []);
        carMap.get(segIdx)!.push(car);
    });
    
    const target = (CARS_TO_PASS_PER_DAY + ((dayCounter.current - 1) * CARS_TO_PASS_INCREMENT));
    const remaining = Math.max(0, target - totalCarsPassed.current);

    if (remaining === 0 && !levelCompleteTriggered.current && gameState === GameState.PLAYING) {
        levelCompleteTriggered.current = true;
        levelCompleteRef.current();
    }
    
    const startPos = position.current;
    const baseSegment = findSegment(startPos);
    const basePercent = percentRemaining(startPos, SEGMENT_LENGTH);
    const playerZ = PLAYER_Z;
    
    const playerY = lerp(baseSegment.p1.y, baseSegment.p2.y, basePercent);
    const cameraY = CAMERA_HEIGHT + playerY;

    let maxy = height;
    let x = 0;
    let dx_curve = - (baseSegment.curve * basePercent);

    const spritesToDraw: {x: number, y: number, scale: number, sprite: string}[] = [];

    for(let n = 0; n < DRAW_DISTANCE; n++) {
        const currentIndex = (baseSegment.index + n) % segments.current.length;
        const segment = segments.current[currentIndex];
        segment.clip = maxy;
        
        const p1CameraZ = (n * SEGMENT_LENGTH) - (basePercent * SEGMENT_LENGTH) + playerZ;
        const p2CameraZ = ((n + 1) * SEGMENT_LENGTH) - (basePercent * SEGMENT_LENGTH) + playerZ;

        if (p1CameraZ < CAMERA_DEPTH) continue;

        const cameraX = playerX.current * ROAD_WIDTH;
        
        const p1 = project({x: -x - cameraX, y: segment.p1.y - cameraY, z: p1CameraZ}, 0,0,0, CAMERA_DEPTH, width, height, ROAD_WIDTH);
        const p2 = project({x: -x - dx_curve - cameraX, y: segment.p2.y - cameraY, z: p2CameraZ}, 0,0,0, CAMERA_DEPTH, width, height, ROAD_WIDTH);

        if (n === 0) p1.y = height; 

        x += dx_curve;
        dx_curve += segment.curve;

        if (carMap.has(currentIndex)) {
            const carsOnSeg = carMap.get(currentIndex)!;
            for(const car of carsOnSeg) {
                const spriteX = p1.x + (p1.w * car.offset); 
                const spriteY = p1.y;
                const spriteScale = p1.scale;
                spritesToDraw.push({ x: spriteX, y: spriteY, scale: spriteScale, sprite: car.sprite });
            }
        }

        if (p2.y >= maxy || p2.y >= p1.y) continue;

        renderPolygon(ctx, 0, p1.y, width, p1.y, width, p2.y, 0, p2.y, segment.color.grass);
        
        renderPolygon(ctx, 
            p1.x - p1.w, p1.y, 
            p1.x + p1.w, p1.y, 
            p2.x + p2.w, p2.y, 
            p2.x - p2.w, p2.y, 
            segment.color.road
        );
        
        const rumbleW1 = p1.w * 0.15;
        const rumbleW2 = p2.w * 0.15;
        
        renderPolygon(ctx, 
            p1.x - p1.w - rumbleW1, p1.y, 
            p1.x - p1.w, p1.y, 
            p2.x - p2.w, p2.y, 
            p2.x - p2.w - rumbleW2, p2.y, 
            segment.color.rumble
        );
        renderPolygon(ctx, 
            p1.x + p1.w, p1.y, 
            p1.x + p1.w + rumbleW1, p1.y, 
            p2.x + p2.w + rumbleW2, p2.y, 
            p2.x + p2.w, p2.y, 
            segment.color.rumble
        );

        if (segment.color.lane !== 'transparent') {
            const laneW1 = p1.w * 0.05;
            const laneW2 = p2.w * 0.05;
            renderPolygon(ctx, 
                p1.x - laneW1/2, p1.y, 
                p1.x + laneW1/2, p1.y, 
                p2.x + laneW2/2, p2.y, 
                p2.x - laneW2/2, p2.y, 
                segment.color.lane
            );
        }
        
        maxy = p2.y;
        segment.clip = maxy;

        // FOG RENDERING
        if (envRef.current.fog > 0) {
             ctx.fillStyle = envRef.current.fogColor;
             const fogDistance = DRAW_DISTANCE * (1 - envRef.current.fog); 
             if (n > fogDistance) {
                const fogPercent = (n - fogDistance) / (DRAW_DISTANCE - fogDistance);
                ctx.globalAlpha = Math.min(1, fogPercent * 2); 
                ctx.fillRect(0, p2.y, width, p1.y - p2.y);
                ctx.globalAlpha = 1;
             }
        }
    }

    for (let i = spritesToDraw.length - 1; i >= 0; i--) {
        const s = spritesToDraw[i];
        drawSprite(ctx, width, height, ROAD_WIDTH, s.sprite, s.scale, s.x, s.y, -1);
    }
    
    drawPlayer(ctx, width, height, CAMERA_DEPTH/PLAYER_Z, height, (keys.current['ArrowLeft'] ? -1 : keys.current['ArrowRight'] ? 1 : 0));

    if (isLevelComplete) {
        drawFlag(ctx, width, height);
    }

    statsUpdateRef.current(
        Math.floor(speed.current / 100), 
        totalCarsPassed.current, 
        position.current, 
        dayCounter.current,
        remaining,
        timeOfDay.current // Passing the exact sun position (0-100)
    );
    
    requestRef.current = requestAnimationFrame(loop);
  }, [gameState, resetRoad, findSegment]); 

  useEffect(() => {
      if (gameState === GameState.PLAYING && levelCompleteTriggered.current) {
          dayCounter.current++;
          resetRoad(true);
      }
  }, [gameState, resetRoad]);

  useEffect(() => {
    resetRoad();
    audioService.init();
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [resetRoad, loop]);

  return (
    <canvas 
        ref={canvasRef} 
        width={640} 
        height={480} 
        className="w-full h-full object-contain bg-black pixelated"
    />
  );
};

export default GameCanvas;
