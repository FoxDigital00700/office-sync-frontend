import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Login from './pages/Login';
import Register from './pages/Register';
import SyncLogin from './pages/SyncLogin'; // Added this import
import MediaHistoryModal from './components/MediaHistoryModal';
import SessionView from './components/SessionView';
import MainLayout from './components/MainLayout';

const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <SocketProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/session/:channelId/:startMsgId/:endMsgId" element={<SessionView />} />
            <Route path="/chat/:channelId" element={
              <PrivateRoute>
                <MainLayout />
              </PrivateRoute>
            } />
            <Route path="/" element={
              <PrivateRoute>
                <MainLayout />
              </PrivateRoute>
            } />
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
