
import React from 'react';

interface DashboardProps {
  speed: number;
  distance: number;
  day: number;
  carsPassed: number;
  carsRemaining: number;
  sunPosition: number; // 0 to 100 (0 = start of day, 100 = next morning/game over)
}

const Dashboard: React.FC<DashboardProps> = ({ speed, distance, day, carsPassed, carsRemaining, sunPosition }) => {
  // Calculate time color (Blue -> Orange -> Black -> Red)
  const timeColor = sunPosition > 85 ? 'bg-red-600 animate-pulse' : 
                    sunPosition > 60 ? 'bg-gray-800' :
                    sunPosition > 40 ? 'bg-orange-500' : 'bg-blue-400';

  return (
    <div className="absolute bottom-0 left-0 w-full p-4 flex justify-between items-end pointer-events-none text-white font-mono select-none z-20">
      {/* LEFT CLUSTER: Telemetry */}
      <div className="flex flex-col items-start space-y-2">
          
          {/* Speedometer (Compact) */}
          <div className="bg-black/80 border-l-4 border-green-500 p-2 pl-4 pr-6 rounded-r-lg shadow-lg transform -skew-x-12 mb-1">
             <div className="flex items-baseline space-x-2 transform skew-x-12">
                <span className="text-[10px] text-gray-400 tracking-widest">SPEED</span>
                <span className="text-3xl text-green-400 font-bold glow font-mono">{Math.floor(speed)}</span>
                <span className="text-[10px] text-green-600">KM/H</span>
             </div>
             {/* RPM Bar */}
             <div className="w-32 bg-gray-800 h-1.5 mt-1 transform skew-x-12 overflow-hidden rounded-full">
                <div 
                    className="bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 h-full transition-all duration-75" 
                    style={{ width: `${(speed / 300) * 100}%` }}
                ></div>
             </div>
          </div>

          {/* Stats Row (Cars & Day) */}
          <div className="flex space-x-2">
              <div className="bg-black/80 border-l-4 border-blue-500 p-2 pl-4 pr-4 rounded-r-lg transform -skew-x-12 min-w-[110px]">
                 <div className="transform skew-x-12">
                     <div className="text-[9px] text-gray-400 uppercase tracking-wider">Cars Left</div>
                     <div className={`text-2xl font-bold leading-none mt-1 ${carsRemaining < 10 ? 'text-red-500 animate-pulse' : 'text-blue-400'}`}>
                        {carsRemaining}
                     </div>
                 </div>
              </div>

              <div className="bg-black/80 border-l-4 border-yellow-500 p-2 pl-4 pr-4 rounded-r-lg transform -skew-x-12 min-w-[80px]">
                 <div className="transform skew-x-12">
                     <div className="text-[9px] text-gray-400 uppercase tracking-wider">Day</div>
                     <div className="text-2xl text-yellow-400 font-bold leading-none mt-1">{day}</div>
                 </div>
              </div>
          </div>
      </div>

      {/* RIGHT CLUSTER: Sun/Time Bar */}
      <div className="bg-black/80 border-r-4 border-gray-500 p-3 pr-6 pl-4 rounded-l-lg shadow-lg transform -skew-x-12 w-64">
          <div className="text-[10px] text-gray-400 transform skew-x-12 flex justify-between tracking-wider mb-1">
            <span>TIME TO SUNRISE</span>
            <span>{Math.floor(sunPosition)}%</span>
          </div>
          <div className="w-full bg-gray-900 h-3 mt-1 border border-gray-700 transform skew-x-12 relative overflow-hidden rounded-sm">
             {/* Day Markers */}
             <div className="absolute left-[20%] h-full w-0.5 bg-gray-600 z-10 opacity-30"></div>
             <div className="absolute left-[60%] h-full w-0.5 bg-gray-600 z-10 opacity-30"></div>
             
             <div 
                className={`h-full transition-all duration-500 ${timeColor}`} 
                style={{ width: `${sunPosition}%` }}
             ></div>
          </div>
          <div className="text-[9px] text-gray-600 mt-1 transform skew-x-12 flex justify-between font-bold">
              <span>DAY</span>
              <span>DUSK</span>
              <span>NIGHT</span>
              <span>DAWN</span>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;
