import { useState, useEffect } from 'react';
import { ChatProvider } from './contexts/ChatContext';
import { UserProvider } from './contexts/UserContext';
import LoginScreen from './components/LoginScreen';
import ChatInterface from './components/ChatInterface';
import { User } from './types';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in (localStorage)
    const savedUser = localStorage.getItem('webchat_user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('webchat_user');
      }
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('webchat_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('webchat_user');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <UserProvider user={currentUser}>
      <ChatProvider>
        <ChatInterface onLogout={handleLogout} />
      </ChatProvider>
    </UserProvider>
  );
}

export default App;