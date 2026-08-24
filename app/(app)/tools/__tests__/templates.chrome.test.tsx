/**
 * @jest-environment jsdom
 */
import fs from 'fs';
import path from 'path';

describe('Tools templates chrome', () => {
  it('registers Templates breadcrumbs and does not nest AppContentScroll', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'templates.tsx'),
      'utf8'
    );
    expect(src).not.toContain('AppContentScroll');
    expect(src).toContain('useBreadcrumbSegments');
    expect(src).toContain("label: 'Templates'");
    expect(src).toContain('title="Templates"');
    expect(src).toContain('HeaderActionButton');
    expect(src).not.toMatch(/arrow-back/);
    expect(src).not.toMatch(/router\.back/);
  });
});
