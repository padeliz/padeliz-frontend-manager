/**
 * UI Navigation Types
 * Navigation and layout component types
 */

export interface UiNavigationItem {
  label: string;
  href: string;
  icon: string;
  description?: string;
}

export interface UiSidebarProps {
  currentPath: string;
  onNavigate: () => void;
}

export interface UiBreadcrumbItem {
  label: string;
  href?: string;
}

export interface UiBreadcrumbsProps {
  items: UiBreadcrumbItem[];
}
