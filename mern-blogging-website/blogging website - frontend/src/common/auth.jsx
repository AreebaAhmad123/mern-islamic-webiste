import axios from 'axios';
import { lookInSession, storeInSession, removeFromSession } from './session';

// Token validation function
export const validateToken = async (token) => {
    if (!token) return false;
    
    try {
        const response = await axios.post(
            `${import.meta.env.VITE_SERVER_DOMAIN}/validate-token`,
            {},
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 5000
            }
        );
        return response.status === 200;
    } catch (error) {
        console.error('Token validation failed:', error);
        return false;
    }
};

// Token refresh function
export const refreshAccessToken = async (refreshToken) => {
    try {
        const response = await axios.post(
            `${import.meta.env.VITE_SERVER_DOMAIN}/refresh-token`,
            { refreshToken },
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );
        return response.data.access_token;
    } catch (error) {
        console.error('Token refresh failed:', error);
        return null;
    }
};

// Centralized logout function
export const logoutUser = (setUserAuth) => {
    removeFromSession("user");
    sessionStorage.clear(); // Clear all session data
    setUserAuth({ access_token: null });
    
    // Clear any pending requests
    axios.defaults.headers.common['Authorization'] = null;
};

// Initialize user auth from session
export const initializeUserAuth = async (setUserAuth) => {
    let userInSession = lookInSession("user");
    
    if (userInSession) {
        try {
            const userData = JSON.parse(userInSession);
            
            if (userData.access_token) {
                // Validate token with server
                const isValid = await validateToken(userData.access_token);
                
                if (isValid) {
                    setUserAuth(userData);
                    // Set default authorization header
                    axios.defaults.headers.common['Authorization'] = `Bearer ${userData.access_token}`;
                    return userData;
                } else {
                    // Token is invalid, clear session
                    console.log('Invalid token found, clearing session');
                    sessionStorage.clear();
                    setUserAuth({ access_token: null });
                    return null;
                }
            } else {
                setUserAuth({ access_token: null });
                return null;
            }
        } catch (error) {
            console.error('Error parsing session data:', error);
            // Invalid JSON in session
            sessionStorage.clear();
            setUserAuth({ access_token: null });
            return null;
        }
    } else {
        setUserAuth({ access_token: null });
        return null;
    }
};

// Update user auth in session and context
export const updateUserAuth = (userData, setUserAuth) => {
    storeInSession("user", JSON.stringify(userData));
    setUserAuth(userData);
    
    // Update axios default header
    if (userData.access_token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${userData.access_token}`;
    } else {
        axios.defaults.headers.common['Authorization'] = null;
    }
}; 