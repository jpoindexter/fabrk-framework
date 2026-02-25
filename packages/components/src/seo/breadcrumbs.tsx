'use client';

import * as React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { SchemaScript } from './schema-script';
import { mode } from '@fabrk/design-system';
import { cn } from '@fabrk/core';
import { sanitizeHref } from '../utils';

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
  /** Base URL for generating absolute URLs in schema. Defaults to '' */
  baseUrl?: string;
  /** Custom link component. Defaults to <a> tag. */
  linkComponent?: React.ComponentType<{ href: string; className?: string; children: React.ReactNode }>;
  className?: string;
}

function generateBreadcrumbSchema(items: BreadcrumbItem[], baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${baseUrl}${item.url}`,
    })),
  };
}

/**
 * SEO-optimized breadcrumb navigation
 * Automatically includes JSON-LD schema
 *
 * @example
 * ```tsx
 * <Breadcrumbs
 *   items={[
 *     { name: "Products", url: "/products" },
 *     { name: "SaaS Boilerplate", url: "/products/saas" }
 *   ]}
 * />
 * ```
 */
export function Breadcrumbs({
  items,
  showHome = true,
  baseUrl = '',
  linkComponent: LinkComponent,
  className,
}: BreadcrumbsProps) {
  const allItems = showHome ? [{ name: 'Home', url: '/' }, ...items] : items;
  const schema = generateBreadcrumbSchema(allItems, baseUrl);

  const Link = LinkComponent
    ? ({ href, ...rest }: { href: string; className?: string; children: React.ReactNode }) => (
        <LinkComponent href={sanitizeHref(href)} {...rest} />
      )
    : ({ href, className: cls, children }: { href: string; className?: string; children: React.ReactNode }) => (
        <a href={sanitizeHref(href)} className={cls}>{children}</a>
      );

  return (
    <>
      <SchemaScript schema={schema} />

      <nav aria-label="Breadcrumb" className={cn('flex items-center space-x-2 text-sm', className)}>
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;

          return (
            <div key={`${item.url}-${index}`} className="flex items-center">
              {index > 0 && <ChevronRight className={cn('mx-2 h-4 w-4', mode.color.text.muted)} />}

              {isLast ? (
                <span className={cn('font-medium', mode.color.text.primary)} aria-current="page">
                  {item.name}
                </span>
              ) : (
                <Link
                  href={item.url}
                  className={cn('transition-colors', mode.color.text.muted, mode.state.hover.text)}
                >
                  {index === 0 && showHome ? <Home className="h-4 w-4" /> : item.name}
                </Link>
              )}
            </div>
          );
        })}
      </nav>
    </>
  );
}
