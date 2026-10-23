import { describe, expect, it } from 'vitest';
import { assistantLanguage } from '../../shared/assistant-language';

describe('language selection', () => {
  it.each([
    ['Magkano ang caregiver?', 'English', 'Tagalog'],
    ['Mano ti bayad?', 'English', 'Ilocano'],
    ['How can I book?', 'Tagalog', 'English'],
    ['OK', 'Ilokano', 'Ilocano'],
    ['OK', 'Tagalog', 'Tagalog'],
  ])('%s overrides or inherits %s', (text, preference, expected) => {
    expect(assistantLanguage([{ role: 'user', text }], preference)).toBe(expected);
  });
  it('inherits user language, ignoring assistant language', () => {
    expect(assistantLanguage([{ role: 'user', text: 'Mano ti bayad?' }, { role: 'assistant', text: 'The price is PHP 300' }, { role: 'user', text: 'OK' }])).toBe('Ilocano');
  });
  it('switches language with the latest question', () => {
    expect(assistantLanguage([{ role: 'user', text: 'Mano ti bayad?' }, { role: 'user', text: 'How can I book?' }])).toBe('English');
  });
});

import { localAnswer, reply } from '../../frontend/src/services/assistant-replies';
const ctx = { name: 'Ana', active: 2, weekCount: 3 };
describe('on-phone replies', () => {
  it.each([
    ['Tagalog', 'Hindi ako makahinga', 'tumawag sa 911'],
    ['Ilocano', 'Saan ak a makanges', 'tumawag iti 911'],
    ['English', 'I cannot breathe', 'call 911'],
  ] as const)('localizes emergencies in %s', (language, question, expected) => {
    expect(localAnswer(question, ctx, language)?.text).toContain(expected);
  });
  it('localizes personal request counts', () => {
    expect(localAnswer('Status ng request ko', ctx, 'Tagalog')?.text).toBe('Mayroon kang 2 aktibong request.');
    expect(localAnswer('Dagiti kiddawko', ctx, 'Ilocano')?.text).toBe('Adda 2 nga aktibo a kiddawmo.');
  });
  it.each(['English', 'Tagalog', 'Ilocano'] as const)('has a localized offline reply for %s', (language) => {
    const text = reply('caregiver', ctx, language).text;
    expect(text).toContain(language === 'English' ? 'unavailable' : language === 'Tagalog' ? 'Hindi available' : 'Saan nga available');
  });
});
