import { ChallengesChrome } from '@/components/challenges/ChallengesChrome';
import { PageChromeProvider } from '@/components/chrome/PageChromeProvider';
import React from 'react';

export default function ChallengesHubLayout() {
  return (
    <PageChromeProvider>
      <ChallengesChrome />
    </PageChromeProvider>
  );
}
