import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';

interface BackButtonProps {
  to?: string;
  label?: string;
  showHome?: boolean;
}

export const BackButton = ({ to, label = 'Back', showHome = false }: BackButtonProps) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="flex items-center space-x-4">
      <button
        onClick={handleBack}
        className="inline-flex items-center space-x-2 text-text-secondary hover:text-accent transition-colors group"
      >
        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        <span className="font-mono text-sm">{label}</span>
      </button>

      {showHome && (
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center space-x-2 text-text-secondary hover:text-accent transition-colors"
        >
          <Home size={18} />
          <span className="font-mono text-xs">Home</span>
        </button>
      )}
    </div>
  );
};
