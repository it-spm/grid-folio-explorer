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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-load preview when dialog opens
  useEffect(() => {
    if (isOpen && file && !fileUrl) {
      loadPreview();
    }
    if (!isOpen) {
      // Clean up when dialog closes
      setFileUrl(null);
      setError(null);
    }
  }, [isOpen, file]);

  const loadPreview = async () => {
    if (!file) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.storage
        .from('file-explorer')
        .createSignedUrl(file.file_path, 3600); // 1 hour expiry

      if (error) throw error;
      setFileUrl(data.signedUrl);
    } catch (error) {
      console.error('Preview error:', error);
      setError('Failed to load file preview');
      toast.error('Failed to load file preview');
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
    if (!file || loading) return null;
    if (error) {
      return (
        <div className="text-center py-8">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={loadPreview} variant="outline">
            Try Again
          </Button>
        </div>
      );
    }
    if (!fileUrl) return null;

    const mimeType = file.mime_type || '';

    // Images
    if (mimeType.startsWith('image/')) {
      return (
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <img
            src={fileUrl}
            alt={file.name}
            className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
            style={{ imageRendering: 'smooth' }}
          />
        </div>
      );
    }

    // PDFs
    if (mimeType === 'application/pdf') {
      return (
        <div className="w-full h-[70vh] border border-border rounded-lg overflow-hidden">
          <iframe
            src={fileUrl}
            className="w-full h-full"
            title={file.name}
          />
        </div>
      );
    }

    // Videos
    if (mimeType.startsWith('video/')) {
      return (
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <video
            src={fileUrl}
            controls
            className="max-w-full max-h-[70vh] rounded-lg shadow-lg"
            preload="metadata"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    // Audio
    if (mimeType.startsWith('audio/')) {
      return (
        <div className="text-center py-12">
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-8 max-w-md mx-auto">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM15.657 6.343a1 1 0 011.414 0A9.972 9.972 0 0119 12a9.972 9.972 0 01-1.929 5.657 1 1 0 11-1.414-1.414A7.971 7.971 0 0017 12c0-1.664-.506-3.205-1.343-4.243a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 12a5.983 5.983 0 01-.757 2.829 1 1 0 11-1.415-1.415A3.987 3.987 0 0013.5 12a3.987 3.987 0 00-.672-1.414 1 1 0 010-1.415z" clipRule="evenodd" />
              </svg>
            </div>
            <audio
              src={fileUrl}
              controls
              className="w-full"
              preload="metadata"
            >
              Your browser does not support the audio tag.
            </audio>
            <p className="mt-4 text-sm text-gray-600 font-medium">{file.name}</p>
          </div>
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
          <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-8 max-w-md mx-auto">
            <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="mb-4 text-gray-700 font-medium">
              Office documents can be previewed using online viewers
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => window.open(`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(fileUrl)}`, '_blank')}
                className="w-full bg-blue-600 hover:bg-blue-700"
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
        </div>
      );
    }

    // Text files
    if (mimeType.startsWith('text/')) {
      return (
        <div className="w-full h-[70vh] border border-border rounded-lg overflow-hidden">
          <iframe
            src={fileUrl}
            className="w-full h-full"
            title={file.name}
          />
        </div>
      );
    }

    // Fallback for unsupported types
    return (
      <div className="text-center py-12">
        <div className="bg-gray-50 rounded-xl p-8 max-w-md mx-auto">
          <div className="w-16 h-16 bg-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-gray-600 mb-4 font-medium">
            Preview not available for this file type
          </p>
          <Button onClick={downloadFile} className="w-full">
            <Download className="w-4 h-4 mr-2" />
            Download to view
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <DialogTitle className="truncate pr-8 text-lg font-semibold">{file?.name}</DialogTitle>
          <div className="flex gap-2 flex-shrink-0">
            {fileUrl && !loading && (
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

        <div className="overflow-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading preview...</p>
              </div>
            </div>
          ) : (
            renderPreview()
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FilePreview;
