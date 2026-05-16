import { useState, useEffect } from 'react';

interface PlayerAvatarProps {
  username: string;
  avatarUrl?: string | null;
  /** px size of the square avatar */
  size?: number;
  /** rounded-full for circle, rounded-2xl for square */
  shape?: 'circle' | 'square';
  className?: string;
}

function getInitials(username: string) {
  return username.slice(0, 2).toUpperCase();
}

/**
 * Default anthracite/carbon avatar with purple-tinted initials.
 * If avatarUrl is provided, renders the image instead.
 * Falls back gracefully if the image fails to load.
 */
export function PlayerAvatar({
  username,
  avatarUrl,
  size = 40,
  shape = 'circle',
  className = '',
}: PlayerAvatarProps) {
  const [imgError, setImgError] = useState(false);

  // Reset error state whenever the URL changes so a newly uploaded image shows up
  useEffect(() => {
    setImgError(false);
  }, [avatarUrl]);

  const radius = shape === 'circle' ? '9999px' : '16px';
  const fontSize = Math.max(10, Math.floor(size * 0.32));

  const showImage = !!avatarUrl && !imgError;

  return (
    <div
      className={`flex-shrink-0 flex items-center justify-center overflow-hidden select-none ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: showImage ? '#0d0b14' : 'rgba(18,15,28,0.9)',
        border: '1px solid rgba(176,38,255,0.18)',
        boxShadow: '0 0 0 1px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      {showImage ? (
        <img
          src={avatarUrl!}
          alt={username}
          onError={() => setImgError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: radius,
          }}
          draggable={false}
        />
      ) : (
        <span
          className="font-heading font-bold leading-none"
          style={{
            fontSize,
            color: '#B026FF',
            textShadow: '0 0 12px rgba(176,38,255,0.5)',
            letterSpacing: '0.03em',
          }}
        >
          {getInitials(username)}
        </span>
      )}
    </div>
  );
}

export { getInitials as avatarInitials };
