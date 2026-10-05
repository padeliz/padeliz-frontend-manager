import { confirmAction } from '@/utils/confirmAction';
import { confirmAction as confirmActionReexport } from '@/components/events/eventLotteryUtils';
import { Alert } from 'react-native';

describe('confirmAction', () => {
  const originalConfirm = window.confirm;

  afterEach(() => {
    window.confirm = originalConfirm;
    jest.restoreAllMocks();
  });

  it('web: window.confirm true calls onConfirm', () => {
    window.confirm = jest.fn(() => true);
    const onConfirm = jest.fn();
    confirmAction('Title', 'Message', onConfirm);
    expect(window.confirm).toHaveBeenCalledWith('Message');
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('web: window.confirm false does not call onConfirm', () => {
    window.confirm = jest.fn(() => false);
    const onConfirm = jest.fn();
    confirmAction('Title', 'Message', onConfirm);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('native: Alert.alert OK fires onConfirm when window.confirm unavailable', () => {
    // @ts-expect-error force native path
    window.confirm = undefined;
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const onConfirm = jest.fn();
    confirmAction('Title', 'Message', onConfirm);
    expect(alertSpy).toHaveBeenCalledWith(
      'Title',
      'Message',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
        expect.objectContaining({ text: 'OK' }),
      ])
    );
    const buttons = alertSpy.mock.calls[0][2] as Array<{
      text: string;
      onPress?: () => void;
    }>;
    buttons.find(b => b.text === 'OK')?.onPress?.();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('re-exports from eventLotteryUtils', () => {
    expect(confirmActionReexport).toBe(confirmAction);
  });
});
