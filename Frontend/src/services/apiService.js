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

// ================= TRANSFER & REQUEST FUNCTIONS =================

/**
 * Hits the unified request endpoint and uses correct keys
 */
export async function transferFilesApi(transferData) {
    try {
        const response = await axios.post(`${BACKEND_URL}/requests/create`, transferData, getAuthHeaders());
        return response.data; 
    } catch (error) {
        const errMsg = error.response?.data?.error || error.response?.data?.message || 'Request failed.';
        throw new Error(errMsg);
    }
}

/**
 * Fetch data for the Pending Requests / History Dashboard
 */
export async function fetchRequestDashboardApi(params) {
    try {
        const response = await axios.get(`${BACKEND_URL}/requests/pending`, {
            ...getAuthHeaders(),
            params: params 
        });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Failed to fetch dashboard data.');
    }
}

/**
 * Approve a transfer or delete request
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
 * Deny a transfer or delete request
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

// ================= FILE & USER FUNCTIONS =================

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

/**
 * Toggle Star Status
 */
export async function toggleStarApi(id, type, isStarred, userId) {
    try {
        const routePrefix = type === 'folders' ? 'folders' : 'files'; 

        const response = await axios.patch(
            `${BACKEND_URL}/${routePrefix}/star/${id}`, 
            { isStarred, userId }, 
            getAuthHeaders()
        );
        return response.data;
    } catch (error) {
        console.error(`Error toggling star on ${type}:`, error);
        throw new Error(error.response?.data?.message || `Failed to update star status.`);
    }
}

/**
 * Fetch all starred items for the logged-in user
 */
export async function fetchStarredItemsApi(userId) {
    try {
        const response = await axios.get(`${BACKEND_URL}/files`, {
            ...getAuthHeaders(),
            params: { 
                isStarred: true, 
                userId: userId, 
                all: "true" 
            } 
        });
        return response.data;
    } catch (error) {
        console.error("Fetch starred error:", error);
        throw new Error('Failed to fetch starred items.');
    }
}