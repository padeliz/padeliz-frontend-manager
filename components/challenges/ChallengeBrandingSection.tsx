import { fitLogoSize } from '@/constants/challengeBranding';
import React, { useCallback, useEffect, useState } from 'react';
import { Image, type LayoutChangeEvent, Text, View } from 'react-native';

export type ChallengeLogoAlign = 'start' | 'center';

type Props = {
  title: string;
  rows: string[][];
  logoMaxHeight: number;
  logoAlign: ChallengeLogoAlign;
  rowsGapClassName?: string;
  logoGapClassName?: string;
  testID?: string;
};

type LogoCellProps = {
  uri: string;
  title: string;
  logoIndex: number;
  logoMaxHeight: number;
  logoAlign: ChallengeLogoAlign;
  testID?: string;
  cellTestID?: string;
};

function LogoCell({
  uri,
  title,
  logoIndex,
  logoMaxHeight,
  logoAlign,
  testID,
  cellTestID,
}: LogoCellProps) {
  const [cellWidth, setCellWidth] = useState(0);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(
    null
  );

  useEffect(() => {
    let active = true;
    Image.getSize(
      uri,
      (w, h) => {
        if (!active) return;
        setNatural({ w, h });
      },
      () => {
        if (!active) return;
        setNatural(null);
      }
    );
    return () => {
      active = false;
    };
  }, [uri]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const next = e.nativeEvent.layout.width;
    setCellWidth(prev => (prev === next ? prev : next));
  }, []);

  const fitted =
    natural && cellWidth > 0
      ? fitLogoSize(natural.w, natural.h, cellWidth, logoMaxHeight)
      : { width: 0, height: 0 };

  const alignClass =
    logoAlign === 'center' ? 'items-center' : 'items-start';

  return (
    <View
      className={`flex-1 justify-center ${alignClass}`}
      style={{ height: logoMaxHeight, minHeight: logoMaxHeight }}
      onLayout={onLayout}
      testID={cellTestID}
    >
      <Image
        source={{ uri }}
        accessibilityLabel={`${title} logo ${logoIndex}`}
        resizeMode="stretch"
        style={{
          width: fitted.width,
          height: fitted.height,
        }}
        testID={testID}
      />
    </View>
  );
}

export default function ChallengeBrandingSection({
  title,
  rows,
  logoMaxHeight,
  logoAlign,
  rowsGapClassName = 'gap-3',
  logoGapClassName = 'gap-4',
  testID,
}: Props) {
  return (
    <View
      className="border border-gray-200 bg-transparent rounded-lg p-4"
      testID={testID}
    >
      <Text className="font-semibold text-gray-500 mb-5">{title}</Text>
      <View
        className={rowsGapClassName}
        testID={testID ? `${testID}-rows` : undefined}
      >
        {rows.map((row, rowIndex) => (
          <View
            key={`row-${rowIndex}`}
            className={`flex-row flex-nowrap items-center ${logoGapClassName}`}
            testID={testID ? `${testID}-row-${rowIndex}` : undefined}
          >
            {row.map((uri, colIndex) => (
              <LogoCell
                key={uri}
                uri={uri}
                title={title}
                logoIndex={rowIndex * row.length + colIndex + 1}
                logoMaxHeight={logoMaxHeight}
                logoAlign={logoAlign}
                cellTestID={
                  testID ? `${testID}-cell-${rowIndex}-${colIndex}` : undefined
                }
                testID={
                  testID
                    ? `${testID}-logo-${rowIndex}-${colIndex}`
                    : undefined
                }
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}
