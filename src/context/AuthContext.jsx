import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { API_URL } from '../config';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');

        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            if (savedUser) setUser(JSON.parse(savedUser)); // Optimistic load

            axios.get(`${API_URL}/api/auth/me`)
                .then(res => {
                    setUser(res.data);
                    localStorage.setItem('user', JSON.stringify(res.data));
                })
                .catch((err) => {
                    console.error('[Auth] Session Check Failed:', err);
                    // Only logout if explicitly unauthorized (401)
                    if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        setUser(null);
                    }
                    // If Network Error, we keep the user (from savedUser) and token.
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (email, password) => {
        try {
            console.log(`[Auth] Attempting login to: ${API_URL}/api/auth/login`);
            const res = await axios.post(`${API_URL}/api/auth/login`, { email, password });
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user)); // Save for offline
            axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
            setUser(res.data.user);
        } catch (err) {
            console.error('[Auth] Login Failed:', err);
            if (err.response) {
                console.error('[Auth] Server Response:', err.response.data);
                console.error('[Auth] Status:', err.response.status);
            } else if (err.request) {
                console.error('[Auth] No Response Received (Network Error?)');
            } else {
                console.error('[Auth] Request Setup Error:', err.message);
            }
            throw err;
        }
    };

    const register = async (name, email, password) => {
        try {
            console.log(`[Auth] Attempting register to: ${API_URL}/api/auth/register`);
            const res = await axios.post(`${API_URL}/api/auth/register`, { name, email, password });
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user)); // Save for offline
            axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
            setUser(res.data.user);
        } catch (err) {
            console.error('[Auth] Register Failed:', err);
            if (err.response) {
                console.error('[Auth] Server Response:', err.response.data);
            }
            throw err;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
