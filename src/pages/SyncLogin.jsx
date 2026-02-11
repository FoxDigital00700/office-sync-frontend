import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config'; // Ensure this matches your config file path
import { useAuth } from '../context/AuthContext';

const SyncLogin = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { login } = useAuth(); // Assuming useAuth has a login method that sets state

    useEffect(() => {
        const sync = async () => {
            const token = searchParams.get('token');
            if (!token) {
                alert('Invalid Sync Token');
                navigate('/login');
                return;
            }

            try {
                const res = await axios.post(`${API_URL}/api/auth/sync`, { token });
                // Use the login function from context to set user and token
                login(res.data.user, res.data.token);
                // Redirect to home/dashboard
                navigate('/');
            } catch (err) {
                console.error("Sync Login Failed", err);
                alert("Login Sync Failed");
                navigate('/login');
            }
        };

        sync();
    }, [searchParams, navigate, login]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
            <div className="text-center">
                <h2 className="text-xl font-bold mb-4">Syncing with Task Manager...</h2>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
            </div>
        </div>
    );
};

export default SyncLogin;
