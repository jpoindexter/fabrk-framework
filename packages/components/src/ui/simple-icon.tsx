import { cn } from '@fabrk/core';

interface SimpleIconProps {
  path: string;
  className?: string;
  title?: string;
}

export function SimpleIcon({ path, className, title }: SimpleIconProps) {
  // If no title provided, icon is decorative - hide from screen readers
  // If title provided, announce the icon with that title
  return (
    <svg
      role={title ? 'img' : 'presentation'}
      aria-hidden={!title}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      className={cn('h-6 w-6', className)}
    >
      {title && <title>{title}</title>}
      <path d={path} />
    </svg>
  );
}
