
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FilePreviewProps {
  file: {
    id: string;
    name: string;
    file_path: string;
    mime_type: string | null;
    file_size: number;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

const FilePreview = ({ file, isOpen, onClose }: FilePreviewProps) => {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-open in new tab when dialog opens
  useEffect(() => {
    if (isOpen && file) {
      openInNewTab();
    }
  }, [isOpen, file]);

  // Clean up when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setFileUrl(null);
      setBlobUrl(null);
    }
  }, [isOpen]);

  // Clean up blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  const openInNewTab = async () => {
    if (!file) return;
    
    setLoading(true);
    
    try {
      // For PDFs, get the actual file data for better compatibility
      if (file.mime_type === 'application/pdf') {
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('file-explorer')
          .download(file.file_path);

        if (downloadError) throw downloadError;

        const blobUrl = URL.createObjectURL(fileData);
        setBlobUrl(blobUrl);
        window.open(blobUrl, '_blank');
        onClose(); // Close the dialog after opening in new tab
        return;
      }

      // For other file types, get signed URL
      const { data, error } = await supabase.storage
        .from('file-explorer')
        .createSignedUrl(file.file_path, 3600); // 1 hour expiry

      if (error) throw error;
      
      setFileUrl(data.signedUrl);
      window.open(data.signedUrl, '_blank');
      onClose(); // Close the dialog after opening in new tab
    } catch (error) {
      console.error('Preview error:', error);
      toast.error('Failed to open file preview');
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async () => {
    if (!file) return;
    
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <DialogTitle className="truncate pr-8 text-lg font-semibold">{file?.name}</DialogTitle>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </DialogHeader>

        <div className="text-center py-8">
          {loading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Opening file in new tab...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6">
                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ExternalLink className="w-8 h-8 text-white" />
                </div>
                <p className="text-gray-700 font-medium mb-4">
                  File opened in new tab
                </p>
                <div className="space-y-2">
                  <Button
                    onClick={openInNewTab}
                    className="w-full"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Again
                  </Button>
                  <Button
                    variant="outline"
                    onClick={downloadFile}
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FilePreview;
