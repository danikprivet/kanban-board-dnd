import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/App.css';
import './index.css';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { ToastProvider } from './components/Toast';
import Login from './pages/Login';
import AppRouter from './AppRouter';

const root = ReactDOM.createRoot(document.getElementById('root'));

function RootRouter() {
  const { user } = useAuth();
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login onSuccess={() => { window.location.href = '/'; }} />} />
        <Route path="/*" element={user ? <AppRouter /> : <Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

root.render(
  <AuthProvider>
    <ToastProvider>
      <RootRouter />
    </ToastProvider>
  </AuthProvider>
);

reportWebVitals();
