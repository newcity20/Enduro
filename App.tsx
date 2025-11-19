
import React, { useState, useEffect, useCallback } from 'react';
import GameCanvas from './components/GameCanvas';
import Dashboard from './components/Dashboard';
import CrewChief from './components/CrewChief';
import { GameState } from './types';
import { audioService } from './services/audioService';
import { CARS_TO_PASS_PER_DAY } from './constants';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [stats, setStats] = useState({
    speed: 0,
    distance: 0,
    carsPassed: 0,
    day: 1,
    collisions: 0,
    condition: 'Sunny',
    carsRemaining: CARS_TO_PASS_PER_DAY,
    sunPosition: 0
  });

  // Handle Start
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' && (gameState === GameState.START || gameState === GameState.GAME_OVER)) {
        setGameState(GameState.PLAYING);
        setStats(s => ({ 
            ...s, 
            speed: 0, 
            distance: 0, 
            carsPassed: 0, 
            collisions: 0, 
            carsRemaining: CARS_TO_PASS_PER_DAY, 
            day: 1,
            sunPosition: 0
        }));
        audioService.init();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameState]);

  const handleUpdate = useCallback((speed: number, passed: number, distance: number, day: number, remaining: number, sunPosition: number) => {
    setStats(prev => {
        // Detect day change for condition update roughly
        let cond = 'Sunny';
        const cycle = (day - 1) % 3;
        if (cycle === 1) cond = 'Snow';
        else if (cycle === 2) cond = 'Fog';
        
        // Optimization: Only update if values changed significantly to prevent react churn
        if (prev.speed === speed && prev.carsRemaining === remaining && Math.abs(prev.sunPosition - sunPosition) < 0.1) {
            return prev;
        }

        return { 
            ...prev, 
            speed, 
            carsPassed: passed, 
            distance, 
            day, 
            condition: cond,
            carsRemaining: remaining,
            sunPosition
        }; 
    });
  }, []);

  const handleCollision = useCallback(() => {
    setStats(prev => ({ ...prev, collisions: prev.collisions + 1 }));
  }, []);

  const handleLevelComplete = useCallback(() => {
      setGameState(GameState.LEVEL_COMPLETE);
      audioService.playVictory();
      
      // Wait then start next day
      setTimeout(() => {
          setGameState(GameState.PLAYING);
      }, 4000);
  }, []);

  const handleGameOver = useCallback(() => {
      setGameState(GameState.GAME_OVER);
      audioService.stop();
  }, []);

  return (
    <div className="w-screen h-screen bg-zinc-900 flex items-center justify-center relative overflow-hidden">
      {/* Cabinet / Monitor Bezel */}
      <div className="relative w-full h-full max-w-4xl max-h-[800px] aspect-[4/3] bg-black shadow-2xl rounded-xl overflow-hidden border-8 border-gray-800 ring-4 ring-gray-900">
        
        {/* Scanlines Overlay */}
        <div className="scanlines pointer-events-none z-10"></div>
        
        {/* Screen Glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-blue-900/10 pointer-events-none z-10 mix-blend-overlay"></div>

        <CrewChief gameState={gameState} stats={stats} />
        
        <GameCanvas 
            gameState={gameState} 
            onStatsUpdate={handleUpdate}
            onCollision={handleCollision}
            onLevelComplete={handleLevelComplete}
            onGameOver={handleGameOver}
        />
        
        <Dashboard 
            speed={stats.speed} 
            distance={stats.distance} 
            day={stats.day}
            carsPassed={stats.carsPassed}
            carsRemaining={stats.carsRemaining}
            sunPosition={stats.sunPosition}
        />

        {gameState === GameState.START && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/40">
                <h1 className="text-6xl text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-orange-600 font-black tracking-tighter transform -skew-x-12 glow drop-shadow-lg" style={{WebkitTextStroke: '2px white'}}>
                    ENDURO<span className="text-white">GPT</span>
                </h1>
                <p className="mt-8 text-white animate-pulse text-xl">PRESS ENTER TO RACE</p>
                <p className="mt-4 text-gray-400 text-xs max-w-md text-center">
                    Survive the elements. Pass {CARS_TO_PASS_PER_DAY} cars per day. <br/>
                    Beat the SUNSET.
                </p>
                <div className="mt-8 flex space-x-8">
                     <div className="flex flex-col items-center">
                        <div className="w-8 h-8 border border-white flex items-center justify-center rounded mb-2">↑</div>
                        <span className="text-xs text-gray-300">GAS</span>
                     </div>
                     <div className="flex flex-col items-center">
                        <div className="w-8 h-8 border border-white flex items-center justify-center rounded mb-2">↓</div>
                        <span className="text-xs text-gray-300">BRAKE</span>
                     </div>
                     <div className="flex flex-col items-center">
                        <div className="flex space-x-2 mb-2">
                            <div className="w-8 h-8 border border-white flex items-center justify-center rounded">←</div>
                            <div className="w-8 h-8 border border-white flex items-center justify-center rounded">→</div>
                        </div>
                        <span className="text-xs text-gray-300">STEER</span>
                     </div>
                </div>
            </div>
        )}

        {gameState === GameState.LEVEL_COMPLETE && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                <h2 className="text-5xl text-yellow-400 font-black animate-bounce transform -skew-x-12 glow" style={{WebkitTextStroke: '1px black'}}>
                    DAY COMPLETE!
                </h2>
                <p className="text-white mt-4 text-2xl">TIME EXTENDED</p>
            </div>
        )}

        {gameState === GameState.GAME_OVER && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/80">
                <h2 className="text-5xl text-red-500 font-black animate-pulse transform -skew-x-12 glow" style={{WebkitTextStroke: '1px black'}}>
                    GAME OVER
                </h2>
                <p className="mt-4 text-white text-xl">SUNRISE CAUGHT YOU</p>
                <p className="mt-8 text-gray-400 text-sm">PRESS ENTER TO TRY AGAIN</p>
            </div>
        )}

      </div>
    </div>
  );
};

export default App;
