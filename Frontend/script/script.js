// --- Mock Data Structure (Simulating Server Response) ---
// ... (The rest of fileSystem and path variables remain the same) ...
let currentPath = '/root/';
let fileSystem = {
    '/root/': [
        { name: 'Documents', type: 'Folder', dateModified: '2025-12-10 15:00', size: '', path: '/root/Documents/' },
        { name: 'Photos', type: 'Folder', dateModified: '2025-11-01 10:00', size: '', path: '/root/Photos/' },
        { name: 'Resume_latest.pdf', type: 'PDF Document', dateModified: '2025-12-12 20:00', size: '274 KB', path: '/root/Resume_latest.pdf' },
        { name: 'Notes.txt', type: 'Text File', dateModified: '2025-12-13 09:30', size: '10 KB', path: '/root/Notes.txt' },
    ],
    '/root/Documents/': [
        { name: 'Reports', type: 'Folder', dateModified: '2025-12-05 12:00', size: '', path: '/root/Documents/Reports/' },
        { name: 'Q3_Summary.xlsx', type: 'Excel File', dateModified: '2025-12-08 14:00', size: '1.5 MB', path: '/root/Documents/Q3_Summary.xlsx' },
    ],
    '/root/Photos/': [
        { name: 'Vacation', type: 'Folder', dateModified: '2025-12-14 00:00', size: '', path: '/root/Photos/Vacation/' }
    ],
    '/root/Photos/Vacation/': [
        { name: 'beach.jpg', type: 'JPEG Image', dateModified: '2025-08-01 11:00', size: '3.5 MB', path: '/root/Photos/Vacation/beach.jpg' }
    ]
};

// --- DOM Element References ---
const fileTableBody = document.getElementById('fileTableBody');
const folderTreeView = document.getElementById('folderTreeView');
const createFolderBtn = document.getElementById('createFolderBtn');
const selectAllCheckbox = document.getElementById('selectAllFiles');
const transferBtn = document.getElementById('transferSelectedBtn');
const fileUploadInput = document.getElementById('fileUpload'); // <-- New reference

// --- Utility Functions (getFileIcon and updateTransferButtonState remain the same) ---

function getFileIcon(type) {
    if (type === 'Folder') return 'fas fa-folder';
    if (type.includes('PDF')) return 'fas fa-file-pdf';
    if (type.includes('Excel')) return 'fas fa-file-excel';
    if (type.includes('Text')) return 'fas fa-file-alt';
    if (type.includes('Image') || type.includes('PNG') || type.includes('JPEG')) return 'fas fa-file-image';
    return 'fas fa-file';
}

function updateTransferButtonState() {
    const selectedCount = fileTableBody.querySelectorAll('.file-select:checked').length;
    transferBtn.disabled = selectedCount === 0;
    transferBtn.textContent = selectedCount > 0 
        ? `Transfer Selected (${selectedCount})` 
        : 'Transfer Selected';
}

// Function to convert bytes to human-readable size
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// --- Main Render & Logic Functions (renderFileList, renderFolderTree, navigateToFolder remain the same) ---
// ... (Your existing renderFileList, renderFolderTree, navigateToFolder code goes here) ...

/** Renders the files for the given path into the main table */
function renderFileList(path) {
    fileTableBody.innerHTML = ''; 
    const files = fileSystem[path] || [];

    files.sort((a, b) => {
        if (a.type === 'Folder' && b.type !== 'Folder') return -1;
        if (a.type !== 'Folder' && b.type === 'Folder') return 1;
        return a.name.localeCompare(b.name);
    });

    files.forEach(item => {
        const iconClass = getFileIcon(item.type);
        const row = document.createElement('tr');
        
        const checkboxCell = document.createElement('td');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'file-select';
        checkbox.dataset.name = item.name;
        checkbox.dataset.path = item.path;
        checkboxCell.appendChild(checkbox);

        row.appendChild(checkboxCell);
        
        row.innerHTML += `
            <td><i class="${iconClass} file-icon"></i> ${item.name}</td>
            <td>${item.dateModified}</td>
            <td>${item.type}</td>
            <td>${item.size || '—'}</td>
        `;
        
        if (item.type === 'Folder') {
            row.classList.add('folder-row');
            row.title = "Double-click to open";
            row.ondblclick = () => navigateToFolder(item.path);
        }

        fileTableBody.appendChild(row);
    });

    selectAllCheckbox.checked = false;
    updateTransferButtonState();
}

