/**
 * @jest-environment jsdom
 */
import fs from 'fs';
import path from 'path';

describe('Dashboard scroll ownership', () => {
  it('does not nest AppContentScroll in the route (AppLayout owns scroll)', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'index.tsx'),
      'utf8'
    );
    expect(src).not.toContain('AppContentScroll');
    expect(src).toContain('title="Dashboard"');
    expect(src).not.toMatch(/useBreadcrumbSegments/);
  });
});
