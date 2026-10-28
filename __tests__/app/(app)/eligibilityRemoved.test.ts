import { managerNavigationItems } from '@/components/layout/Sidebar';
import { BENEFIT_CONDITION_TYPE_OPTIONS } from '@/utils/benefitForm';
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..', '..', '..');

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('Eligibilities are removed from the Manager', () => {
  it('has no eligibilities routes (list, view or add)', () => {
    expect(fs.existsSync(path.join(ROOT, 'app/(app)/eligibilities'))).toBe(false);
  });

  it('has no eligibility API client', () => {
    expect(
      fs.existsSync(path.join(ROOT, 'services/api/playerEligibilitiesApi.ts'))
    ).toBe(false);
    expect(() => require('@/services/api/playerEligibilitiesApi')).toThrow();
  });

  it('has no eligibilities sidebar entry; assessments and proofs replace it', () => {
    const hrefs = managerNavigationItems.map(item => item.href);
    expect(hrefs).not.toContain('/eligibilities');
    expect(hrefs).toContain('/player-level-assessments');
    expect(hrefs).toContain('/player-student-proofs');
    expect(hrefs).toContain('/levels');
  });

  it('no longer special-cases Eligibility uploads or types', () => {
    expect(read('components/pages/ResourceViewPage.tsx')).not.toMatch(
      /Eligibility/
    );
    expect(read('types/api/entities.ts')).not.toMatch(/ApiPlayerEligibility/);
    expect(read('utils/uploadMetadata.ts')).not.toMatch(/playerEligibility/);
  });

  it('benefit conditions use student_proof_active, not eligibility_flag', () => {
    const values = BENEFIT_CONDITION_TYPE_OPTIONS.map(o => o.value);
    expect(values).toContain('student_proof_active');
    expect(values).not.toContain('eligibility_flag');
    expect(read('components/benefits/BenefitEditorForm.tsx')).not.toMatch(
      /eligibility_flag/
    );
    expect(read('components/benefits/BenefitEditorForm.tsx')).toMatch(
      /student_proof_active/
    );
  });
});
