
import { useState } from 'react';
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
  const [loading, setLoading] = useState(false);

  const handleOpen = async () => {
    if (!file) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from('file-explorer')
        .createSignedUrl(file.file_path, 3600); // 1 hour expiry

      if (error) throw error;
      setFileUrl(data.signedUrl);
    } catch (error) {
      toast.error('Failed to load file preview');
      console.error('Preview error:', error);
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

  const openInNewTab = () => {
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    }
  };

  const renderPreview = () => {
    if (!file || !fileUrl) return null;

    const mimeType = file.mime_type || '';

    // Images
    if (mimeType.startsWith('image/')) {
      return (
        <img
          src={fileUrl}
          alt={file.name}
          className="max-w-full max-h-[70vh] object-contain mx-auto"
        />
      );
    }

    // PDFs
    if (mimeType === 'application/pdf') {
      return (
        <iframe
          src={fileUrl}
          className="w-full h-[70vh] border-0"
          title={file.name}
        />
      );
    }

    // Videos
    if (mimeType.startsWith('video/')) {
      return (
        <video
          src={fileUrl}
          controls
          className="max-w-full max-h-[70vh] mx-auto"
        >
          Your browser does not support the video tag.
        </video>
      );
    }

    // Audio
    if (mimeType.startsWith('audio/')) {
      return (
        <div className="text-center py-8">
          <audio
            src={fileUrl}
            controls
            className="mx-auto"
          >
            Your browser does not support the audio tag.
          </audio>
          <p className="mt-4 text-muted-foreground">{file.name}</p>
        </div>
      );
    }

    // Office documents (Word, Excel, PowerPoint)
    if (
      mimeType.includes('word') ||
      mimeType.includes('excel') ||
      mimeType.includes('sheet') ||
      mimeType.includes('presentation') ||
      mimeType.includes('powerpoint') ||
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ) {
      return (
        <div className="text-center py-8">
          <p className="mb-4 text-muted-foreground">
            Office documents can be previewed using Office Online or Google Docs
          </p>
          <div className="space-y-2">
            <Button
              onClick={() => window.open(`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(fileUrl)}`, '_blank')}
              className="w-full"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open with Office Online
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open(`https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}`, '_blank')}
              className="w-full"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open with Google Docs
            </Button>
          </div>
        </div>
      );
    }

    // Text files
    if (mimeType.startsWith('text/')) {
      return (
        <iframe
          src={fileUrl}
          className="w-full h-[70vh] border border-border rounded"
          title={file.name}
        />
      );
    }

    // Fallback for unsupported types
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">
          Preview not available for this file type
        </p>
        <Button onClick={downloadFile}>
          <Download className="w-4 h-4 mr-2" />
          Download to view
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="truncate pr-8">{file?.name}</DialogTitle>
          <div className="flex gap-2">
            {fileUrl && (
              <>
                <Button variant="outline" size="sm" onClick={openInNewTab}>
                  <ExternalLink className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={downloadFile}>
                  <Download className="w-4 h-4" />
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Loading preview...</span>
            </div>
          ) : (
            renderPreview()
          )}
        </div>

        {file && !loading && !fileUrl && (
          <div className="text-center py-4">
            <Button onClick={handleOpen}>
              Load Preview
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FilePreview;
