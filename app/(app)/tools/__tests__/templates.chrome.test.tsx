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

  it('puts Mode B tab first and defaults activeTab to modeB', () => {
    const modeBIdx = src.indexOf('testID="tools-tab-mode-b"');
    const catalogIdx = src.indexOf('testID="tools-tab-catalog"');
    expect(modeBIdx).toBeGreaterThan(-1);
    expect(catalogIdx).toBeGreaterThan(-1);
    expect(modeBIdx).toBeLessThan(catalogIdx);
    expect(src).toContain("useState<'catalog' | 'modeB'>('modeB')");
  });

  it('labels text inputs and uses Division name (PDF), not PDF title', () => {
    expect(src).toContain('Division name (PDF)');
    expect(src).not.toContain('PDF title');
    expect(src).toContain('>Courts</Text>');
    expect(src).toContain('>Start</Text>');
    expect(src).toContain('>End</Text>');
    expect(src).toContain('>Opponents</Text>');
    expect(src).toContain('>Repeat</Text>');
  });

  it('puts Edition name first on branding row with maxLength 25 and No organizer', () => {
    const branding = src.slice(src.indexOf('tools-branding-row'));
    const editionIdx = branding.indexOf('Edition name');
    const organizerIdx = branding.indexOf('Organizer branding');
    const clubIdx = branding.indexOf('Club host branding');
    expect(editionIdx).toBeGreaterThan(-1);
    expect(organizerIdx).toBeGreaterThan(editionIdx);
    expect(clubIdx).toBeGreaterThan(organizerIdx);
    expect(src).toContain('testID="tools-edition-name"');
    expect(src).toContain('maxLength={25}');
    expect(src).toContain("label: 'No organizer'");
    expect(src).toContain('NO_ORGANIZER');
    expect(src).toContain('useState<number>(NO_ORGANIZER)');
  });

  it('uses court badges instead of comma courts input and wraps Players/Courts', () => {
    expect(src).not.toContain('tools-courts-input');
    expect(src).toContain('testID="tools-court-draft"');
    expect(src).toContain('testID="tools-court-add"');
    expect(src).toContain('tools-court-badge-${i}');
    expect(src).toContain('MAX_COURTS = 4');
    expect(src).toContain('testID="tools-players-field"');
    expect(src).toContain('testID="tools-courts-field"');
    const playersField = src.slice(
      src.indexOf('testID="tools-players-field"'),
      src.indexOf('testID="tools-courts-field"')
    );
    expect(playersField).toContain('>Players</Text>');
    expect(playersField).toContain('tools-player-picker');
    const courtsField = src.slice(src.indexOf('testID="tools-courts-field"'));
    expect(courtsField).toContain('>Courts</Text>');
    expect(courtsField).toContain('tools-courts-row');
  });

  it('uses usePlayerPicker and sticky selected players panel', () => {
    expect(src).toContain('usePlayerPicker');
    expect(src).toContain('tools-player-picker');
    expect(src).not.toContain('tools-player-filter');
    expect(src).not.toContain('loadAllPlayersPages');
    expect(src).toContain("position: 'sticky'");
    expect(src).toContain('top: 0');
    expect(src).toContain('tools-selected-players');
  });

  it('uses SortableRow handle DnD with PDF avatars and collecting tooltip', () => {
    expect(src).toContain('SortableDragHandle');
    expect(src).not.toContain('SortableArrows');
    expect(src).toContain('activationMode="handle"');
    expect(src).toContain('CachedPdfImageReload');
    expect(src).toContain('useCachedPdfAvatarReload');
    expect(src).toContain('tools-player-avatar-${p.id_player}');
    expect(src).toContain('albums-outline');
    expect(src).toContain('tools-collecting-tip-${p.id_player}');
    expect(src).toContain(
      'If player is collecting points from the matches and they appear on the Ranking poster.'
    );
  });

  it('drives Mode B actions through ActionButton status hooks without demo', () => {
    expect(src).toContain('testID="tools-preview"');
    expect(src).toContain('tools-pdf-matches-${courtIndex}');
    expect(src).toContain('testID="tools-pdf-ranking"');
    expect(src).not.toContain('testID="tools-demo"');
    expect(src).not.toContain('templatesToolsApi.demo');
    expect(src).toContain('const previewStatus = useActionButtonStatus();');
    expect(src).not.toContain(
      'const demoStatus = useActionButtonStatus({ auditoryFeedback: true });'
    );
    expect(src).toContain('startIcon="download"');
    expect(src).toMatch(
      /testID="tools-pdf-ranking"[\s\S]*?startIcon="download"/
    );
    expect(src).not.toContain('court_index for matches PDF');
    expect(src).not.toContain("useState('0')");
  });

  it('lets Mode B presses throw instead of setting a banner', () => {
    expect(src).toMatch(/throw new Error\('PDF download is web-only\.'\)/);
    expect(src).not.toContain('Scratch preview failed');
    expect(src).not.toContain('PDF download failed');
    expect(src).not.toContain('Demo failed');
  });
});
