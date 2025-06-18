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
  Archive,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import FilePreview from './FilePreview';

interface FolderData {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  created_at: string;
}

interface FileData {
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
  
  // Initialize storage bucket on component mount
  useEffect(() => {
    const initializeStorage = async () => {
      try {
        // Check if bucket exists, if not create it
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
        
        if (bucketsError) {
          console.error('Error checking buckets:', bucketsError);
          return;
        }

        const bucketExists = buckets?.some(bucket => bucket.name === 'file-explorer');
        
        if (!bucketExists) {
          const { error: createError } = await supabase.storage.createBucket('file-explorer', {
            public: true,
            allowedMimeTypes: ['image/*', 'video/*', 'audio/*', 'application/*', 'text/*'],
            fileSizeLimit: 52428800 // 50MB
          });

          if (createError) {
            console.error('Error creating bucket:', createError);
            toast.error('Failed to initialize file storage');
          } else {
            console.log('Storage bucket created successfully');
          }
        }
      } catch (error) {
        console.error('Storage initialization error:', error);
      }
    };

    if (user) {
      initializeStorage();
    }
  }, [user]);

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'date'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [editingItem, setEditingItem] = useState<{ type: 'folder' | 'file'; id: string; name: string; description: string } | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDescription, setNewFolderDescription] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileData | null>(null);

  // Fetch folders - fix UUID null handling
  const { data: folders = [] } = useQuery({
    queryKey: ['folders', currentFolderId],
    queryFn: async () => {
      let query = supabase
        .from('folders')
        .select('*')
        .order(sortBy === 'name' ? 'name' : 'created_at', { ascending: sortOrder === 'asc' });

      // Properly handle null vs string for parent_id
      if (currentFolderId === null) {
        query = query.is('parent_id', null);
      } else {
        query = query.eq('parent_id', currentFolderId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching folders:', error);
        throw error;
      }
      return data as FolderData[];
    }
  });

  // Fetch files - fix UUID null handling
  const { data: files = [] } = useQuery({
    queryKey: ['files', currentFolderId],
    queryFn: async () => {
      let query = supabase
        .from('files')
        .select('*')
        .order(sortBy === 'name' ? 'name' : 'created_at', { ascending: sortOrder === 'asc' });

      // Properly handle null vs string for folder_id
      if (currentFolderId === null) {
        query = query.is('folder_id', null);
      } else {
        query = query.eq('folder_id', currentFolderId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching files:', error);
        throw error;
      }
      return data as FileData[];
    }
  });

  // Create folder mutation - fix UUID null handling
  const createFolderMutation = useMutation({
    mutationFn: async ({ name, description }: { name: string; description: string }) => {
      console.log('Creating folder:', name, 'with parent_id:', currentFolderId);
      
      const { data, error } = await supabase
        .from('folders')
        .insert([{ 
          name, 
          description: description || null, 
          parent_id: currentFolderId // This will be null if currentFolderId is null
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating folder:', error);
        throw error;
      }
      
      console.log('Folder created successfully:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      setNewFolderName('');
      setNewFolderDescription('');
      toast.success('Folder created successfully');
    },
    onError: (error) => {
      console.error('Create folder mutation error:', error);
      toast.error('Failed to create folder: ' + error.message);
    }
  });

  // Upload file mutation - fix UUID null handling
  const uploadFileMutation = useMutation({
    mutationFn: async (file: globalThis.File) => {
      console.log('Starting file upload:', file.name, 'Size:', file.size, 'Type:', file.type);
      console.log('Current folder ID:', currentFolderId);
      
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = currentFolderId ? `${currentFolderId}/${fileName}` : fileName;

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('file-explorer')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw uploadError;
      }

      console.log('File uploaded to storage:', uploadData);

      // Create file record - properly handle null folder_id
      const { data, error } = await supabase
        .from('files')
        .insert([{
          name: file.name,
          description: null,
          file_type: file.type.split('/')[0] || 'unknown',
          file_size: file.size,
          file_path: filePath,
          folder_id: currentFolderId, // This will be null if currentFolderId is null
          mime_type: file.type || null
        }])
        .select()
        .single();

      if (error) {
        console.error('Database insert error:', error);
        throw error;
      }

      console.log('File record created:', data);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      toast.success(`File "${data.name}" uploaded successfully`);
    },
    onError: (error) => {
      console.error('Upload mutation error:', error);
      toast.error('Failed to upload file: ' + error.message);
    }
  });

  // Update description mutation
  const updateDescriptionMutation = useMutation({
    mutationFn: async ({ type, id, description }: { type: 'folder' | 'file'; id: string; description: string }) => {
      const table = type === 'folder' ? 'folders' : 'files';
      const { error } = await supabase
        .from(table)
        .update({ description: description || null })
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
    console.log('Handling file upload, file count:', files.length);
    Array.from(files).forEach((file, index) => {
      console.log(`Uploading file ${index + 1}:`, file.name);
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

  const downloadFile = async (file: FileData) => {
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

  const canPreview = (mimeType: string | null) => {
    if (!mimeType) return false;
    
    return (
      mimeType.startsWith('image/') ||
      mimeType.startsWith('video/') ||
      mimeType.startsWith('audio/') ||
      mimeType === 'application/pdf' ||
      mimeType.startsWith('text/') ||
      mimeType.includes('word') ||
      mimeType.includes('excel') ||
      mimeType.includes('sheet') ||
      mimeType.includes('presentation') ||
      mimeType.includes('powerpoint') ||
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    );
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
                  onChange={(e) => {
                    console.log('File input changed:', e.target.files?.length);
                    if (e.target.files) {
                      handleFileUpload(e.target.files);
                    }
                  }}
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
                    {canPreview(file.mime_type) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreviewFile(file)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
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

        <FilePreview
          file={previewFile}
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
        />
      </div>
    </div>
  );
};

export default AdminFileExplorer;
