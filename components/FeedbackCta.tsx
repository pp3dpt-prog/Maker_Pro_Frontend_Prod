'use client';
import { useState } from 'react';
import FeedbackModal from './FeedbackModal';

export default function FeedbackCta() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="ll-btn ll-btn-ghost" type="button">
        💬 Deixa o teu feedback
      </button>
      {open && <FeedbackModal onClose={() => setOpen(false)} />}
    </>
  );
}