/** Renders the nested folder tree view on the left */
function renderFolderTree(path = '/root/') {
    folderTreeView.innerHTML = ''; 

    function buildTree(currentFolderList, parentPath) {
        const ul = document.createElement('ul');
        ul.style.paddingLeft = parentPath === '/root/' ? '0px' : '15px';

        currentFolderList.filter(item => item.type === 'Folder').forEach(folder => {
            const folderItem = document.createElement('li');
            folderItem.className = 'tree-item ' + (path === folder.path ? 'selected' : '');
            folderItem.dataset.path = folder.path;
            folderItem.innerHTML = `<i class="fas fa-folder"></i> ${folder.name}`;
            
            ul.appendChild(folderItem);

            if (fileSystem.hasOwnProperty(folder.path) && fileSystem[folder.path].some(item => item.type === 'Folder')) {
                folderItem.appendChild(buildTree(fileSystem[folder.path], folder.path));
            }
        });
        return ul;
    }

    if (fileSystem['/root/']) {
        folderTreeView.appendChild(buildTree(fileSystem['/root/'], '/root/'));
    }
}


/** Handles navigation and updates both views */
function navigateToFolder(newPath) {
    if (fileSystem.hasOwnProperty(newPath) || newPath === '/root/') {
        currentPath = newPath;
        renderFileList(currentPath);
        renderFolderTree(currentPath); 
    } else {
        alert("Error: Folder not found or inaccessible.");
    }
}

// --- NEW UPLOAD FUNCTIONALITY ---

fileUploadInput.addEventListener('change', (event) => {
    const files = event.target.files;
    if (files.length > 0) {
        handleFileUpload(files);
    }
    // Clear the input value so the same file can be uploaded again if needed
    event.target.value = null; 
});

/** Simulates the file upload process and updates the data structure */
function handleFileUpload(files) {
    if (!fileSystem.hasOwnProperty(currentPath)) {
        fileSystem[currentPath] = [];
    }

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Mock API Call (In a real app, this is where you'd use fetch() or Axios)
        console.log(`Simulating upload of file: ${file.name} to path: ${currentPath}`);

        const fileExtension = file.name.split('.').pop().toUpperCase();
        
        const newFileItem = {
            name: file.name,
            type: `${fileExtension} File`,
            dateModified: new Date().toLocaleString(),
            size: formatBytes(file.size),
            path: currentPath + file.name
        };

        // Add file to the current folder's data structure
        fileSystem[currentPath].push(newFileItem);
    }
    
    // Refresh the view to show the new files
    renderFileList(currentPath);
    alert(`${files.length} file(s) successfully uploaded to ${currentPath}`);
}


// --- Remaining Event Handlers (Create Folder and Transfer remain the same) ---

createFolderBtn.onclick = () => {
    const folderName = prompt(`Enter new folder name in ${currentPath}:`);
    if (folderName && folderName.trim()) {
        const newFolderName = folderName.trim();
        const newPath = currentPath + newFolderName + '/';

        if (!fileSystem.hasOwnProperty(currentPath)) {
             fileSystem[currentPath] = [];
        }
        
        if (fileSystem[currentPath].some(item => item.name === newFolderName && item.type === 'Folder')) {
            alert("A folder with that name already exists here.");
            return;
        }

        fileSystem[currentPath].push({
            name: newFolderName, 
            type: 'Folder', 
            dateModified: new Date().toLocaleString(), 
            size: '',
            path: newPath
        });
        fileSystem[newPath] = [];
        
        navigateToFolder(currentPath); 
        alert(`Folder '${newFolderName}' created successfully.`);
    }
};


