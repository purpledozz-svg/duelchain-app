import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './Button';
import { CurrencyDisplay } from './CurrencyDisplay';

interface ForfeitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  betAmount: number;
  currency: 'ETH' | 'BTC' | 'USDC';
}

export const ForfeitModal = ({
  isOpen,
  onClose,
  onConfirm,
  betAmount,
  currency
}: ForfeitModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <div className="bg-primary border-2 border-red-500/50 rounded-lg p-8 mx-4">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                    <AlertTriangle size={24} className="text-red-500" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-text-primary">Forfeit Match?</h2>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-text-secondary hover:text-text-primary transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-text-secondary mb-4">
                  Are you sure you want to forfeit this match? You will lose your bet.
                </p>
                <div className="bg-red-500/10 border border-red-500/30 rounded p-4">
                  <p className="text-sm text-text-secondary mb-2">You will lose:</p>
                  <p className="text-2xl font-bold text-red-400">
                    <CurrencyDisplay amount={betAmount} currency={currency} />
                  </p>
                </div>
              </div>

              <div className="flex space-x-3">
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className="flex-1 bg-red-500 hover:bg-red-600 border-red-500"
                >
                  Confirm Forfeit
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
