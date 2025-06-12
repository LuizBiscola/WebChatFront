import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { useChat } from '../contexts/ChatContext';

const ConnectionStatus: React.FC = () => {
  const { isConnected } = useChat();

  return (
    <div className="flex items-center space-x-1">
      {isConnected ? (
        <>
          <Wifi className="w-3 h-3 text-green-400" />
          <span className="text-xs text-white/80">Connected</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3 h-3 text-red-400" />
          <span className="text-xs text-white/80">Disconnected</span>
        </>
      )}
    </div>
  );
};

export default ConnectionStatus;