import {
  BreadcrumbProvider,
  useBreadcrumbSegments,
  useBreadcrumbTrail,
} from '@/components/layout/BreadcrumbProvider';
import { SegmentFocusContext } from '@/components/layout/__tests__/breadcrumbFocusTestContext';
import { buildResourceBreadcrumbs } from '@/utils/buildResourceBreadcrumbs';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Text, View } from 'react-native';

jest.mock('@react-navigation/native', () => {
  const React = require('react');
  const {
    SegmentFocusContext,
  } = require('@/components/layout/__tests__/breadcrumbFocusTestContext');

  return {
    useFocusEffect: (callback: () => void | (() => void)) => {
      const focused = React.useContext(SegmentFocusContext);
      React.useEffect(() => {
        if (!focused) return;
        return callback();
      }, [callback, focused]);
    },
  };
});

function TrailProbe() {
  const items = useBreadcrumbTrail();
  return (
    <View>
      <Text testID="trail">{items.map(i => i.label).join(' > ')}</Text>
      <Text testID="trail-hrefs">
        {items.map(i => i.href ?? '').join('|')}
      </Text>
    </View>
  );
}

function SegmentRegistrar({
  id,
  items,
  depth = 0,
}: {
  id: string;
  items: { label: string; href?: string }[];
  depth?: number;
}) {
  useBreadcrumbSegments(id, items, depth);
  return null;
}

function Segment({
  id,
  items,
  focused = true,
  depth = 0,
}: {
  id: string;
  items: { label: string; href?: string }[];
  focused?: boolean;
  depth?: number;
}) {
  return (
    <SegmentFocusContext.Provider value={focused}>
      <SegmentRegistrar id={id} items={items} depth={depth} />
    </SegmentFocusContext.Provider>
  );
}

describe('buildResourceBreadcrumbs', () => {
  it('returns section-only for list', () => {
    expect(
      buildResourceBreadcrumbs({
        sectionLabel: 'Clubs',
        sectionHref: '/clubs',
      })
    ).toEqual([{ label: 'Clubs' }]);
  });

  it('returns section > Add for add leaf', () => {
    expect(
      buildResourceBreadcrumbs({
        sectionLabel: 'Clubs',
        sectionHref: '/clubs',
        leaf: 'Add',
      })
    ).toEqual([
      { label: 'Clubs', href: '/clubs' },
      { label: 'Add' },
    ]);
  });

  it('returns section > leaf for view', () => {
    expect(
      buildResourceBreadcrumbs({
        sectionLabel: 'Clubs',
        sectionHref: '/clubs',
        leaf: 'Ace Club',
      })
    ).toEqual([
      { label: 'Clubs', href: '/clubs' },
      { label: 'Ace Club' },
    ]);
  });
});

