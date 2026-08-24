/**
 * Player detail layout with tab chrome.
 */

import { PageChromeProvider } from '@/components/chrome/PageChromeProvider';
import { PlayerDetailChrome } from '@/components/players/PlayerDetailChrome';
import React from 'react';

export default function PlayerIdLayout() {
  return (
    <PageChromeProvider>
      <PlayerDetailChrome />
    </PageChromeProvider>
  );
}
