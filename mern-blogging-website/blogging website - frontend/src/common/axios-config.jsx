import axios from 'axios';
import { logoutUser } from './auth';
import { handleAuthError, getErrorMessage } from './error-handler';

// Create axios instance with default config
const axiosInstance = axios.create({
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor to add auth token
axiosInstance.interceptors.request.use(
    (config) => {
        // Get token from session storage
        const userInSession = sessionStorage.getItem("user");
        if (userInSession) {
            try {
                const userData = JSON.parse(userInSession);
                if (userData.access_token) {
                    config.headers.Authorization = `Bearer ${userData.access_token}`;
                }
            } catch (error) {
                console.error('Error parsing user session:', error);
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle auth errors
axiosInstance.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response) {
            const { status } = error.response;
            
            // Handle authentication errors
            if (status === 401) {
                console.log('Authentication error detected, logging out user');
                
                // Clear session and redirect to login
                logoutUser(() => {
                    // Force redirect to login page
                    window.location.href = '/login';
                });
                
                return Promise.reject(new Error(getErrorMessage(error)));
            }
            
            // Handle authorization errors
            if (status === 403) {
                return Promise.reject(new Error(getErrorMessage(error)));
            }
        }
        
        // Handle network errors
        if (error.code === 'ECONNABORTED') {
            return Promise.reject(new Error(getErrorMessage(error)));
        }
        
        if (error.code === 'ERR_NETWORK') {
            return Promise.reject(new Error(getErrorMessage(error)));
        }
        
        return Promise.reject(error);
    }
);

// Set up global axios defaults
axios.defaults.timeout = 10000;
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Apply the same interceptors to global axios
axios.interceptors.request.use(
    (config) => {
        // Get token from session storage
        const userInSession = sessionStorage.getItem("user");
        if (userInSession) {
            try {
                const userData = JSON.parse(userInSession);
                if (userData.access_token) {
                    config.headers.Authorization = `Bearer ${userData.access_token}`;
                }
            } catch (error) {
                console.error('Error parsing user session:', error);
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

axios.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response) {
            const { status } = error.response;
            
            // Handle authentication errors
            if (status === 401) {
                console.log('Authentication error detected, logging out user');
                
                // Clear session and redirect to login
                logoutUser(() => {
                    // Force redirect to login page
                    window.location.href = '/login';
                });
                
                return Promise.reject(new Error(getErrorMessage(error)));
            }
            
            // Handle authorization errors
            if (status === 403) {
                return Promise.reject(new Error(getErrorMessage(error)));
            }
        }
        
        // Handle network errors
        if (error.code === 'ECONNABORTED') {
            return Promise.reject(new Error(getErrorMessage(error)));
        }
        
        if (error.code === 'ERR_NETWORK') {
            return Promise.reject(new Error(getErrorMessage(error)));
        }
        
        return Promise.reject(error);
    }
);

export default axiosInstance; 