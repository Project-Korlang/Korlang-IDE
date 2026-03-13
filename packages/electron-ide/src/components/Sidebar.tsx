import React, { useEffect, useState } from 'react';
import fs from 'fs';
import path from 'path';
import { useStore } from '../store';

type TreeNode = {
  name: string;
  fullPath: string;
  isDir: boolean;
  children?: TreeNode[];
};

function readTree(dir: string): TreeNode[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.map((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return { name: entry.name, fullPath, isDir: true, children: readTree(fullPath) };
    }
    return { name: entry.name, fullPath, isDir: false };
  });
}

export function Sidebar() {
  const { workspacePath, setWorkspace, openFile } = useStore();
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (workspacePath) {
      setTree(readTree(workspacePath));
    }
  }, [workspacePath]);

  const toggle = (node: TreeNode) => {
    if (node.isDir) {
      setExpanded((e) => ({ ...e, [node.fullPath]: !e[node.fullPath] }));
    } else {
      const content = fs.readFileSync(node.fullPath, 'utf-8');
      openFile(node.fullPath, content);
    }
  };

  const onContextMenu = (node: TreeNode, e: React.MouseEvent) => {
    e.preventDefault();
    const action = window.prompt('Action: new-file, new-folder, rename, delete');
    if (!action) return;
    if (action === 'new-file') {
      const name = window.prompt('File name');
      if (!name) return;
      const targetDir = node.isDir ? node.fullPath : path.dirname(node.fullPath);
      fs.writeFileSync(path.join(targetDir, name), '');
    }
    if (action === 'new-folder') {
      const name = window.prompt('Folder name');
      if (!name) return;
      const targetDir = node.isDir ? node.fullPath : path.dirname(node.fullPath);
      fs.mkdirSync(path.join(targetDir, name));
    }
    if (action === 'rename') {
      const name = window.prompt('New name');
      if (!name) return;
      fs.renameSync(node.fullPath, path.join(path.dirname(node.fullPath), name));
    }
    if (action === 'delete') {
      if (node.isDir) fs.rmSync(node.fullPath, { recursive: true, force: true });
      else fs.unlinkSync(node.fullPath);
    }
    if (workspacePath) setTree(readTree(workspacePath));
  };

  const openFolder = async () => {
    const folder = await (window as any).korlang?.openFolder?.();
    if (folder) setWorkspace(folder);
  };

  if (!workspacePath) {
    return (
      <div className="sidebar">
        <button onClick={openFolder}>Open Folder</button>
      </div>
    );
  }

  const renderNode = (node: TreeNode) => (
    <div key={node.fullPath} className="node" onContextMenu={(e) => onContextMenu(node, e)}>
      <div className="node-row" onClick={() => toggle(node)}>
        <span className="icon">{node.isDir ? (expanded[node.fullPath] ? '[D]' : '[D]') : '[F]'}</span>
        <span>{node.name}</span>
      </div>
      {node.isDir && expanded[node.fullPath] && node.children && (
        <div className="node-children">{node.children.map(renderNode)}</div>
      )}
    </div>
  );

  return <div className="sidebar">{tree.map(renderNode)}</div>;
}
