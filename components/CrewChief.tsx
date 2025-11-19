import React, { useEffect, useState } from 'react';
import { getPitCrewCommentary } from '../services/geminiService';
import { PitCrewMessage, GameState } from '../types';

interface CrewChiefProps {
  gameState: GameState;
  stats: {
    carsPassed: number;
    collisions: number;
    day: number;
    condition: string;
  };
}

const CrewChief: React.FC<CrewChiefProps> = ({ gameState, stats }) => {
  const [message, setMessage] = useState<PitCrewMessage | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Only trigger on specific events to save tokens/calls
    if (gameState === GameState.LEVEL_COMPLETE || gameState === GameState.GAME_OVER) {
      const fetchAdvice = async () => {
        setLoading(true);
        const data = await getPitCrewCommentary(stats.carsPassed, stats.collisions, stats.day, stats.condition);
        setMessage(data);
        setLoading(false);
      };
      fetchAdvice();
    } else if (gameState === GameState.START) {
        setMessage({ text: "Engines hot. Green light in 3... 2... 1...", emotion: 'neutral' });
    }
  }, [gameState, stats.day]); // Trigger when day changes or game state changes significantly

  if (!message && !loading) return null;

  // Portrait color based on emotion
  const borderColor = 
    message?.emotion === 'happy' ? 'border-green-500' :
    message?.emotion === 'angry' ? 'border-red-500' :
    message?.emotion === 'panic' ? 'border-yellow-500' : 'border-blue-500';

  return (
    <div className="absolute top-4 right-4 z-30 max-w-xs animate-slideIn">
      <div className={`bg-black/90 border-l-4 ${borderColor} p-3 shadow-2xl rounded-r-md flex items-start space-x-3`}>
        <div className="flex-shrink-0">
           {/* Pixel Art Portrait Placeholders */}
           <div className={`w-12 h-12 bg-gray-800 rounded overflow-hidden border border-gray-600 relative`}>
               {loading ? (
                   <div className="absolute inset-0 flex items-center justify-center">
                       <div className="w-2 h-2 bg-green-500 animate-ping"></div>
                   </div>
               ) : (
                   <img 
                    src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=Rusty&backgroundColor=b6e3f4`} 
                    alt="Crew Chief"
                    className="w-full h-full object-cover"
                   />
               )}
           </div>
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Crew Chief 'Rusty'</p>
            <p className="text-sm text-white leading-tight mt-1 font-mono">
                {loading ? "Incoming transmission..." : `"${message?.text}"`}
            </p>
        </div>
      </div>
    </div>
  );
};

export default CrewChief;
