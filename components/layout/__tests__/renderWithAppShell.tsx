import { BreadcrumbProvider } from '@/components/layout/BreadcrumbProvider';
import { render, RenderOptions } from '@testing-library/react-native';
import React from 'react';

type WrapperProps = { children: React.ReactNode };

function AppShellWrapper({ children }: WrapperProps) {
  return <BreadcrumbProvider>{children}</BreadcrumbProvider>;
}

/**
 * Render with app-shell BreadcrumbProvider (matches app/(app)/_layout).
 */
export function renderWithAppShell(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AppShellWrapper, ...options });
}

export { AppShellWrapper };
