// src/components/FolderTree.js

import React from "react";

// The recursive component for rendering the folder tree
const FolderTree = ({ folders, onFolderSelect, currentFolderId, level = 0 }) => (
    <ul className="folder-tree-list" style={{ paddingLeft: level * 20 }}> 
        {folders.map((folder) => (
            <li key={folder._id}>
                <div
                    className={`tree-folder-link ${folder._id === currentFolderId ? 'selected' : ''}`}
                    onClick={() => onFolderSelect(folder)}
                >
                    <i className="fas fa-folder folder-icon"></i>
                    <span className="folder-name">{folder.name}</span>
                </div>
                
                {/* Recursively render children */}
                {folder.children?.length > 0 && (
                    <FolderTree
                        folders={folder.children}
                        onFolderSelect={onFolderSelect}
                        currentFolderId={currentFolderId} 
                        level={level + 1}
                    />
                )}
            </li>
        ))}
    </ul>
);

export default FolderTree;