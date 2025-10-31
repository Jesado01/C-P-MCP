import robotIcon from '@/assets/robot-icon.png';
import { Card } from './ui/card';

interface WelcomeScreenProps {
  onExampleClick: (prompt: string) => void;
}

export const WelcomeScreen = ({ onExampleClick }: WelcomeScreenProps) => {
  const examples = [
    'Genera tests para https://saucedemo.com',
    'Abre Google y prueba la búsqueda',
    'Crea tests de login para mi app',
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-12">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="flex justify-center">
          <img src={robotIcon} alt="Robot" className="w-32 h-32" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Claude Testing Agent
          </h1>
          <p className="text-lg text-muted-foreground">
            Automatiza pruebas con inteligencia artificial
          </p>
        </div>

        <div className="grid gap-3 mt-8">
          {examples.map((example, index) => (
            <Card
              key={index}
              className="p-4 cursor-pointer hover:bg-muted transition-colors border-border hover:border-primary"
              onClick={() => onExampleClick(example)}
            >
              <p className="text-sm text-foreground">{example}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
