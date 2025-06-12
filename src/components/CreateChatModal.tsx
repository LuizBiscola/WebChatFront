import React, { useState, useEffect } from 'react';
import { X, Users, User, Search } from 'lucide-react';
import { useChat } from '../contexts/ChatContext';
import { useUser } from '../contexts/UserContext';
import { chatService } from '../services/chatService';
import { User as UserType } from '../types';

interface CreateChatModalProps {
  onClose: () => void;
}

const CreateChatModal: React.FC<CreateChatModalProps> = ({ onClose }) => {
  const { createChat } = useChat();
  const { user } = useUser();
  const [chatName, setChatName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<UserType[]>([]);
  const [availableUsers, setAvailableUsers] = useState<UserType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const users = await chatService.getAllUsers();
      // Filter out current user
      const otherUsers = users.filter(u => u.id !== user.id);
      setAvailableUsers(otherUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const filteredUsers = availableUsers.filter(u =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !selectedUsers.find(selected => selected.id === u.id)
  );

  const handleUserToggle = (userToToggle: UserType) => {
    setSelectedUsers(prev => {
      const isSelected = prev.find(u => u.id === userToToggle.id);
      if (isSelected) {
        return prev.filter(u => u.id !== userToToggle.id);
      } else {
        return [...prev, userToToggle];
      }
    });
  };

  const handleCreateChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUsers.length === 0) return;

    setIsLoading(true);
    try {
      const participantIds = [user.id, ...selectedUsers.map(u => u.id)];
      const name = selectedUsers.length === 1 
        ? `${user.username}, ${selectedUsers[0].username}`
        : chatName || `Group with ${selectedUsers.map(u => u.username).join(', ')}`;
      
      const chat = await createChat(name, participantIds);
      console.log('Chat created/opened:', chat);
      
      onClose();
    } catch (error) {
      console.error('Error creating chat:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isGroupChat = selectedUsers.length > 1;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">New Chat</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleCreateChat} className="flex flex-col flex-1">
          {/* Chat Name (for group chats) */}
          {isGroupChat && (
            <div className="p-6 border-b border-gray-200">
              <label htmlFor="chatName" className="block text-sm font-medium text-gray-700 mb-2">
                Group Name (optional)
              </label>
              <input
                type="text"
                id="chatName"
                value={chatName}
                onChange={(e) => setChatName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter group name"
              />
            </div>
          )}

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div className="p-6 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-3">
                Selected ({selectedUsers.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map(selectedUser => (
                  <div
                    key={selectedUser.id}
                    className="flex items-center space-x-2 bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm"
                  >
                    <span>{selectedUser.username}</span>
                    <button
                      type="button"
                      onClick={() => handleUserToggle(selectedUser)}
                      className="text-primary-500 hover:text-primary-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User Search */}
          <div className="p-6 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Search users..."
              />
            </div>
          </div>

          {/* User List */}
          <div className="flex-1 overflow-y-auto">
            {isLoadingUsers ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading users...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <p>No users found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredUsers.map(availableUser => {
                  const isSelected = selectedUsers.find(u => u.id === availableUser.id);
                  
                  return (
                    <div
                      key={availableUser.id}
                      onClick={() => handleUserToggle(availableUser)}
                      className="p-4 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{availableUser.username}</p>
                          <p className="text-sm text-gray-500">User</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 ${
                          isSelected
                            ? 'bg-primary-500 border-primary-500'
                            : 'border-gray-300'
                        }`}>
                          {isSelected && (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200">
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={selectedUsers.length === 0 || isLoading}
                className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Users className="w-4 h-4 mr-2" />
                    Create Chat
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateChatModal;