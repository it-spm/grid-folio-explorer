
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Folder, 
  File, 
  Upload, 
  Plus, 
  Edit3, 
  Download,
  Search,
  Grid,
  List,
  SortAsc,
  SortDesc,
  FileText,
  Image,
  FileSpreadsheet,
  Presentation,
  Archive
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface Folder {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  created_at: string;
}

interface File {
  id: string;
  name: string;
  description: string | null;
  file_type: string;
  file_size: number;
  file_path: string;
  folder_id: string | null;
  mime_type: string | null;
  created_at: string;
}

const AdminFileExplorer = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'date'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [editingItem, setEditingItem] = useState<{ type: 'folder' | 'file'; id: string; name: string; description: string } | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDescription, setNewFolderDescription] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Fetch folders
  const { data: folders = [] } = useQuery({
    queryKey: ['folders', currentFolderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('parent_id', currentFolderId)
        .order(sortBy === 'name' ? 'name' : 'created_at', { ascending: sortOrder === 'asc' });
      
      if (error) throw error;
      return data as Folder[];
    }
  });

  // Fetch files
  const { data: files = [] } = useQuery({
    queryKey: ['files', currentFolderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('folder_id', currentFolderId)
        .order(sortBy === 'name' ? 'name' : 'created_at', { ascending: sortOrder === 'asc' });
      
      if (error) throw error;
      return data as File[];
    }
  });

  // Create folder mutation
  const createFolderMutation = useMutation({
    mutationFn: async ({ name, description }: { name: string; description: string }) => {
      const { data, error } = await supabase
        .from('folders')
        .insert([{ name, description, parent_id: currentFolderId }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      setNewFolderName('');
      setNewFolderDescription('');
      toast.success('Folder created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create folder: ' + error.message);
    }
  });

  // Upload file mutation
  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = currentFolderId ? `${currentFolderId}/${fileName}` : fileName;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('file-explorer')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create file record
      const { data, error } = await supabase
        .from('files')
        .insert([{
          name: file.name,
          file_type: file.type.split('/')[0] || 'unknown',
          file_size: file.size,
          file_path: filePath,
          folder_id: currentFolderId,
          mime_type: file.type
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      toast.success('File uploaded successfully');
    },
    onError: (error) => {
      toast.error('Failed to upload file: ' + error.message);
    }
  });

  // Update description mutation
  const updateDescriptionMutation = useMutation({
    mutationFn: async ({ type, id, description }: { type: 'folder' | 'file'; id: string; description: string }) => {
      const table = type === 'folder' ? 'folders' : 'files';
      const { error } = await supabase
        .from(table)
        .update({ description })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
      setEditingItem(null);
      toast.success('Description updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update description: ' + error.message);
    }
  });

  const getFileIcon = (mimeType: string | null, fileType: string) => {
    if (!mimeType) return <File className="w-12 h-12 text-gray-400" />;
    
    if (mimeType.startsWith('image/')) return <Image className="w-12 h-12 text-blue-500" />;
    if (mimeType.includes('pdf')) return <FileText className="w-12 h-12 text-red-500" />;
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return <FileSpreadsheet className="w-12 h-12 text-green-500" />;
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return <Presentation className="w-12 h-12 text-orange-500" />;
    if (mimeType.includes('zip') || mimeType.includes('rar')) return <Archive className="w-12 h-12 text-purple-500" />;
    
    return <File className="w-12 h-12 text-gray-400" />;
  };

  const handleFileUpload = (files: FileList) => {
    Array.from(files).forEach(file => {
      uploadFileMutation.mutate(file);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    if (!user) return;
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const downloadFile = async (file: File) => {
    try {
      const { data, error } = await supabase.storage
        .from('file-explorer')
        .download(file.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Failed to download file');
    }
  };

  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    folder.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">File Explorer</h1>
            <p className="text-muted-foreground">
              {user ? 'Admin Mode - Upload, create, and manage files' : 'Browse and download files'}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Search and Controls */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search files and folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {user && (
            <div className="flex gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    New Folder
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Folder</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="folder-name">Folder Name</Label>
                      <Input
                        id="folder-name"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        placeholder="Enter folder name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="folder-description">Description</Label>
                      <Textarea
                        id="folder-description"
                        value={newFolderDescription}
                        onChange={(e) => setNewFolderDescription(e.target.value)}
                        placeholder="Enter folder description"
                      />
                    </div>
                    <Button
                      onClick={() => createFolderMutation.mutate({ name: newFolderName, description: newFolderDescription })}
                      disabled={!newFolderName || createFolderMutation.isPending}
                      className="w-full"
                    >
                      Create Folder
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <label className="cursor-pointer">
                <Button asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Files
                  </span>
                </Button>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                />
              </label>
            </div>
          )}
        </div>

        {/* Drag and Drop Area */}
        {user && (
          <div
            className={`border-2 border-dashed rounded-lg p-8 mb-6 transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="text-center">
              <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">Drag and drop files here</p>
              <p className="text-muted-foreground">or use the upload button above</p>
            </div>
          </div>
        )}

        {/* File Grid */}
        <div className={viewMode === 'grid' 
          ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4"
          : "space-y-2"
        }>
          {/* Folders */}
          {filteredFolders.map((folder) => (
            <Card
              key={folder.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setCurrentFolderId(folder.id)}
            >
              <CardContent className="p-4">
                <div className={viewMode === 'grid' ? "text-center" : "flex items-center gap-4"}>
                  <Folder className={viewMode === 'grid' ? "w-12 h-12 text-blue-500 mx-auto mb-2" : "w-8 h-8 text-blue-500"} />
                  <div className={viewMode === 'grid' ? "" : "flex-1"}>
                    <h3 className="font-medium truncate">{folder.name}</h3>
                    {folder.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{folder.description}</p>
                    )}
                  </div>
                  {user && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingItem({ type: 'folder', id: folder.id, name: folder.name, description: folder.description || '' });
                      }}
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Files */}
          {filteredFiles.map((file) => (
            <Card key={file.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className={viewMode === 'grid' ? "text-center" : "flex items-center gap-4"}>
                  <div className={viewMode === 'grid' ? "mb-2" : ""}>
                    {getFileIcon(file.mime_type, file.file_type)}
                  </div>
                  <div className={viewMode === 'grid' ? "" : "flex-1"}>
                    <h3 className="font-medium truncate">{file.name}</h3>
                    {file.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{file.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {(file.file_size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadFile(file)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    {user && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingItem({ type: 'file', id: file.id, name: file.name, description: file.description || '' })}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Edit Description Dialog */}
        {editingItem && (
          <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Description - {editingItem.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editingItem.description}
                    onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                    placeholder="Enter description"
                  />
                </div>
                <Button
                  onClick={() => updateDescriptionMutation.mutate({ 
                    type: editingItem.type, 
                    id: editingItem.id, 
                    description: editingItem.description 
                  })}
                  disabled={updateDescriptionMutation.isPending}
                  className="w-full"
                >
                  Update Description
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};

export default AdminFileExplorer;
