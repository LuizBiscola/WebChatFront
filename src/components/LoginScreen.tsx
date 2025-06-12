import React, { useState } from 'react';
import { MessageCircle, User as UserIcon, Plus } from 'lucide-react';
import { User } from '../types';
import { chatService } from '../services/chatService';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      let user: User;
      
      if (isCreating) {
        // Create new user
        user = await chatService.createUser(username.trim());
      } else {
        // Try to find existing user
        try {
          user = await chatService.getUserByUsername(username.trim());
        } catch (error) {
          // User not found, suggest creating
          setError('User not found. Would you like to create a new account?');
          setIsLoading(false);
          return;
        }
      }

      onLogin(user);
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        setError('Username already exists. Try logging in instead.');
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-telegram-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-whatsapp-500 to-telegram-500 rounded-full mb-4 shadow-lg">
            <MessageCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">WebChat</h1>
          <p className="text-gray-600">Connect with friends and colleagues</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter your username"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
                {error.includes('not found') && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreating(true);
                      setError('');
                    }}
                    className="mt-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Create new account
                  </button>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !username.trim()}
              className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:from-primary-600 hover:to-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  {isCreating ? <Plus className="w-5 h-5 mr-2" /> : <UserIcon className="w-5 h-5 mr-2" />}
                  {isCreating ? 'Create Account' : 'Sign In'}
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsCreating(!isCreating);
                setError('');
              }}
              className="text-sm text-gray-600 hover:text-primary-600 transition-colors duration-200"
            >
              {isCreating ? 'Already have an account? Sign in' : 'Need an account? Create one'}
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 mb-4">Features</p>
          <div className="flex justify-center space-x-6 text-xs text-gray-400">
            <span>Real-time messaging</span>
            <span>Group chats</span>
            <span>Online status</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;