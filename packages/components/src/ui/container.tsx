import { cn } from '@fabrk/core';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

const containerVariants = cva('mx-auto w-full', {
  variants: {
    size: {
      sm: 'max-w-screen-sm',
      md: 'max-w-screen-md',
      lg: 'max-w-screen-lg',
      xl: 'max-w-screen-xl',
      '2xl': 'max-w-screen-2xl',
      full: 'max-w-full',
      prose: 'max-w-prose',
    },
    padding: {
      none: '',
      sm: 'px-6 sm:px-6',
      md: 'px-6 sm:px-6 md:px-8',
      lg: 'px-6 sm:px-6 lg:px-8',
      xl: 'px-12 sm:px-42 lg:px-48 xl:px-64',
    },
  },
  defaultVariants: {
    size: '2xl',
    padding: 'xl',
  },
});

export interface ContainerProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof containerVariants> {
  /**
   * Semantic element to render (div, main, section, article, etc.)
   * Use "main" for main content area, "section" for content sections
   */
  as?: React.ElementType;
}

const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size, padding, as: Component = 'div', ...props }, ref) => {
    return (
      <Component
        data-slot="container"
        ref={ref}
        className={cn(containerVariants({ size, padding }), className)}
        {...props}
      />
    );
  }
);
Container.displayName = 'Container';

export { Container, containerVariants };
