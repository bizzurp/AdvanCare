import React, { useState } from 'react';
import { FAQ_ITEMS } from '../data/faqData';
import { Icon } from './Icon';

export const FAQAccordion: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {FAQ_ITEMS.map((item, idx) => {
        const isOpen = openIndex === idx;
        return (
          <div
            key={item.question}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
              border: isOpen ? '1.5px solid var(--advancare-teal)' : '1px solid var(--advancare-line)',
              overflow: 'hidden',
              transition: 'border-color 160ms ease',
            }}
          >
            <button
              onClick={() => toggle(idx)}
              style={{
                width: '100%',
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                textAlign: 'left',
                gap: 16,
              }}
              aria-expanded={isOpen}
            >
              <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--advancare-ink)' }}>
                {item.question}
              </span>
              <span
                style={{
                  transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 200ms ease',
                  color: isOpen ? 'var(--advancare-teal)' : 'var(--advancare-control)',
                  flexShrink: 0,
                }}
              >
                <Icon name="alt-arrow-down" size={18} />
              </span>
            </button>
            {isOpen && (
              <div
                style={{
                  padding: '0 24px 20px 24px',
                  fontSize: 14,
                  color: 'var(--advancare-muted)',
                  lineHeight: 1.6,
                  borderTop: '1px solid var(--advancare-paper)',
                }}
              >
                {item.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
