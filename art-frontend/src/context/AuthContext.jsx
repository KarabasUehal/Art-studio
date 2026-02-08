import React, { createContext, useState, useEffect } from 'react';
import api from '../utils/api'; 
import { emitter } from './events';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = async () => {
        try {
            const response = await api.get('/me'); 
            setIsAuthenticated(true);
            setRole(response.data.role || 'client');
        } catch (err) {
            if (err.response?.status !== 401) {
                console.error('Auth check error:', err);
            }
            setIsAuthenticated(false);
            setRole(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let isMounted = true;

        checkAuth();

        // Слушаем событие изменения авторизации
        const handleAuthChange = () => {
            if (isMounted) checkAuth();
        };
        emitter.on('authChange', handleAuthChange);

        return () => {
            isMounted = false;
            emitter.off('authChange', handleAuthChange);
        };
    }, []); 

    const login = async () => {
        setIsAuthenticated(true);
        emitter.emit('authChange');
    };

    const logout = async () => {
  try {
    await api.post('/logout'); // или GET — как у тебя
  } catch (e) {
    console.error(e);
  } finally {
    setIsAuthenticated(false);
    setRole(null);
  }
};

    return (
        <AuthContext.Provider value={{ 
            isAuthenticated, 
            role, 
            loading, 
            login, 
            logout,
            checkAuth // полезно для ручной проверки
        }}>
            {children}
        </AuthContext.Provider>
    );
};