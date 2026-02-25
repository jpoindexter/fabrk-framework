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
 * Escape JSON string for safe embedding inside a script tag.
 *
 * JSON.stringify is safe for most contexts, but a malicious value
 * containing the literal sequence `</script` can break out of the
 * script element in HTML. We replace `</script` (case-insensitive)
 * and also escape U+2028/U+2029 line separators which can cause
 * issues in some older HTML parsers.
 */
function safeJsonLd(data: object): string {
  return JSON.stringify(data)
    .replace(/<\/script/gi, '<\\/script')
    .replace(/<!--/g, '<\\!--')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
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
      {schemaArray.map((item, index) => {
        const jsonLd = safeJsonLd(item);
        return (
          <script
            key={index}
            type="application/ld+json"
            nonce={nonce}
            dangerouslySetInnerHTML={{ __html: jsonLd }} // JSON-LD requires script injection; content is escaped by safeJsonLd
          />
        );
      })}
    </>
  );
}
