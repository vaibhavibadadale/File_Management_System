import React from "react";
import { Button } from "react-bootstrap";

const FolderTree = ({ folders, onFolderSelect, level = 0 }) => (
  <ul style={{ listStyle: "none", paddingLeft: level * 20 }}>
    {folders.map((folder) => (
      <li key={folder._id}>
        <Button
          variant="link"
          onClick={() => onFolderSelect(folder)}
          style={{ textDecoration: "none" }}
        >
          📁 {folder.name}
        </Button>
        {folder.children?.length > 0 && (
          <FolderTree
            folders={folder.children}
            onFolderSelect={onFolderSelect}
            level={level + 1}
          />
        )}
      </li>
    ))}
  </ul>
);

export default FolderTree;
