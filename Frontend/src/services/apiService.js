import axios from 'axios';

const BACKEND_URL = "http://localhost:5000/api"; 

/**
 * Helper to get authentication headers from localStorage
 */
const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken'); 
    return {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
        }
    };
};

// ================= EXISTING FUNCTIONS =================

export async function fetchUsersForTransfer() {
    try {
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
        const errMsg = error.response?.data?.error || error.response?.data?.message || 'Transfer failed.';
        throw new Error(errMsg);
    }
}

export async function fetchFilesApi(params = {}) {
    try {
        const response = await axios.get(`${BACKEND_URL}/files`, {
            ...getAuthHeaders(),
            params: params 
        });
        return response.data.files;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Failed to fetch files.');
    }
}

// ================= NEW STAR & FOLDER FUNCTIONS =================

export async function toggleStarApi(id, type, isStarred) {
    try {
        const response = await axios.patch(
            `${BACKEND_URL}/${type}/star/${id}`, 
            { isStarred }, 
            getAuthHeaders()
        );
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || `Failed to update ${type} star status.`);
    }
}

export async function fetchStarredItemsApi() {
    try {
        const [filesRes, foldersRes] = await Promise.all([
            axios.get(`${BACKEND_URL}/files`, { ...getAuthHeaders(), params: { isStarred: true } }),
            axios.get(`${BACKEND_URL}/folders`, { ...getAuthHeaders(), params: { isStarred: true } })
        ]);
        return {
            files: filesRes.data.files || [],
            folders: foldersRes.data || [] 
        };
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Failed to fetch starred items.');
    }
}

export async function fetchFoldersApi(params = {}) {
    try {
        const response = await axios.get(`${BACKEND_URL}/folders`, {
            ...getAuthHeaders(),
            params: params
        });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Failed to fetch folders.');
    }
}