describe('BreadcrumbProvider', () => {
  it('composes parent then child segments in registration order', async () => {
    const { getByTestId } = render(
      <BreadcrumbProvider>
        <Segment
          id="zone"
          items={[
            { label: 'Editions', href: '/editions' },
            { label: 'Summer' },
          ]}
        />
        <Segment id="tab" items={[{ label: 'Details' }]} />
        <TrailProbe />
      </BreadcrumbProvider>
    );

    await waitFor(() => {
      expect(getByTestId('trail').props.children).toBe(
        'Editions > Summer > Details'
      );
    });
  });

  it('unregisters segments on unmount', async () => {
    const { getByTestId, rerender } = render(
      <BreadcrumbProvider>
        <Segment id="a" items={[{ label: 'A' }]} />
        <Segment id="b" items={[{ label: 'B' }]} />
        <TrailProbe />
      </BreadcrumbProvider>
    );

    await waitFor(() => {
      expect(getByTestId('trail').props.children).toBe('A > B');
    });

    rerender(
      <BreadcrumbProvider>
        <Segment id="a" items={[{ label: 'A' }]} />
        <TrailProbe />
      </BreadcrumbProvider>
    );

    await waitFor(() => {
      expect(getByTestId('trail').props.children).toBe('A');
    });
  });

  it('updates when segment items change', async () => {
    const { getByTestId, rerender } = render(
      <BreadcrumbProvider>
        <Segment id="view" items={[{ label: 'Clubs', href: '/clubs' }, { label: '7' }]} />
        <TrailProbe />
      </BreadcrumbProvider>
    );

    await waitFor(() => {
      expect(getByTestId('trail').props.children).toBe('Clubs > 7');
    });

    rerender(
      <BreadcrumbProvider>
        <Segment
          id="view"
          items={[{ label: 'Clubs', href: '/clubs' }, { label: 'Ace' }]}
        />
        <TrailProbe />
      </BreadcrumbProvider>
    );

    await waitFor(() => {
      expect(getByTestId('trail').props.children).toBe('Clubs > Ace');
    });
  });

  it('places nested sub-tab after top tab', async () => {
    const { getByTestId } = render(
      <BreadcrumbProvider>
        <Segment
          id="edition"
          items={[
            { label: 'Editions', href: '/editions' },
            { label: 'Summer' },
            { label: 'Registrations', href: '/editions/1/registrations' },
          ]}
        />
        <Segment id="sub" items={[{ label: 'List' }]} depth={1} />
        <TrailProbe />
      </BreadcrumbProvider>
    );

    await waitFor(() => {
      expect(getByTestId('trail').props.children).toBe(
        'Editions > Summer > Registrations > List'
      );
    });
  });

  it('sorts by depth when child registers before parent', async () => {
    const { getByTestId } = render(
      <BreadcrumbProvider>
        <Segment id="sub" items={[{ label: 'Import' }]} depth={1} />
        <Segment
          id="zone"
          depth={0}
          items={[
            { label: 'Players', href: '/players/list' },
            { label: 'Import Players' },
          ]}
        />
        <TrailProbe />
      </BreadcrumbProvider>
    );

    await waitFor(() => {
      expect(getByTestId('trail').props.children).toBe(
        'Players > Import Players > Import'
      );
    });
  });

  it('does not accumulate trails from unfocused stack screens', async () => {
    const { getByTestId, rerender } = render(
      <BreadcrumbProvider>
        <Segment
          id="view"
          focused={false}
          items={[
            { label: 'Clubs', href: '/clubs' },
            { label: 'Padel World' },
          ]}
        />
        <Segment
          id="create"
          focused
          items={[
            { label: 'Clubs', href: '/clubs' },
            { label: 'Add' },
          ]}
        />
        <TrailProbe />
      </BreadcrumbProvider>
    );

    await waitFor(() => {
      expect(getByTestId('trail').props.children).toBe('Clubs > Add');
    });

    rerender(
      <BreadcrumbProvider>
        <Segment
          id="view"
          focused
          items={[
            { label: 'Clubs', href: '/clubs' },
            { label: 'Padel World' },
          ]}
        />
        <Segment
          id="create"
          focused={false}
          items={[
            { label: 'Clubs', href: '/clubs' },
            { label: 'Add' },
          ]}
        />
        <TrailProbe />
      </BreadcrumbProvider>
    );

    await waitFor(() => {
      expect(getByTestId('trail').props.children).toBe('Clubs > Padel World');
    });
  });

  it('is a safe no-op outside provider', () => {
    expect(() =>
      render(<SegmentRegistrar id="x" items={[{ label: 'X' }]} />)
    ).not.toThrow();
  });

  it('does not re-render a stable segment registrar when a sibling updates items', async () => {
    let stableRenders = 0;
    const stableItems = [{ label: 'Stable', href: '/stable' }];

    function StableSegment() {
      stableRenders += 1;
      useBreadcrumbSegments('stable', stableItems, 0);
      return <Text testID="stable-renders">{String(stableRenders)}</Text>;
    }

    function FlipSegment() {
      const [n, setN] = React.useState(0);
      useBreadcrumbSegments('flip', [{ label: `Flip${n}` }], 1);
      return (
        <Text testID="flip-items" onPress={() => setN(v => v + 1)}>
          flip
        </Text>
      );
    }

    const { getByTestId } = render(
      <BreadcrumbProvider>
        <SegmentFocusContext.Provider value={true}>
          <StableSegment />
          <FlipSegment />
        </SegmentFocusContext.Provider>
        <TrailProbe />
      </BreadcrumbProvider>
    );

    await waitFor(() => {
      expect(getByTestId('trail').props.children).toContain('Flip0');
    });
    const afterMount = Number(getByTestId('stable-renders').props.children);

    fireEvent.press(getByTestId('flip-items'));

    await waitFor(() => {
      expect(getByTestId('trail').props.children).toContain('Flip1');
    });
    expect(Number(getByTestId('stable-renders').props.children)).toBe(
      afterMount
    );
  });
});
