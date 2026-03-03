/**
 * ConsoleTerminal - Scrolling Green-on-Black Terminal
 * Logs game events like zone entries and Sage analysis
 */

import { useEffect, useRef, useState } from 'react';

interface LogEntry {
  id: number;
  timestamp: string;
  message: string;
  type: 'zone' | 'sage' | 'system' | 'player';
}

interface ConsoleTerminalProps {
  logs: LogEntry[];
}

export default function ConsoleTerminal({ logs }: ConsoleTerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const getTypeColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'zone': return '#00ff88';
      case 'sage': return '#a855f7';
      case 'player': return '#60a5fa';
      default: return '#22c55e';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour12: false });
  };

  return (
    <div className="h-40 bg-black border-2 border-green-600 rounded-lg overflow-hidden shadow-[0_0_20px_rgba(0,255,0,0.3)]">
      {/* Terminal Header */}
      <div className="bg-green-900 px-2 py-1 flex items-center justify-between">
        <span className="text-green-300 text-xs font-mono">⚡ TERMINAL LOG</span>
        <button 
          onClick={() => setAutoScroll(!autoScroll)}
          className="text-green-400 hover:text-green-200 text-xs"
        >
          {autoScroll ? '⬇ Auto' : '⬇ Manual'}
        </button>
      </div>
      
      {/* Terminal Content */}
      <div 
        ref={scrollRef}
        className="h-[calc(100%-28px)] overflow-y-auto p-2 font-mono text-xs"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#22c55e #0a0a0a' }}
      >
        {logs.length === 0 ? (
          <div className="text-green-700">// Terminal ready...</div>
        ) : (
          logs.map((log, index) => (
            <div key={`${log.id}-${index}`} className="mb-1 flex gap-2">
              <span className="text-green-800">[{formatTime(log.timestamp)}]</span>
              <span style={{ color: getTypeColor(log.type) }}>
                {log.type === 'zone' && '📍 '}
                {log.type === 'sage' && '🔮 '}
                {log.type === 'player' && '👤 '}
                {log.type === 'system' && '⚙ '}
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
