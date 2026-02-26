# FABRK E-Commerce Store

Interactive product catalog with shopping cart showcasing FABRK's UI components and state management patterns.

<!-- screenshot -->

## FEATURES

- **Product catalog** - Grid layout with 6 tech products (keyboards, monitors, headsets)
- **Real-time search** - Filter products by name or category
- **Shopping cart** - Sidebar cart with add/remove/quantity controls
- **Stock management** - In-stock/sold-out badges and disabled states
- **Price calculations** - Live cart total with formatted currency
- **Responsive design** - Mobile-first grid with collapsible cart sidebar
- **Terminal aesthetic** - Monospace fonts, uppercase labels, bracket notation

## QUICK START

```bash
# From monorepo root
pnpm install

# Run the example (port 3003)
cd examples/ecommerce
pnpm dev
```

Open [http://localhost:3003](http://localhost:3003) to browse the store.

## WHAT'S DEMONSTRATED

### @fabrk/components

- **Card/CardHeader/CardContent/CardFooter** - Product cards with structured layout
- **Button** - Add to cart actions with disabled states
- **Badge** - Stock status (In Stock, Sold Out) and cart count
- **Input** - Product search with live filtering

### @fabrk/design-system

- **mode.radius** - Consistent border radius from active theme
- **mode.font** - Monospace terminal typography
- **Design tokens** - Semantic colors (background, border, muted, destructive)
- **Theme-aware** - All UI elements via CSS variables

### @fabrk/core

- **cn()** - Utility for conditional className merging
- **Type-safe components** - Full TypeScript interfaces for products and cart

### React Patterns

- **useState** - Cart state, search query, sidebar toggle
- **Derived state** - Cart total and item count calculated from cart array
- **Optimistic updates** - Immediate UI feedback on add/remove actions

## FILE STRUCTURE

```
ecommerce/
├── src/
│   └── app/
│       ├── globals.css          # Tailwind + FABRK design tokens
│       ├── layout.tsx            # Next.js root layout
│       └── page.tsx              # Store with cart logic
├── package.json
├── tsconfig.json
└── next.config.mjs
```

## KEY PATTERNS

**Product type:**
```tsx
interface Product {
  id: string
  name: string
  price: number
  category: string
  inStock: boolean
  description: string
}
```

**Cart operations:**
```tsx
const addToCart = (product: Product) => {
  setCart((prev) => {
    const existing = prev.find((item) => item.product.id === product.id)
    if (existing) {
      return prev.map((item) =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    }
    return [...prev, { product, quantity: 1 }]
  })
}
```

**Responsive cart sidebar:**
```tsx
{cartOpen && (
  <aside className="w-full border-l border-border lg:w-80">
    <div className="sticky top-0">
      {/* Cart contents with quantity controls */}
    </div>
  </aside>
)}
```

**Price formatting:**
```tsx
function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`
}

const cartTotal = cart.reduce(
  (sum, item) => sum + item.product.price * item.quantity,
  0
)
```

## USE CASES

Perfect starting point for:
- E-commerce storefronts
- Product catalogs
- Shopping cart implementations
- Inventory management UIs
- Point-of-sale interfaces

Built with FABRK Framework - [github.com/jpoindexter/fabrk-framework](https://github.com/jpoindexter/fabrk-framework)
