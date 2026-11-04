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
            className="faq-item"
            data-open={isOpen ? '' : undefined}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
              border: isOpen ? '1.5px solid var(--advancare-teal)' : '1px solid var(--advancare-line)',
              overflow: 'hidden',
              transition: 'border-color 200ms ease, box-shadow 240ms var(--ease-out)',
            }}
          >
            <button
              className="faq-trigger"
              onClick={() => toggle(idx)}
              aria-controls={`faq-panel-${idx}`}
              id={`faq-trigger-${idx}`}
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
                  transition: 'transform 300ms var(--ease-out), color 200ms ease',
                  display: 'inline-flex',
                  color: isOpen ? 'var(--advancare-teal)' : 'var(--advancare-control)',
                  flexShrink: 0,
                }}
              >
                <Icon name="alt-arrow-down" size={18} />
              </span>
            </button>
            <div
              id={`faq-panel-${idx}`}
              role="region"
              aria-labelledby={`faq-trigger-${idx}`}
              aria-hidden={!isOpen}
              className="faq-panel"
            >
              <div className="faq-panel-inner">
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
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
