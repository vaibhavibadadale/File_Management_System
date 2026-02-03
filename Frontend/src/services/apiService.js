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

// ================= UPDATED TRANSFER & REQUEST FUNCTIONS =================

/**
 * FIXED: Hits the unified request endpoint and uses correct keys
 */
export async function transferFilesApi(transferData) {
    try {
        // Updated URL to match your new unified request route
        const response = await axios.post(`${BACKEND_URL}/requests/create`, transferData, getAuthHeaders());
        return response.data; 
    } catch (error) {
        const errMsg = error.response?.data?.error || error.response?.data?.message || 'Request failed.';
        throw new Error(errMsg);
    }
}

/**
 * NEW: Fetch data for the Pending Requests / History Dashboard
 */
export async function fetchRequestDashboardApi(params) {
    try {
        const response = await axios.get(`${BACKEND_URL}/requests/pending`, {
            ...getAuthHeaders(),
            params: params // role, username, departmentId, etc.
        });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Failed to fetch dashboard data.');
    }
}

/**
 * NEW: Approve a transfer or delete request
 */
export async function approveRequestApi(requestId) {
    try {
        const response = await axios.put(`${BACKEND_URL}/requests/approve/${requestId}`, {}, getAuthHeaders());
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Approval failed.');
    }
}

/**
 * NEW: Deny a transfer or delete request
 */
export async function denyRequestApi(requestId, denialComment) {
    try {
        const response = await axios.put(`${BACKEND_URL}/requests/deny/${requestId}`, { denialComment }, getAuthHeaders());
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Denial failed.');
    }
}

// ================= TRASH MANAGEMENT FUNCTIONS =================

export async function fetchTrashApi(params) {
    try {
        const response = await axios.get(`${BACKEND_URL}/requests/trash`, {
            ...getAuthHeaders(),
            params: params
        });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Failed to fetch trash.');
    }
}

export async function restoreFromTrashApi(id) {
    try {
        const response = await axios.post(`${BACKEND_URL}/requests/trash/restore/${id}`, {}, getAuthHeaders());
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Restore failed.');
    }
}

export async function permanentDeleteApi(id) {
    try {
        const response = await axios.delete(`${BACKEND_URL}/requests/trash/permanent/${id}`, getAuthHeaders());
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Permanent delete failed.');
    }
}

// ================= EXISTING FUNCTIONS =================

export async function fetchUsersForTransfer() {
    try {
        const response = await axios.get(`${BACKEND_URL}/users`, getAuthHeaders());
        return response.data; 
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Failed to fetch users list.');
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
        const response = await axios.get(`${BACKEND_URL}/files`, {
            ...getAuthHeaders(),
            params: { isStarred: true } 
        });
        return {
            files: response.data.files || [],
            folders: [] // Adding empty folders array to prevent map errors
        };
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Failed to fetch starred items.');
    }
}
