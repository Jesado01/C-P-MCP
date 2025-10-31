import { Globe, FileText, Search, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';

interface QuickActionsProps {
  onActionClick: (text: string) => void;
}

export const QuickActions = ({ onActionClick }: QuickActionsProps) => {
  const actions = [
    {
      icon: Globe,
      label: 'Navigate to...',
      text: 'navigate https://',
    },
    {
      icon: FileText,
      label: 'Generate Tests',
      text: 'genera pruebas completas para ',
    },
    {
      icon: Search,
      label: 'Inspect Page',
      text: 'inspecciona la página actual',
    },
    {
      icon: CheckCircle,
      label: 'Run Tests',
      text: 'ejecuta los tests generados',
    },
  ];

  return (
    <div className="border-t border-border bg-card p-3">
      <div className="max-w-4xl mx-auto flex flex-wrap gap-2">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant="outline"
            size="sm"
            onClick={() => onActionClick(action.text)}
            className="rounded-full border-border hover:bg-muted hover:border-primary transition-colors"
          >
            <action.icon className="w-4 h-4 mr-2" />
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
};
