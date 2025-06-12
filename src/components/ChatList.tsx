import React from 'react';
import { Users, User } from 'lucide-react';
import { useChat } from '../contexts/ChatContext';
import { useUser } from '../contexts/UserContext';
import { format, isToday, isYesterday } from 'date-fns';
import { getChatDisplayName } from '../utils/chatUtils';

const ChatList: React.FC = () => {
  const { chats, activeChat, setActiveChat, messages } = useChat();
  const { user } = useUser();

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'dd/MM/yyyy');
    }
  };

  const getChatDisplayNameLocal = (chat: any) => {
    return getChatDisplayName(chat, user.id);
  };

  const getLastMessage = (chatId: number) => {
    const chatMessages = messages[chatId];
    if (!chatMessages || chatMessages.length === 0) return null;
    return chatMessages[chatMessages.length - 1];
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      {chats.length === 0 ? (
        <div className="p-4 text-center text-gray-500">
          <p>No chats yet</p>
          <p className="text-sm mt-1">Start a new conversation</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {chats.map((chat) => {
            const lastMessage = getLastMessage(chat.id);
            const isActive = activeChat?.id === chat.id;
            
            return (
              <div
                key={chat.id}
                onClick={() => setActiveChat(chat)}
                className={`p-4 cursor-pointer transition-colors duration-200 hover:bg-gray-50 ${
                  isActive ? 'bg-primary-50 border-r-2 border-primary-500' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  {/* Avatar */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    chat.type === 'group' 
                      ? 'bg-gradient-to-r from-purple-400 to-pink-400' 
                      : 'bg-gradient-to-r from-blue-400 to-indigo-400'
                  }`}>
                    {chat.type === 'group' ? (
                      <Users className="w-6 h-6 text-white" />
                    ) : (
                      <User className="w-6 h-6 text-white" />
                    )}
                  </div>

                  {/* Chat Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className={`font-medium truncate ${
                        isActive ? 'text-primary-700' : 'text-gray-900'
                      }`}>
                        {getChatDisplayNameLocal(chat)}
                      </h3>
                      {lastMessage && (
                        <span className="text-xs text-gray-500 ml-2">
                          {formatTime(lastMessage.timestamp)}
                        </span>
                      )}
                    </div>
                    
                    {lastMessage ? (
                      <p className="text-sm text-gray-600 truncate mt-1">
                        {lastMessage.senderId === user.id ? 'You: ' : ''}
                        {lastMessage.content}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400 mt-1">No messages yet</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ChatList;