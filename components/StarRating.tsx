'use client';
import { useState } from 'react';

type Props = {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  readonly?: boolean;
};

export default function StarRating({ value, onChange, size = 24, readonly = false }: Props) {
  const [hover, setHover] = useState(0);
  const active = hover || value;

  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span
          key={n}
          onClick={() => !readonly && onChange?.(n)}
          onMouseEnter={() => !readonly && setHover(n)}
          onMouseLeave={() => !readonly && setHover(0)}
          style={{
            fontSize: size,
            cursor: readonly ? 'default' : 'pointer',
            color: n <= active ? '#f59e0b' : '#334155',
            transition: 'color 0.1s',
            lineHeight: 1,
          }}
        >★</span>
      ))}
    </div>
  );
}
