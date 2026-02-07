/**
 * Schema Script Component
 * Injects JSON-LD structured data into pages for SEO/AEO optimization
 */

import * as React from 'react';

export interface SchemaScriptProps {
  schema: object | object[];
  nonce?: string;
}

/**
 * Render JSON-LD schema in a script tag
 * Place this component in your page layout or component
 *
 * @example
 * ```tsx
 * <SchemaScript schema={{ "@type": "Organization", name: "My Company" }} />
 * ```
 */
export function SchemaScript({ schema, nonce }: SchemaScriptProps) {
  const schemaArray = Array.isArray(schema) ? schema : [schema];

  return (
    <>
      {schemaArray.map((item, index) => (
        <script
          key={index}
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </>
  );
}
