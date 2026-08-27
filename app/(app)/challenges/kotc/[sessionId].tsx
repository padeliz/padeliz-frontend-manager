import KotcLivePanel from '@/components/challenges/KotcLivePanel';
import FullscreenToggleButton from '@/components/chrome/FullscreenToggleButton';
import AppLayout from '@/components/layout/AppLayout';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

export default function KotcLivePage() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const id = Number(sessionId);
  const [footer, setFooter] = useState<React.ReactNode | null>(null);

  useEffect(() => {
    return () => setFooter(null);
  }, []);

  return (
    <AppLayout
      title="King of the Court"
      headerActions={<FullscreenToggleButton />}
      footer={footer}
    >
      <View className="flex-1">
        {Number.isFinite(id) ? (
          <KotcLivePanel sessionId={id} onFooterReady={setFooter} />
        ) : null}
      </View>
    </AppLayout>
  );
}
