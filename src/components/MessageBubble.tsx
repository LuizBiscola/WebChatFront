import React from 'react';
import { Check, CheckCheck, AlertCircle } from 'lucide-react';
import { Message } from '../types';
import { format } from 'date-fns';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwn, showAvatar }) => {
  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm');
  };

  const getStatusIcon = () => {
    switch (message.status) {
      case 'sent':
        return <Check className="w-4 h-4" />;
      case 'delivered':
      case 'read':
        return <CheckCheck className="w-4 h-4" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} message-enter`}>
      <div className={`flex items-end space-x-2 max-w-xs lg:max-w-md ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
        {/* Avatar */}
        {!isOwn && showAvatar && (
          <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-semibold">
              {message.sender?.username?.charAt(0).toUpperCase() || '?'}
            </span>
          </div>
        )}
        
        {!isOwn && !showAvatar && (
          <div className="w-8 h-8 flex-shrink-0" />
        )}

        {/* Message Bubble */}
        <div
          className={`px-4 py-2 rounded-2xl ${
            message.status === 'failed'
              ? 'bg-red-100 text-red-800 border border-red-200 rounded-br-md'
              : isOwn
              ? 'bg-primary-500 text-white rounded-br-md'
              : 'bg-white text-gray-900 rounded-bl-md shadow-sm border border-gray-100'
          }`}
        >
          {/* Sender name for group chats */}
          {!isOwn && showAvatar && (
            <p className="text-xs font-medium text-primary-600 mb-1">
              {message.sender?.username || 'Unknown User'}
            </p>
          )}
          
          {/* Message content */}
          <p className="text-sm leading-relaxed break-words">
            {message.content}
          </p>
          
          {/* Time and status */}
          <div className={`flex items-center justify-end space-x-1 mt-1 ${
            isOwn ? 'text-white/70' : 'text-gray-500'
          }`}>
            <span className="text-xs">
              {formatTime(message.timestamp)}
            </span>
            {isOwn && (
              <div className="text-white/70">
                {getStatusIcon()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;