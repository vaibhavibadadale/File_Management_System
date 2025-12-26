import axios from 'axios';

const BACKEND_URL = "http://localhost:5000/api"; 

const getAuthHeaders = () => {
    // CRITICAL: Ensure this key matches what you use in your LoginPage.jsx
    const token = localStorage.getItem('authToken'); 
    return {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
        }
    };
};

export async function fetchUsersForTransfer() {
    try {
        // Requires a backend route (e.g., in userController.js)
        const response = await axios.get(`${BACKEND_URL}/users/recipients`, getAuthHeaders());
        return response.data.users || []; 
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Failed to fetch users list.');
    }
}

export async function transferFilesApi(recipientId, fileIds, password) {
    const payload = {
        recipient_id: recipientId,
        file_ids: fileIds,
        user_password: password
    };
    
    try {
        const response = await axios.post(`${BACKEND_URL}/files/transfer`, payload, getAuthHeaders());
        return response.data; 
    } catch (error) {
        const errMsg = error.response?.data?.error || error.response?.data?.message || 'Transfer failed due to an unknown error.';
        throw new Error(errMsg);
    }
}

export async function fetchFilesApi() {
    // Used by FileDashboard.jsx to load the initial list
    const response = await axios.get(`${BACKEND_URL}/files`, getAuthHeaders());
    return response.data.files;
}