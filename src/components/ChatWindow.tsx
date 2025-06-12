import React, { useState, useRef, useEffect } from 'react';
import { Send, Phone, Video, MoreVertical, Users, Trash2 } from 'lucide-react';
import { useChat } from '../contexts/ChatContext';
import { useUser } from '../contexts/UserContext';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import ConfirmationModal from './ConfirmationModal';
import { getChatDisplayName } from '../utils/chatUtils';

const ChatWindow: React.FC = () => {
  const { activeChat, messages, sendMessage, sendTyping, typingUsers, deleteChat } = useChat();
  const { user } = useUser();
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number>();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const chatMessages = activeChat ? messages[activeChat.id] || [] : [];
  const currentTypingUsers = activeChat ? typingUsers[activeChat.id] || [] : [];

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  useEffect(() => {
    // Clean up typing timeout on unmount
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !activeChat) return;

    const content = messageText.trim();
    setMessageText('');
    
    // Stop typing indicator
    if (isTyping) {
      setIsTyping(false);
      sendTyping(activeChat.id, false);
    }

    try {
      await sendMessage(activeChat.id, content);
    } catch (error) {
      console.error('Error sending message:', error);
      // Optionally show error to user
    }
  };

  const handleDeleteChat = async () => {
    if (!activeChat) return;
    
    setIsDeleting(true);
    try {
      await deleteChat(activeChat.id);
      setShowDeleteConfirm(false);
      setShowDropdown(false);
    } catch (error) {
      console.error('Failed to delete chat:', error);
      // You could add a toast notification here for error handling
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDropdownToggle = () => {
    setShowDropdown(!showDropdown);
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
    setShowDropdown(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value);
    
    if (!activeChat) return;

    // Handle typing indicator
    if (!isTyping && e.target.value.trim()) {
      setIsTyping(true);
      sendTyping(activeChat.id, true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        sendTyping(activeChat.id, false);
      }
    }, 1000);
  };

  const getChatDisplayNameLocal = () => {
    if (!activeChat) return '';
    return getChatDisplayName(activeChat, user.id);
  };

  const getParticipantCount = () => {
    return activeChat?.participants.length || 0;
  };

  if (!activeChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-gray-500">No active chat selected</div>
        </div>
      </div>
    );
  }

  // Debug log
  console.log('ChatWindow - activeChat:', activeChat);
  console.log('ChatWindow - chatMessages:', chatMessages);

  // Check if activeChat has required properties
  if (!activeChat.participants || !Array.isArray(activeChat.participants)) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-500">Error: Chat data is incomplete</div>
          <div className="text-gray-500 text-sm mt-2">Missing participant information</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            activeChat.type === 'group' 
              ? 'bg-gradient-to-r from-purple-400 to-pink-400' 
              : 'bg-gradient-to-r from-blue-400 to-indigo-400'
          }`}>
            {activeChat.type === 'group' ? (
              <Users className="w-5 h-5 text-white" />
            ) : (
              <span className="text-white font-semibold">
                {getChatDisplayNameLocal().charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">{getChatDisplayNameLocal()}</h2>
            <p className="text-sm text-gray-500">
              {activeChat.type === 'group' 
                ? `${getParticipantCount()} participants` 
                : 'Online'
              }
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200">
            <Phone className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200">
            <Video className="w-5 h-5" />
          </button>
          
          {/* Dropdown Menu */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={handleDropdownToggle}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                <div className="py-1">
                  <button
                    onClick={handleDeleteClick}
                    className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Chat
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title="Delete Chat"
        message="Are you sure you want to delete this chat? This action cannot be undone."
        confirmText={isDeleting ? "Deleting..." : "Delete"}
        cancelText="Cancel"
        onConfirm={handleDeleteChat}
        onCancel={() => setShowDeleteConfirm(false)}
        confirmButtonClass={`${isDeleting ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
        isLoading={isDeleting}
      />

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 scrollbar-thin">
        {chatMessages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p>No messages yet</p>
            <p className="text-sm mt-1">Start the conversation!</p>
          </div>
        ) : (
          chatMessages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.senderId === user.id}
              showAvatar={
                index === 0 || 
                chatMessages[index - 1].senderId !== message.senderId
              }
            />
          ))
        )}
        
        {/* Typing Indicator */}
        {currentTypingUsers.length > 0 && (
          <TypingIndicator users={currentTypingUsers} />
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={messageText}
              onChange={handleInputChange}
              placeholder="Type a message..."
              className="w-full px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
            />
          </div>
          <button
            type="submit"
            disabled={!messageText.trim()}
            className="bg-primary-500 text-white p-3 rounded-full hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;