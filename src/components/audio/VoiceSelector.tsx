/**
 * VoiceSelector - Dropdown for selecting ElevenLabs voice
 */

import { VOICES, DEFAULT_VOICE } from '@/services/lessonAudioAPI';
import { cn } from '@/lib/utils';

interface VoiceSelectorProps {
  value?: string;
  onChange: (voiceId: string) => void;
  size?: 'sm' | 'default';
  className?: string;
  disabled?: boolean;
}

export function VoiceSelector({
  value = DEFAULT_VOICE,
  onChange,
  size = 'default',
  className,
  disabled = false,
}: VoiceSelectorProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={cn(
        'border rounded bg-background focus:outline-none focus:ring-2 focus:ring-ring',
        size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1.5',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {VOICES.map((voice) => (
        <option key={voice.id} value={voice.id}>
          {voice.name}
        </option>
      ))}
    </select>
  );
}

