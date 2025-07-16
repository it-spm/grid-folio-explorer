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
  Eye,
  Trash,
  ArrowLeft,
  Move,
  Palette,
  FolderOpen,
  FolderArchive,
  FolderCheck,
  FolderClock,
  FolderCode,
  FolderHeart,
  FolderKey,
  FolderLock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import FilePreview from './FilePreview';
import { sanitizeInput, validateFileName, validateFolderName, validateFileType, escapeHtml } from '@/lib/security';

interface FolderData {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  created_at: string;
  icon?: string;
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

const FOLDER_ICONS = [
  { name: 'folder', icon: Folder, label: 'Default Folder' },
  { name: 'folder-open', icon: FolderOpen, label: 'Open Folder' },
  { name: 'folder-archive', icon: FolderArchive, label: 'Archive' },
  { name: 'folder-check', icon: FolderCheck, label: 'Completed' },
  { name: 'folder-clock', icon: FolderClock, label: 'Scheduled' },
  { name: 'folder-code', icon: FolderCode, label: 'Code' },
  { name: 'folder-heart', icon: FolderHeart, label: 'Favorites' },
  { name: 'folder-key', icon: FolderKey, label: 'Private' },
  { name: 'folder-lock', icon: FolderLock, label: 'Locked' },
];

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
  const [editingItem, setEditingItem] = useState<{ type: 'folder' | 'file'; id: string; name: string; description: string; icon?: string } | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDescription, setNewFolderDescription] = useState('');
  const [newFolderIcon, setNewFolderIcon] = useState('folder');
  const [dragActive, setDragActive] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileData | null>(null);
  const [folderPath, setFolderPath] = useState<FolderData[]>([]);
  const [movingFile, setMovingFile] = useState<FileData | null>(null);

  // Build folder path for navigation
  useEffect(() => {
    const buildFolderPath = async () => {
      if (!currentFolderId) {
        setFolderPath([]);
        return;
      }

      const path: FolderData[] = [];
      let folderId = currentFolderId;

      while (folderId) {
        const { data: folder } = await supabase
          .from('folders')
          .select('*')
          .eq('id', folderId)
          .single();

        if (folder) {
          path.unshift(folder);
          folderId = folder.parent_id;
        } else {
          break;
        }
      }

      setFolderPath(path);
    };

    buildFolderPath();
  }, [currentFolderId]);

  // Fetch all folders for move file dropdown
  const { data: allFolders = [] } = useQuery({
    queryKey: ['all-folders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as FolderData[];
    }
  });

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

  // Create folder mutation - updated to include icon
  const createFolderMutation = useMutation({
    mutationFn: async ({ name, description, icon }: { name: string; description: string; icon: string }) => {
      // Validate and sanitize inputs
      const sanitizedName = sanitizeInput(name);
      const sanitizedDescription = sanitizeInput(description);
      
      const nameValidation = validateFolderName(sanitizedName);
      if (!nameValidation.isValid) {
        throw new Error(nameValidation.error);
      }
      
      console.log('Creating folder:', sanitizedName, 'with parent_id:', currentFolderId, 'icon:', icon);
      
      const { data, error } = await supabase
        .from('folders')
        .insert([{ 
          name: sanitizedName, 
          description: sanitizedDescription || null, 
          parent_id: currentFolderId,
          icon: icon || 'folder'
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
      queryClient.invalidateQueries({ queryKey: ['all-folders'] });
      setNewFolderName('');
      setNewFolderDescription('');
      setNewFolderIcon('folder');
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
      // Validate file before upload
      const fileValidation = validateFileType(file);
      if (!fileValidation.isValid) {
        throw new Error(fileValidation.error);
      }
      
      const nameValidation = validateFileName(file.name);
      if (!nameValidation.isValid) {
        throw new Error(nameValidation.error);
      }
      
      console.log('Starting file upload:', file.name, 'Size:', file.size, 'Type:', file.type);
      console.log('Current folder ID:', currentFolderId);
      
      const sanitizedFileName = sanitizeInput(file.name);
      const fileName = `${Date.now()}-${sanitizedFileName}`;
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
          name: sanitizedFileName,
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

  // Move file mutation
  const moveFileMutation = useMutation({
    mutationFn: async ({ fileId, folderId }: { fileId: string; folderId: string | null }) => {
      const { error } = await supabase
        .from('files')
        .update({ folder_id: folderId })
        .eq('id', fileId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      setMovingFile(null);
      toast.success('File moved successfully');
    },
    onError: (error) => {
      toast.error('Failed to move file: ' + error.message);
    }
  });

  // Update description mutation
  const updateDescriptionMutation = useMutation({
    mutationFn: async ({ type, id, description }: { type: 'folder' | 'file'; id: string; description: string }) => {
      const sanitizedDescription = sanitizeInput(description);
      const table = type === 'folder' ? 'folders' : 'files';
      const { error } = await supabase
        .from(table)
        .update({ description: sanitizedDescription || null })
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

  // Delete folder mutation
  const deleteFolderMutation = useMutation({
    mutationFn: async (folderId: string) => {
      const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', folderId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      toast.success('Folder deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete folder: ' + error.message);
    }
  });

  // Delete file mutation
  const deleteFileMutation = useMutation({
    mutationFn: async (file: FileData) => {
      // Delete from storage first
      const { error: storageError } = await supabase.storage
        .from('file-explorer')
        .remove([file.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error } = await supabase
        .from('files')
        .delete()
        .eq('id', file.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      toast.success('File deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete file: ' + error.message);
    }
  });

  // Edit folder mutation - updated to include icon
  const editFolderMutation = useMutation({
    mutationFn: async ({ id, name, description, icon }: { id: string; name: string; description: string; icon?: string }) => {
      // Validate and sanitize inputs
      const sanitizedName = sanitizeInput(name);
      const sanitizedDescription = sanitizeInput(description);
      
      const nameValidation = validateFolderName(sanitizedName);
      if (!nameValidation.isValid) {
        throw new Error(nameValidation.error);
      }
      
      const updateData: any = { name: sanitizedName, description: sanitizedDescription || null };
      if (icon) {
        updateData.icon = icon;
      }
      
      const { error } = await supabase
        .from('folders')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['all-folders'] });
      setEditingItem(null);
      toast.success('Folder updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update folder: ' + error.message);
    }
  });

  // Edit file mutation
  const editFileMutation = useMutation({
    mutationFn: async ({ id, name, description }: { id: string; name: string; description: string }) => {
      // Validate and sanitize inputs
      const sanitizedName = sanitizeInput(name);
      const sanitizedDescription = sanitizeInput(description);
      
      const nameValidation = validateFileName(sanitizedName);
      if (!nameValidation.isValid) {
        throw new Error(nameValidation.error);
      }
      
      const { error } = await supabase
        .from('files')
        .update({ name: sanitizedName, description: sanitizedDescription || null })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      setEditingItem(null);
      toast.success('File updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update file: ' + error.message);
    }
  });

  const getFolderIcon = (iconName?: string) => {
    const iconConfig = FOLDER_ICONS.find(icon => icon.name === iconName) || FOLDER_ICONS[0];
    const IconComponent = iconConfig.icon;
    return <IconComponent className="w-12 h-12 text-blue-500" />;
  };

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

  const handleFileClick = (file: FileData) => {
    if (canPreview(file.mime_type)) {
      setPreviewFile(file);
    } else {
      downloadFile(file);
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

        {/* Breadcrumb Navigation */}
        {folderPath.length > 0 && (
          <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentFolderId(null)}
              className="text-blue-500 hover:text-blue-600"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Root
            </Button>
            {folderPath.map((folder, index) => (
              <div key={folder.id} className="flex items-center gap-2">
                <span>/</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentFolderId(folder.id)}
                  className={index === folderPath.length - 1 ? "text-foreground font-medium" : "text-blue-500 hover:text-blue-600"}
                >
                  {folder.name}
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Back button for root level */}
        {currentFolderId && (
          <div className="mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const parentId = folderPath.length > 1 ? folderPath[folderPath.length - 2].id : null;
                setCurrentFolderId(parentId);
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        )}

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
                    <div>
                      <Label htmlFor="folder-icon">Icon</Label>
                      <Select 
                        value={newFolderIcon} 
                        onValueChange={setNewFolderIcon}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select an icon" />
                        </SelectTrigger>
                        <SelectContent>
                          {FOLDER_ICONS.map((iconConfig) => {
                            const IconComponent = iconConfig.icon;
                            return (
                              <SelectItem key={iconConfig.name} value={iconConfig.name}>
                                <div className="flex items-center gap-2">
                                  <IconComponent className="w-4 h-4" />
                                  {iconConfig.label}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={() => createFolderMutation.mutate({ 
                        name: newFolderName, 
                        description: newFolderDescription,
                        icon: newFolderIcon 
                      })}
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
              <p className="text-muted-foreground">
                or use the upload button above
                {currentFolderId && ` (files will be uploaded to this folder)`}
              </p>
            </div>
          </div>
        )}

        {/* File Grid */}
        <div className={viewMode === 'grid' 
          ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
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
                  <div className={viewMode === 'grid' ? "mb-2" : ""}>
                    {getFolderIcon(folder.icon)}
                  </div>
                  <div className={viewMode === 'grid' ? "" : "flex-1"}>
                    <h3 className="font-medium truncate">{folder.name}</h3>
                    {folder.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{folder.description}</p>
                    )}
                  </div>
                  {user && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingItem({ 
                            type: 'folder', 
                            id: folder.id, 
                            name: folder.name, 
                            description: folder.description || '',
                            icon: folder.icon || 'folder'
                          });
                        }}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Are you sure you want to delete this folder? This will also delete all files and subfolders inside it.')) {
                            deleteFolderMutation.mutate(folder.id);
                          }
                        }}
                      >
                        <Trash className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Files */}
          {filteredFiles.map((file) => (
            <Card 
              key={file.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleFileClick(file)}
            >
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
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewFile(file);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadFile(file);
                      }}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    {user && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMovingFile(file);
                          }}
                        >
                          <Move className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingItem({ type: 'file', id: file.id, name: file.name, description: file.description || '' });
                          }}
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Are you sure you want to delete this file?')) {
                              deleteFileMutation.mutate(file);
                            }
                          }}
                        >
                          <Trash className="w-4 h-4 text-red-500" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Move File Dialog */}
        {movingFile && (
          <Dialog open={!!movingFile} onOpenChange={() => setMovingFile(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Move File: {movingFile.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="destination-folder">Destination Folder</Label>
                  <Select 
                    onValueChange={(value) => {
                      const folderId = value === 'root' ? null : value;
                      moveFileMutation.mutate({ 
                        fileId: movingFile.id, 
                        folderId 
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select destination folder" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="root">
                        <div className="flex items-center gap-2">
                          <Folder className="w-4 h-4" />
                          Root Folder
                        </div>
                      </SelectItem>
                      {allFolders.map((folder) => (
                        <SelectItem key={folder.id} value={folder.id}>
                          <div className="flex items-center gap-2">
                            {getFolderIcon(folder.icon)}
                            {folder.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Edit Dialog */}
        {editingItem && (
          <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit {editingItem.type === 'folder' ? 'Folder' : 'File'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    placeholder="Enter name"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editingItem.description}
                    onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                    placeholder="Enter description"
                  />
                </div>
                {editingItem.type === 'folder' && (
                  <div>
                    <Label htmlFor="edit-icon">Icon</Label>
                    <Select 
                      value={editingItem.icon || 'folder'} 
                      onValueChange={(value) => setEditingItem({ ...editingItem, icon: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an icon" />
                      </SelectTrigger>
                      <SelectContent>
                        {FOLDER_ICONS.map((iconConfig) => {
                          const IconComponent = iconConfig.icon;
                          return (
                            <SelectItem key={iconConfig.name} value={iconConfig.name}>
                              <div className="flex items-center gap-2">
                                <IconComponent className="w-4 h-4" />
                                {iconConfig.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button
                  onClick={() => {
                    if (editingItem.type === 'folder') {
                      editFolderMutation.mutate({
                        id: editingItem.id,
                        name: editingItem.name,
                        description: editingItem.description,
                        icon: editingItem.icon
                      });
                    } else {
                      editFileMutation.mutate({
                        id: editingItem.id,
                        name: editingItem.name,
                        description: editingItem.description
                      });
                    }
                  }}
                  disabled={editFolderMutation.isPending || editFileMutation.isPending}
                  className="w-full"
                >
                  Update {editingItem.type === 'folder' ? 'Folder' : 'File'}
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
