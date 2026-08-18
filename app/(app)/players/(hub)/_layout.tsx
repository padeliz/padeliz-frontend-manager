import { PlayersChrome } from '@/components/players/PlayersChrome';
import { PageChromeProvider } from '@/components/chrome/PageChromeProvider';
import React from 'react';

export default function PlayersHubLayout() {
  return (
    <PageChromeProvider>
      <PlayersChrome />
    </PageChromeProvider>
  );
}
