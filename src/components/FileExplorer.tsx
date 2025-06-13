
import { useState, useMemo } from 'react';
import FolderCard from './FolderCard';
import Breadcrumb from './Breadcrumb';
import SearchBar from './SearchBar';

interface Folder {
  id: string;
  name: string;
  description: string;
  itemCount: number;
  parentId?: string;
}

const mockFolders: Folder[] = [
  {
    id: '1',
    name: 'Documents',
    description: 'Important documents, contracts, and official papers',
    itemCount: 24
  },
  {
    id: '2',
    name: 'Projects',
    description: 'Work projects, code repositories, and development files',
    itemCount: 12
  },
  {
    id: '3',
    name: 'Photos',
    description: 'Family photos, vacation memories, and screenshots',
    itemCount: 156
  },
  {
    id: '4',
    name: 'Downloads',
    description: 'Recently downloaded files and temporary documents',
    itemCount: 8
  },
  {
    id: '5',
    name: 'Music',
    description: 'Audio files, playlists, and music collections',
    itemCount: 89
  },
  {
    id: '6',
    name: 'Videos',
    description: 'Movie files, tutorials, and recorded content',
    itemCount: 34
  },
  {
    id: '7',
    name: 'Archive',
    description: 'Old files, backups, and archived documents',
    itemCount: 67
  },
  {
    id: '8',
    name: 'Templates',
    description: 'Document templates, design assets, and reusable files',
    itemCount: 15
  }
];

const FileExplorer = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPath, setCurrentPath] = useState<string[]>([]);

  const filteredFolders = useMemo(() => {
    return mockFolders.filter(folder =>
      folder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      folder.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const handleFolderDoubleClick = (folderName: string) => {
    setCurrentPath([...currentPath, folderName]);
    console.log(`Navigating to folder: ${folderName}`);
  };

  const handleBreadcrumbNavigate = (index: number) => {
    if (index === -1) {
      setCurrentPath([]);
    } else {
      setCurrentPath(currentPath.slice(0, index + 1));
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">File Explorer</h1>
        <p className="text-muted-foreground">Browse and manage your folders and files</p>
      </div>

      <Breadcrumb path={currentPath} onNavigate={handleBreadcrumbNavigate} />
      
      <SearchBar value={searchQuery} onChange={setSearchQuery} />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {filteredFolders.map((folder) => (
          <FolderCard
            key={folder.id}
            name={folder.name}
            description={folder.description}
            itemCount={folder.itemCount}
            onDoubleClick={() => handleFolderDoubleClick(folder.name)}
          />
        ))}
      </div>

      {filteredFolders.length === 0 && searchQuery && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No folders found matching "{searchQuery}"</p>
        </div>
      )}
    </div>
  );
};

export default FileExplorer;
