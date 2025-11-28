/**
 * Idle Warning Modal
 * Shows a warning before auto-logout due to inactivity
 */

import { Clock, MousePointerClick } from 'lucide-react';

interface IdleWarningModalProps {
  remainingTime: number;
  onContinue: () => void;
}

export function IdleWarningModal({ remainingTime, onContinue }: IdleWarningModalProps) {
  const seconds = Math.ceil(remainingTime / 1000);

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in duration-200">
        <div className="text-center">
          {/* Icon */}
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-amber-600" />
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Session Timeout Warning
          </h2>

          {/* Message */}
          <p className="text-gray-600 mb-6">
            Due to inactivity, you will be signed out in{' '}
            <span className="font-bold text-amber-600 text-2xl tabular-nums">
              {seconds}
            </span>
            {' '}seconds for security.
          </p>

          {/* Countdown visual */}
          <div className="w-full h-2 bg-gray-200 rounded-full mb-6 overflow-hidden">
            <div 
              className="h-full bg-amber-500 transition-all duration-1000 ease-linear"
              style={{ width: `${(remainingTime / 60000) * 100}%` }}
            />
          </div>

          {/* Continue button */}
          <button
            onClick={onContinue}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <MousePointerClick className="w-5 h-5" />
            Continue Working
          </button>

          <p className="text-xs text-gray-400 mt-4">
            Click anywhere or move your mouse to stay signed in
          </p>
        </div>
      </div>
    </div>
  );
}

export default IdleWarningModal;

