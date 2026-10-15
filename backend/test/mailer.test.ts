import { describe, expect, it } from 'vitest';
import { buildMessage, dotStuff } from '../src/lib/mailer';
import { generateCode } from '../src/routes/auth';
import { toManilaTime } from '../src/routes/shifts';

describe('email', () => {
  it('builds a multipart message with UTF-8-safe bodies', () => {
    const msg = buildMessage({ from: 'advancare@gmail.com', fromName: 'AdvanCare', to: 'lola@example.ph', subject: '123456 is your AdvanCare code', text: 'Code: 123456 — salamat', html: '<p>123456</p>' });
    expect(msg).toContain('From: AdvanCare <advancare@gmail.com>\r\n');
    expect(msg).toContain('To: <lola@example.ph>\r\n');
    expect(msg).toContain('Subject: 123456 is your AdvanCare code\r\n');
    expect(msg).toMatch(/Content-Type: multipart\/alternative; boundary="adv-[0-9a-f-]{36}"/);
    expect(msg).toContain('Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64');
    expect(msg).toContain('Content-Type: text/html; charset=UTF-8');
    expect(msg).not.toContain('salamat'); // body is base64
  });

  it('encodes non-ASCII subjects and blocks header injection', () => {
    expect(buildMessage({ from: 'a@b.ph', fromName: 'AdvanCare', to: 'c@d.ph', subject: 'Kódigo', text: 'x' })).toContain('Subject: =?UTF-8?B?');
    expect(() => buildMessage({ from: 'a@b.ph', fromName: 'AdvanCare', to: 'c@d.ph\r\nBcc: x@evil.com', subject: 's', text: 'x' })).toThrow(/injection/);
    expect(() => buildMessage({ from: 'a@b.ph', fromName: 'AdvanCare', to: 'c@d.ph', subject: 'hi\nBcc: x@evil.com', text: 'x' })).toThrow(/injection/);
  });

  it('dot-stuffs lines that start with a period', () => {
    expect(dotStuff('.a\r\nb\r\n.c')).toBe('..a\r\nb\r\n..c');
  });

  it('generates 6-digit codes', () => {
    const codes = Array.from({ length: 200 }, generateCode);
    for (const code of codes) expect(code).toMatch(/^\d{6}$/);
    expect(new Set(codes).size).toBeGreaterThan(190);
  });
});

describe('booking start time', () => {
  it('accepts HH:MM or a timestamp and stores Manila wall time', () => {
    expect(toManilaTime('08:00')).toBe('08:00');
    expect(toManilaTime('08:00:00')).toBe('08:00');
    expect(toManilaTime('2026-10-17T00:00:00.000Z')).toBe('08:00');
    expect(toManilaTime('2026-10-17T14:00:00+08:00')).toBe('14:00');
    expect(toManilaTime('8am')).toBe('8am'); // left for validation to reject
  });
});
