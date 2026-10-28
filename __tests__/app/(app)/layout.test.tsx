import fs from 'fs';
import path from 'path';

describe('(app)/_layout.tsx', () => {
  it('declares only the index Stack.Screen (file-based discovery for other routes)', () => {
    const layoutPath = path.join(process.cwd(), 'app', '(app)', '_layout.tsx');
    const source = fs.readFileSync(layoutPath, 'utf8');

    const screenNames = [...source.matchAll(/<Stack\.Screen\s+name="([^"]+)"/g)].map(
      match => match[1]
    );

    expect(screenNames).toEqual(['index']);
    expect(source).not.toMatch(/name="clubs"/);
    expect(source).not.toMatch(/name="players"/);
  });
});
