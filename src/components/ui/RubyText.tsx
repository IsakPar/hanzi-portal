/**
 * RubyText Component
 * 
 * Displays pinyin next to Chinese text using pinyin-pro library.
 * Only shows pinyin if the text contains Chinese characters.
 */

import { useMemo } from 'react';
import { pinyin } from 'pinyin-pro';
import { cn } from '@/lib/utils';

interface RubyTextProps {
  /** The text to display (Chinese characters) */
  text: string;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Check if a string contains Chinese characters
 */
function containsChinese(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

/**
 * RubyText - Shows pinyin inline next to Chinese text
 * 
 * Example: 你好 → "nǐ hǎo"
 */
export function RubyText({ text, className, size = 'sm' }: RubyTextProps) {
  const pinyinText = useMemo(() => {
    if (!text || !containsChinese(text)) {
      return null;
    }
    
    try {
      return pinyin(text, { toneType: 'symbol', type: 'string' });
    } catch {
      return null;
    }
  }, [text]);

  // Don't render anything if no Chinese or empty
  if (!pinyinText) {
    return null;
  }

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <span 
      className={cn(
        'text-muted-foreground font-normal italic',
        sizeClasses[size],
        className
      )}
      title={`Pinyin: ${pinyinText}`}
    >
      {pinyinText}
    </span>
  );
}

/**
 * Inline variant that wraps both hanzi and pinyin
 */
interface InlineRubyProps {
  text: string;
  className?: string;
  hanziClassName?: string;
  pinyinClassName?: string;
}

export function InlineRuby({ text, className, hanziClassName, pinyinClassName }: InlineRubyProps) {
  const pinyinText = useMemo(() => {
    if (!text || !containsChinese(text)) {
      return null;
    }
    
    try {
      return pinyin(text, { toneType: 'symbol', type: 'string' });
    } catch {
      return null;
    }
  }, [text]);

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className={hanziClassName}>{text}</span>
      {pinyinText && (
        <span 
          className={cn('text-xs text-muted-foreground italic', pinyinClassName)}
        >
          {pinyinText}
        </span>
      )}
    </span>
  );
}

export default RubyText;

