import { describe, it, expect } from 'vitest';

describe('Vitest smoke test', () => {
  it('should run in jsdom environment', () => {
    expect(typeof document).toBe('object');
    expect(typeof window).toBe('object');
  });

  it('should have localStorage mock working', () => {
    localStorage.setItem('test', '123');
    expect(localStorage.getItem('test')).toBe('123');
  });
});
