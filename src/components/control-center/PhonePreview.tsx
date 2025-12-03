import type { AnnouncementSchema } from './types';

interface PhonePreviewProps {
  schema: AnnouncementSchema;
}

export function PhonePreview({ schema }: PhonePreviewProps) {
  const bgStyle = schema.style.backgroundGradient 
    ? { background: schema.style.backgroundGradient }
    : { backgroundColor: schema.style.backgroundColor || '#4F46E5' };

  // Render icon - inline SVG, URL, or emoji
  const renderIcon = (size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeMap = { sm: 24, md: 48, lg: 64 };
    const px = sizeMap[size];
    
    if (schema.content.iconSvg) {
      return (
        <div 
          className="drop-shadow-lg" 
          style={{ width: px, height: px }}
          dangerouslySetInnerHTML={{ __html: schema.content.iconSvg }} 
        />
      );
    }
    if (schema.content.iconUrl) {
      return <img src={schema.content.iconUrl} alt="" className="drop-shadow-lg" style={{ width: px, height: px }} />;
    }
    if (schema.content.iconEmoji) {
      const textSize = size === 'sm' ? 'text-xl' : size === 'md' ? 'text-4xl' : 'text-5xl';
      return <span className={textSize}>{schema.content.iconEmoji}</span>;
    }
    return null;
  };

  return (
    <div className="bg-gray-900 rounded-[2.5rem] p-3 mt-2 shadow-2xl">
      <div className="bg-black rounded-[2rem] overflow-hidden" style={{ height: 520 }}>
        {/* Phone notch */}
        <div className="h-8 bg-black flex items-center justify-center relative">
          <div className="w-24 h-6 bg-black rounded-b-2xl absolute -top-1" />
          <div className="w-16 h-4 bg-gray-900 rounded-full" />
        </div>
        
        {/* Phone content */}
        <div className="h-full bg-gray-100 relative flex items-center justify-center">
          {/* The announcement preview */}
          {schema.type === 'banner' ? (
            <div className="absolute top-0 left-0 right-0 p-4" style={{ ...bgStyle, color: schema.style.textColor || '#fff' }}>
              <div className="flex items-center gap-3">
                {renderIcon('sm')}
                <div className="flex-1">
                  <div className="font-semibold text-sm">{schema.content.title || 'Title'}</div>
                  {schema.content.subtitle && <div className="text-xs opacity-80">{schema.content.subtitle}</div>}
                </div>
                <button className="text-xs opacity-70">✕</button>
              </div>
            </div>
          ) : schema.type === 'fullscreen' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6" style={{ ...bgStyle, color: schema.style.textColor || '#fff' }}>
              {renderIcon('lg')}
              {schema.content.eyebrow && (
                <div className="text-xs font-bold tracking-wider opacity-80 mt-4 mb-1">{schema.content.eyebrow}</div>
              )}
              <div className="text-2xl font-bold text-center">{schema.content.title || 'Title'}</div>
              {schema.content.subtitle && <div className="text-sm opacity-90 mt-1">{schema.content.subtitle}</div>}
              {schema.content.body && <div className="text-sm text-center opacity-80 mt-3 px-4">{schema.content.body}</div>}
              {schema.content.urgency && (
                <div className="mt-3 px-3 py-1 bg-black/20 rounded-full text-xs">{schema.content.urgency}</div>
              )}
              <div className="mt-6 flex flex-col gap-2 w-full px-6">
                {schema.primaryCta && (
                  <button className="w-full py-3 bg-white/20 backdrop-blur rounded-xl text-sm font-semibold">
                    {schema.primaryCta.text}
                  </button>
                )}
                {schema.secondaryCta && (
                  <button className="w-full py-2 text-sm opacity-70">
                    {schema.secondaryCta.text}
                  </button>
                )}
              </div>
            </div>
          ) : schema.type === 'bottom_sheet' ? (
            <>
              {/* Dimmed background */}
              <div className="absolute inset-0 bg-black/40" />
              {/* Bottom sheet */}
              <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl overflow-hidden" style={{ ...bgStyle, color: schema.style.textColor || '#fff' }}>
                <div className="w-12 h-1 bg-white/30 rounded-full mx-auto mt-3" />
                <div className="p-6 flex flex-col items-center text-center">
                  {renderIcon('md')}
                  <div className="text-lg font-bold mt-3">{schema.content.title || 'Title'}</div>
                  {schema.content.subtitle && <div className="text-sm opacity-80 mt-1">{schema.content.subtitle}</div>}
                  {schema.content.body && <div className="text-sm opacity-70 mt-2">{schema.content.body}</div>}
                  <div className="mt-5 flex flex-col gap-2 w-full">
                    {schema.primaryCta && (
                      <button className="w-full py-3 bg-white/20 rounded-xl text-sm font-semibold">
                        {schema.primaryCta.text}
                      </button>
                    )}
                    {schema.secondaryCta && (
                      <button className="w-full py-2 text-sm opacity-60">
                        {schema.secondaryCta.text}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Modal (default) */
            <>
              {/* Dimmed background */}
              <div className="absolute inset-0 bg-black/40" />
              {/* Modal card */}
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-[260px] relative" style={{ border: schema.style.border }}>
                <div className="p-5 text-center" style={{ ...bgStyle, color: schema.style.textColor || '#fff' }}>
                  {renderIcon('md')}
                  {schema.content.eyebrow && (
                    <div className="text-xs font-bold tracking-wider opacity-80 mt-3 mb-1">{schema.content.eyebrow}</div>
                  )}
                  <div className="text-lg font-bold mt-2">{schema.content.title || 'Title'}</div>
                  {schema.content.subtitle && <div className="text-sm opacity-90 mt-1">{schema.content.subtitle}</div>}
                </div>
                {(schema.content.body || schema.content.signature) && (
                  <div className="p-4 text-center">
                    {schema.content.body && <div className="text-gray-600 text-sm">{schema.content.body}</div>}
                    {schema.content.signature && <div className="text-gray-500 text-xs mt-2 italic">{schema.content.signature}</div>}
                  </div>
                )}
                <div className="p-4 border-t flex flex-col gap-2">
                  {schema.primaryCta && (
                    <button className="w-full py-2.5 rounded-xl text-white text-sm font-semibold" style={bgStyle}>
                      {schema.primaryCta.text}
                    </button>
                  )}
                  {schema.secondaryCta && (
                    <button className="w-full py-2 text-gray-500 text-sm">
                      {schema.secondaryCta.text}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

