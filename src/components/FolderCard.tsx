
import { Folder, FolderOpen } from 'lucide-react';
import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface FolderCardProps {
  name: string;
  description: string;
  itemCount?: number;
  onDoubleClick?: () => void;
}

const FolderCard = ({ name, description, itemCount, onDoubleClick }: FolderCardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="bg-card border border-border rounded-lg p-4 hover:shadow-lg transition-all duration-200 cursor-pointer group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onDoubleClick={onDoubleClick}
          >
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="text-primary transition-transform duration-200 group-hover:scale-110">
          {isHovered ? (
            <FolderOpen size={48} />
          ) : (
            <Folder size={48} />
          )}
        </div>
        
        <div className="space-y-1 w-full">
          <h3 className="font-medium text-card-foreground truncate" title={name}>
            {name}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {description}
          </p>
          {itemCount !== undefined && (
            <p className="text-xs text-muted-foreground">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </p>
          )}
        </div>
      </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{name}</p>
          {description && <p className="text-xs opacity-75">{description}</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default FolderCard;
