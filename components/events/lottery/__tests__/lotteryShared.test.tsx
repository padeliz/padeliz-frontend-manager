import {
  prizeLineLabel,
  prizeNameFromLine,
} from '@/components/events/eventLotteryUtils';
import LotteryEmptyState, {
  mismatchWarningContent,
  MismatchWarning,
} from '@/components/events/lottery/lotteryShared';
import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';

jest.mock('@/components/ui/Tooltip', () => {
  const React = require('react');
  const { Text, View } = require('react-native');
  return {
    __esModule: true,
    default: ({
      content,
      children,
      testID,
    }: {
      content: string;
      children: React.ReactNode;
      testID?: string;
    }) => (
      <View testID={testID}>
        <Text testID={`${testID}-tooltip-content`}>{content}</Text>
        {children}
      </View>
    ),
  };
});

describe('prizeNameFromLine / prizeLineLabel', () => {
  it('returns prize name only, ignoring sponsor', () => {
    const line = {
      prize: { name: 'Racket' },
      prize_id: 1,
      sponsor: { name: 'Acme' },
    };
    expect(prizeNameFromLine(line)).toBe('Racket');
    expect(prizeLineLabel(line)).toBe('Racket · Acme');
  });

  it('falls back to Prize #id when name missing', () => {
    expect(prizeNameFromLine({ prize: null, prize_id: 42 })).toBe('Prize #42');
    expect(prizeNameFromLine({})).toBe('prize');
  });

  it('prizeLineLabel still combines Prize · Sponsor', () => {
    expect(
      prizeLineLabel({
        prize: { name: 'Racket' },
        prize_id: 1,
        sponsor: { name: 'Acme' },
      })
    ).toBe('Racket · Acme');
    expect(
      prizeLineLabel({ prize: { name: 'Racket' }, sponsor: null })
    ).toBe('Racket');
  });
});

describe('LotteryEmptyState', () => {
  it('kind none shows no-lotteries copy', () => {
    const { getByTestId } = render(<LotteryEmptyState kind="none" />);
    expect(getByTestId('lottery-none-empty')).toHaveTextContent(
      'No lotteries for this event.'
    );
  });

  it('kind select / default shows select copy', () => {
    const { getByTestId, rerender } = render(<LotteryEmptyState />);
    expect(getByTestId('lottery-select-empty')).toHaveTextContent(
      'Select a lottery to view prizes, rules, and luckies.'
    );
    rerender(<LotteryEmptyState kind="select" />);
    expect(getByTestId('lottery-select-empty')).toHaveTextContent(
      'Select a lottery to view prizes, rules, and luckies.'
    );
  });
});

describe('MismatchWarning', () => {
  it('builds tooltip content with both quantities', () => {
    expect(mismatchWarningContent(5, 2)).toBe(
      'Prize quantity (5) does not match total rule quantity (2).'
    );
  });

  it('renders tooltip with prize vs rule quantities', () => {
    const { getByTestId } = render(
      <MismatchWarning
        testID="lottery-prize-mismatch-11"
        prizeQuantity={5}
        ruleQuantityTotal={2}
      />
    );
    expect(
      getByTestId('lottery-prize-mismatch-11-tooltip-content')
    ).toHaveTextContent(
      'Prize quantity (5) does not match total rule quantity (2).'
    );
  });
});
