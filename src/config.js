import { Capacitor } from '@capacitor/core';

// 'VITE_API_URL' in .env is set to http://10.0.2.2:8000 for Android
// We use that if on a native platform.
// Otherwise (Desktop/Web), we fallback to localhost:8000.

export const API_URL = import.meta.env.VITE_API_URL ||
    (Capacitor.isNativePlatform() ? 'http://10.0.2.2:5000' : 'https://office-backend-50fc.onrender.com');

export const SOCKET_URL = API_URL;
