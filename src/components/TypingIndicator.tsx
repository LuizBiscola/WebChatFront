import React from 'react';
import { TypingUser } from '../types';

interface TypingIndicatorProps {
  users: TypingUser[];
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ users }) => {
  if (users.length === 0) return null;

  const getTypingText = () => {
    if (users.length === 1) {
      return `${users[0].username} is typing...`;
    } else if (users.length === 2) {
      return `${users[0].username} and ${users[1].username} are typing...`;
    } else {
      return `${users[0].username} and ${users.length - 1} others are typing...`;
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <div className="w-8 h-8 bg-gradient-to-r from-gray-300 to-gray-400 rounded-full flex items-center justify-center flex-shrink-0">
        <div className="flex space-x-1">
          <div className="w-1 h-1 bg-white rounded-full typing-indicator"></div>
          <div className="w-1 h-1 bg-white rounded-full typing-indicator"></div>
          <div className="w-1 h-1 bg-white rounded-full typing-indicator"></div>
        </div>
      </div>
      
      <div className="bg-white text-gray-900 px-4 py-2 rounded-2xl rounded-bl-md shadow-sm border border-gray-100">
        <p className="text-sm text-gray-600 italic">
          {getTypingText()}
        </p>
      </div>
    </div>
  );
};

export default TypingIndicator;