/**
 * Floating tooltip on web (hover/focus + click-to-pin).
 */

import {
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole,
  type OpenChangeReason,
} from '@floating-ui/react';
import React, { useCallback, useEffect, useState } from 'react';
import {
  tipBodyWeb,
  tipChromeWeb,
  tipTitleWeb,
  type TooltipProps,
} from '@/components/ui/tooltipShared';

export type { TooltipProps };

export default function Tooltip({
  content,
  title,
  children,
  disabled = false,
  testID,
}: TooltipProps) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);

  const enabled = !disabled && content !== '';

  useEffect(() => {
    if (!enabled) {
      setOpen(false);
      setPinned(false);
    }
  }, [enabled]);

  const handleOpenChange = useCallback(
    (next: boolean, _event?: Event, reason?: OpenChangeReason) => {
      if (!enabled) {
        setOpen(false);
        setPinned(false);
        return;
      }

      if (next) {
        if (reason === 'click') {
          setPinned(true);
        }
        setOpen(true);
        return;
      }

      // Ignore hover-leave while click/touch-pinned
      if (pinned && reason === 'hover') {
        return;
      }

      setPinned(false);
      setOpen(false);
    },
    [enabled, pinned]
  );

  const { refs, floatingStyles, context } = useFloating({
    open: open && enabled,
    onOpenChange: handleOpenChange,
    placement: 'top',
    strategy: 'fixed',
    middleware: [offset(6), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  const hover = useHover(context, { move: false, enabled });
  const focus = useFocus(context, { enabled });
  const click = useClick(context, { enabled });
  const dismiss = useDismiss(context, { enabled });
  const role = useRole(context, { role: 'tooltip' });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    click,
    dismiss,
    role,
  ]);

  const isOpen = open && enabled;

  return (
    <>
      <div
        ref={refs.setReference}
        data-testid={testID}
        tabIndex={enabled ? 0 : undefined}
        style={{ display: 'inline-flex' }}
        {...getReferenceProps()}
      >
        {children}
      </div>
      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            data-testid="tooltip-content"
            style={{
              ...floatingStyles,
              ...tipChromeWeb,
              pointerEvents: 'none',
            }}
            {...getFloatingProps()}
          >
            {title ? (
              <div data-testid="tooltip-title" style={tipTitleWeb}>
                {title}
              </div>
            ) : null}
            <div data-testid="tooltip-body" style={tipBodyWeb}>
              {content}
            </div>
          </div>
        </FloatingPortal>
      )}
    </>
  );
}
