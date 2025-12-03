/**
 * VoiceSelector
 * 
 * Dropdown for selecting ElevenLabs voice for audio generation.
 */

import { Label } from '@/components/ui/label';

export const VOICES = [
  { id: 'chinese-female-1', name: 'Mei Lin (Female)', description: 'Clear, natural' },
  { id: 'chinese-female-2', name: 'Xiao Mei (Female)', description: 'Younger, friendly' },
  { id: 'chinese-male-1', name: 'Wei Chen (Male)', description: 'Clear, natural' },
  { id: 'chinese-male-2', name: 'Zhang Wei (Male)', description: 'Deeper voice' },
] as const;

export type VoiceId = typeof VOICES[number]['id'];

interface VoiceSelectorProps {
  value: VoiceId;
  onChange: (voice: VoiceId) => void;
  label?: string;
  showDescription?: boolean;
  className?: string;
}

export function VoiceSelector({
  value,
  onChange,
  label = 'Voice',
  showDescription = false,
  className = '',
}: VoiceSelectorProps) {
  return (
    <div className={className}>
      {label && <Label className="text-gray-700">{label}</Label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as VoiceId)}
        className="w-full px-3 py-2 border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        {VOICES.map((voice) => (
          <option key={voice.id} value={voice.id}>
            {voice.name}
            {showDescription && ` - ${voice.description}`}
          </option>
        ))}
      </select>
    </div>
  );
}

export default VoiceSelector;

