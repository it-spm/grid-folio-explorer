
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbProps {
  path: string[];
  onNavigate: (index: number) => void;
}

const Breadcrumb = ({ path, onNavigate }: BreadcrumbProps) => {
  return (
    <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
      <button
        onClick={() => onNavigate(-1)}
        className="flex items-center hover:text-foreground transition-colors"
      >
        <Home size={16} />
      </button>
      
      {path.map((segment, index) => (
        <div key={index} className="flex items-center space-x-2">
          <ChevronRight size={16} />
          <button
            onClick={() => onNavigate(index)}
            className="hover:text-foreground transition-colors"
          >
            {segment}
          </button>
        </div>
      ))}
    </nav>
  );
};

export default Breadcrumb;