transferBtn.onclick = () => {
    const selectedFiles = Array.from(fileTableBody.querySelectorAll('.file-select:checked'))
        .map(cb => ({ name: cb.dataset.name, path: cb.dataset.path }));
    
    if (selectedFiles.length === 0) {
        alert("No files selected for transfer.");
        return;
    }

    console.log("Transfer requested for:", selectedFiles);
    alert(`Initiating transfer of ${selectedFiles.length} item(s) from ${currentPath}.\n\nNOTE: You would now select a destination.`);
};


folderTreeView.addEventListener('click', (event) => {
    const item = event.target.closest('.tree-item');
    if (item) {
        const path = item.dataset.path;
        navigateToFolder(path);
    }
});


selectAllCheckbox.addEventListener('change', (event) => {
    const isChecked = event.target.checked;
    fileTableBody.querySelectorAll('.file-select').forEach(cb => {
        cb.checked = isChecked;
    });
    updateTransferButtonState();
});

fileTableBody.addEventListener('change', (event) => {
    if (event.target.classList.contains('file-select')) {
        updateTransferButtonState();
        
        const allCheckboxes = fileTableBody.querySelectorAll('.file-select');
        const checkedCheckboxes = fileTableBody.querySelectorAll('.file-select:checked');
        selectAllCheckbox.checked = allCheckboxes.length > 0 && allCheckboxes.length === checkedCheckboxes.length;
    }
});

// --- Existing Event Handler ---

createFolderBtn.onclick = async () => { // 👈 Make the function async
    const folderName = prompt(`Enter new folder name in ${currentPath}:`);
    
    if (folderName && folderName.trim()) {
        const newFolderName = folderName.trim();
        // NOTE: We don't create the path here, the server does that.

        // Assume BACKEND_URL, USER_ID, and DEPARTMENT_ID are defined elsewhere (e.g., at the top of the file)
        const BACKEND_URL = 'http://localhost:5000'; 
        const USER_ID = '694130dd872795f2641e2621'; // Replace with your actual ID
        const DEPARTMENT_ID = '694050d65c12077b1957bc98'; // Replace with your actual ID

        // 1. CONSTRUCT THE PAYLOAD
        const payload = {
            name: newFolderName,
            parent: currentFolderId || null, // Assuming you have currentFolderId defined somewhere
            createdBy: USER_ID,
            departmentId: DEPARTMENT_ID,
        };

        try {
            // 2. MAKE THE API CALL HERE!
            await axios.post(`${BACKEND_URL}/api/folders/create`, payload);
            
            // 3. Success handling (Replacing the mock logic)
            alert(`Folder '${newFolderName}' created successfully.`);
            
            // This function needs to fetch the new list from the server to refresh the view
            // You will need to create a new function that calls the /api/folders endpoint.
            // For now, let's assume `MapsToFolder` reloads the data from the server.
            navigateToFolder(currentPath); 

        } catch (error) {
            console.error("Error creating folder:", error.response ? error.response.data : error.message);
            alert(`Error creating folder: ${error.response ? error.response.data.error : 'Network or server issue'}`);
        }
        
        // ❌ REMOVE ALL THE OLD MOCK LOGIC BELOW ❌
        /*
        if (!fileSystem.hasOwnProperty(currentPath)) { ... }
        if (fileSystem[currentPath].some(item => ...)) { ... return; }
        fileSystem[currentPath].push({ ... });
        fileSystem[newPath] = [];
        navigateToFolder(currentPath);
        alert(...);
        */
    }
};

// --- Initial Load ---
document.addEventListener("DOMContentLoaded", () => {
    navigateToFolder(currentPath); 
});