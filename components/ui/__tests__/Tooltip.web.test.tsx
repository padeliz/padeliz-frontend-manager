/**
 * @jest-environment jsdom
 *
 * Floating UI web hover attaches native DOM listeners on the reference element.
 * These tests use react-dom (real DOM) rather than RNTL's test renderer.
 */

import Tooltip from '@/components/ui/Tooltip.web';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Alert } from 'react-native';

describe('Tooltip (web)', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeAll(() => {
    Element.prototype.getBoundingClientRect = jest.fn(() => ({
      x: 150,
      y: 200,
      width: 100,
      height: 20,
      top: 200,
      left: 150,
      bottom: 220,
      right: 250,
      toJSON: () => ({}),
    }));
  });

  beforeEach(() => {
    jest.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  function renderTooltip(
    props: Partial<React.ComponentProps<typeof Tooltip>> = {}
  ) {
    act(() => {
      root.render(
        <Tooltip content="Hint text" testID="tooltip-trigger" {...props}>
          <span>Trigger</span>
        </Tooltip>
      );
    });
  }

  function tip() {
    return document.querySelector('[data-testid="tooltip-content"]');
  }

  function trigger() {
    return document.querySelector(
      '[data-testid="tooltip-trigger"]'
    ) as HTMLElement;
  }

  function mouseEnter() {
    act(() => {
      trigger().dispatchEvent(
        new MouseEvent('mouseenter', { bubbles: true, cancelable: true })
      );
    });
  }

  function mouseLeave() {
    act(() => {
      trigger().dispatchEvent(
        new MouseEvent('mouseleave', { bubbles: true, cancelable: true })
      );
    });
  }

  function clickTrigger() {
    act(() => {
      trigger().dispatchEvent(
        new MouseEvent('mousedown', {
          bubbles: true,
          cancelable: true,
          button: 0,
        })
      );
      trigger().dispatchEvent(
        new MouseEvent('mouseup', {
          bubbles: true,
          cancelable: true,
          button: 0,
        })
      );
      trigger().dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })
      );
    });
  }

  function focusTrigger() {
    act(() => {
      trigger().focus();
      trigger().dispatchEvent(
        new FocusEvent('focus', { bubbles: true, cancelable: true })
      );
    });
  }

  function blurTrigger() {
    act(() => {
      const el = trigger();
      // React onBlur from useFocus (relatedTarget must leave the reference)
      const blurEvent = new FocusEvent('blur', {
        bubbles: true,
        cancelable: true,
        relatedTarget: document.body,
      });
      el.dispatchEvent(blurEvent);
      el.blur();
      document.body.setAttribute('tabindex', '-1');
      document.body.focus();
    });
    // useFocus closes inside a macrotask setTimeout(0)
    act(() => {
      jest.advanceTimersByTime(0);
    });
  }

  it('renders children', () => {
    renderTooltip();
    expect(container.textContent).toContain('Trigger');
  });

  it('exposes testID on the reference', () => {
    renderTooltip();
    expect(trigger()).toBeTruthy();
  });

  it('opens on hover and closes on mouse leave when unpinned', () => {
    renderTooltip({ content: 'Shirt size: XL' });
    expect(tip()).toBeNull();

    mouseEnter();
    expect(tip()?.textContent).toBe('Shirt size: XL');

    mouseLeave();
    expect(tip()).toBeNull();
  });

  it('opens on focus and closes on blur when unpinned', () => {
    renderTooltip();

    focusTrigger();
    expect(tip()).toBeTruthy();

    blurTrigger();
    expect(tip()).toBeNull();
  });

  it('pins on click so mouse leave does not close', () => {
    renderTooltip();

    clickTrigger();
    expect(tip()).toBeTruthy();

    mouseLeave();
    expect(tip()).toBeTruthy();
  });

  it('closes a pinned tip on Escape', () => {
    renderTooltip();
    clickTrigger();
    expect(tip()).toBeTruthy();

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      );
    });
    expect(tip()).toBeNull();
  });

  it('closes a pinned tip on outside press', () => {
    renderTooltip();
    clickTrigger();
    expect(tip()).toBeTruthy();

    act(() => {
      const outside = document.createElement('div');
      document.body.appendChild(outside);
      outside.dispatchEvent(
        new MouseEvent('pointerdown', { bubbles: true, cancelable: true })
      );
      outside.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, cancelable: true })
      );
      outside.remove();
    });
    expect(tip()).toBeNull();
  });

  it('closes a pinned tip on blur', () => {
    renderTooltip();
    clickTrigger();
    expect(tip()).toBeTruthy();

    // Click may move focus into the floating node; return focus to the
    // reference so useFocus can observe blur-away as unfocus.
    act(() => {
      trigger().focus();
    });
    blurTrigger();
    expect(tip()).toBeNull();
  });

  it('closes on second click (toggle)', () => {
    renderTooltip();
    clickTrigger();
    expect(tip()).toBeTruthy();
    clickTrigger();
    expect(tip()).toBeNull();
  });

  it('does not open when disabled', () => {
    renderTooltip({ disabled: true });
    mouseEnter();
    focusTrigger();
    clickTrigger();
    expect(tip()).toBeNull();
  });

  it('does not open when content is empty', () => {
    renderTooltip({ content: '' });
    mouseEnter();
    clickTrigger();
    expect(tip()).toBeNull();
  });

  it('applies Floating UI positioning styles including transform', () => {
    renderTooltip();
    mouseEnter();
    const el = tip() as HTMLElement;
    expect(el).toBeTruthy();
    expect(el.style.transform).toBeTruthy();
  });

  it('sets pointer-events none on the tip', () => {
    renderTooltip();
    mouseEnter();
    const el = tip() as HTMLElement;
    expect(el.style.pointerEvents).toBe('none');
  });

  it('exposes tooltip role on the tip', () => {
    renderTooltip();
    mouseEnter();
    const el = tip() as HTMLElement;
    expect(el.getAttribute('role')).toBe('tooltip');
  });

  it('never calls Alert.alert', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    renderTooltip();
    mouseEnter();
    clickTrigger();
    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
