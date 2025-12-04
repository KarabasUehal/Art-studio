import React, { createContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { emitter } from './events';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkToken = () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const decoded = jwtDecode(token);
                    if (decoded.exp * 1000 > Date.now()) {
                        setIsAuthenticated(true);
                        setRole(decoded.role);
                    } else {
                        localStorage.removeItem('token');
                    }
                } catch (error) {
                    console.error('Invalid token', error);
                    localStorage.removeItem('token');
                }
            }
            setLoading(false); 
        };
        checkToken();
    }, []);

    const login = (token) => {
        localStorage.setItem('token', token);
        try {
            const decoded = jwtDecode(token);
            setIsAuthenticated(true);
            setRole(decoded.role);
        } catch (e) {
            console.error('Failed to decode token on login');
        }
        setLoading(false);
        emitter.emit('authChange', { isAuthenticated: true });
    };

    const logout = () => {
        localStorage.removeItem('token');
        setIsAuthenticated(false);
        setRole(null);
        setLoading(false);
        emitter.emit('authChange', { isAuthenticated: false });
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, role, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};