/**
 * @jest-environment jsdom
 */
import fs from 'fs';
import path from 'path';

describe('Tools templates chrome', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'templates.tsx'),
    'utf8'
  );

  it('registers Templates breadcrumbs and does not nest AppContentScroll', () => {
    expect(src).not.toContain('AppContentScroll');
    expect(src).toContain('useBreadcrumbSegments');
    expect(src).toContain("label: 'Templates'");
    expect(src).toContain('title="Templates"');
    expect(src).toContain('ActionButton');
    expect(src).toContain('pendingAppearance="spinIcon"');
    expect(src).toContain('successHoldMs: 4000');
    expect(src).not.toMatch(/arrow-back/);
    expect(src).not.toMatch(/router\.back/);
  });

  it('drives the Mode B actions through ActionButton status hooks', () => {
    expect(src).toContain('testID="tools-preview"');
    expect(src).toContain('testID="tools-pdf-matches"');
    expect(src).toContain('testID="tools-pdf-ranking"');
    expect(src).toContain('testID="tools-demo"');
    expect(src).toContain('const previewStatus = useActionButtonStatus();');
    expect(src).toContain(
      'const demoStatus = useActionButtonStatus({ auditoryFeedback: true });'
    );
    expect(src).toMatch(
      /testID="tools-pdf-matches"[\s\S]*?startIcon="download"/
    );
    expect(src).toMatch(
      /testID="tools-pdf-ranking"[\s\S]*?startIcon="download"/
    );
  });

  it('lets Mode B presses throw instead of setting a banner', () => {
    expect(src).toMatch(/throw new Error\('PDF download is web-only\.'\)/);
    expect(src).not.toContain('Scratch preview failed');
    expect(src).not.toContain('PDF download failed');
    expect(src).not.toContain('Demo failed');
  });
});
