import React, { useState } from 'react';
import { LogOut, Users, Plus } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { useChat } from '../contexts/ChatContext';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import CreateChatModal from './CreateChatModal';
import ConnectionStatus from './ConnectionStatus';

interface ChatInterfaceProps {
  onLogout: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ onLogout }) => {
  const { user } = useUser();
  const { activeChat, isLoading } = useChat();
  const [showCreateChat, setShowCreateChat] = useState(false);

  if (isLoading) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading chats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-primary-500 to-primary-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-lg">
                  {user.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="text-white font-semibold">{user.username}</h2>
                <ConnectionStatus />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowCreateChat(true)}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors duration-200"
                title="New Chat"
              >
                <Plus className="w-5 h-5" />
              </button>
              <button
                onClick={onLogout}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors duration-200"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-hidden">
          <ChatList />
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeChat ? (
          <ChatWindow />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Welcome to WebChat</h3>
              <p className="text-gray-500 mb-6">Select a chat to start messaging</p>
              <button
                onClick={() => setShowCreateChat(true)}
                className="bg-primary-500 text-white px-6 py-2 rounded-lg hover:bg-primary-600 transition-colors duration-200 flex items-center space-x-2 mx-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Start New Chat</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Chat Modal */}
      {showCreateChat && (
        <CreateChatModal onClose={() => setShowCreateChat(false)} />
      )}
    </div>
  );
};

export default ChatInterface;