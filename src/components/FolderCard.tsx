import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Folder } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface FolderCardProps {
  // New interface for AdminFileExplorer
  folder?: {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
  };
  onFolderClick?: (folderId: string) => void;
  
  // Legacy interface for FileExplorer
  name?: string;
  description?: string;
  itemCount?: number;
  onDoubleClick?: () => void;
}

const FolderCard = ({ folder, onFolderClick, name, description, itemCount, onDoubleClick }: FolderCardProps) => {
  // Determine which interface is being used
  const folderName = folder?.name || name || '';
  const folderDescription = folder?.description || description || '';
  const showItemCount = itemCount !== undefined;
  const showTimestamp = folder?.created_at;
  
  const handleClick = () => {
    if (folder && onFolderClick) {
      onFolderClick(folder.id);
    } else if (onDoubleClick) {
      onDoubleClick();
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card 
            className="p-8 hover:shadow-md transition-shadow cursor-pointer border-dashed border-2 hover:border-primary/50 h-40"
            onClick={handleClick}
          >
            <div className="flex flex-col items-center text-center space-y-4 h-full justify-center">
              <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center">
                <Folder className="w-8 h-8 text-primary" />
              </div>
              
              <div className="space-y-1">
                <h3 className="font-medium text-base truncate max-w-full">{folderName}</h3>
                {showTimestamp && (
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(folder!.created_at), { addSuffix: true })}
                  </p>
                )}
                {showItemCount && (
                  <p className="text-xs text-muted-foreground">
                    {itemCount} {itemCount === 1 ? 'item' : 'items'}
                  </p>
                )}
              </div>
            </div>
          </Card>
        </TooltipTrigger>
        <TooltipContent>
          <div className="max-w-xs">
            <p className="font-medium">{folderName}</p>
            {folderDescription && (
              <p className="text-sm text-muted-foreground mt-1">
                {folderDescription}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default FolderCard;