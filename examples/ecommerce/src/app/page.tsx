'use client'

import { useState } from 'react'
import { cn } from '@fabrk/core'
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  Button,
  Badge,
  Input,
} from '@fabrk/components'
import { mode } from '@fabrk/design-system'

// --- Types ---

interface Product {
  id: string
  name: string
  price: number
  category: string
  inStock: boolean
  description: string
}

interface CartItem {
  product: Product
  quantity: number
}

// --- Mock Products ---

const products: Product[] = [
  {
    id: 'mech-kb-01',
    name: 'Mechanical Keyboard',
    price: 149.99,
    category: 'Peripherals',
    inStock: true,
    description: 'Cherry MX switches, RGB backlit, hot-swappable',
  },
  {
    id: 'usb-hub-01',
    name: 'USB-C Hub 7-Port',
    price: 59.99,
    category: 'Accessories',
    inStock: true,
    description: 'USB 3.2 Gen 2, 10Gbps, aluminum body',
  },
  {
    id: 'monitor-01',
    name: '27" 4K Monitor',
    price: 449.99,
    category: 'Displays',
    inStock: true,
    description: 'IPS panel, 144Hz, USB-C power delivery',
  },
  {
    id: 'headset-01',
    name: 'Wireless Headset',
    price: 89.99,
    category: 'Audio',
    inStock: false,
    description: 'Noise canceling, 40hr battery, low latency',
  },
  {
    id: 'webcam-01',
    name: '4K Webcam',
    price: 129.99,
    category: 'Peripherals',
    inStock: true,
    description: '4K @ 30fps, auto-focus, built-in mic',
  },
  {
    id: 'dock-01',
    name: 'Thunderbolt Dock',
    price: 279.99,
    category: 'Accessories',
    inStock: true,
    description: 'Thunderbolt 4, dual 4K display, 96W charging',
  },
]

// --- Helper ---

function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`
}

// --- Page Component ---

export default function StorePage() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

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

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId))
  }

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    )
  }

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  )
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="text-accent text-xl">#</span>
            <h1 className={cn('text-lg font-bold uppercase tracking-wider', mode.font)}>
              TERMINAL STORE
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:block">
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
              />
            </div>
            <button
              onClick={() => setCartOpen(!cartOpen)}
              className={cn(
                'relative flex items-center gap-2 border border-border px-4 py-2 text-xs font-medium uppercase transition-colors hover:bg-muted',
                mode.font,
                mode.radius
              )}
            >
              {'> CART'}
              {cartItemCount > 0 && (
                <Badge variant="default" size="sm">
                  {cartItemCount}
                </Badge>
              )}
            </button>
          </div>
        </div>
        {/* Mobile search */}
        <div className="border-t border-border px-4 py-2 sm:hidden">
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl">
        {/* Product Grid */}
        <main className={cn('flex-1 p-4', cartOpen && 'lg:pr-0')}>
          <div className="mb-4">
            <span className={cn('text-xs uppercase tracking-wider text-muted-foreground', mode.font)}>
              [CATALOG] {filteredProducts.length} PRODUCTS
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => (
              <Card key={product.id} size="full" interactive>
                <CardHeader
                  title={product.category.toUpperCase()}
                  meta={
                    product.inStock ? (
                      <Badge variant="default" size="sm">IN STOCK</Badge>
                    ) : (
                      <Badge variant="destructive" size="sm">SOLD OUT</Badge>
                    )
                  }
                />
                <CardContent>
                  {/* Image Placeholder */}
                  <div
                    className={cn(
                      'mb-3 flex h-32 items-center justify-center border border-border bg-muted/30',
                      mode.radius
                    )}
                  >
                    <span className={cn('text-2xl text-muted-foreground', mode.font)}>
                      [{product.id.toUpperCase()}]
                    </span>
                  </div>

                  <h3 className={cn('text-sm font-bold uppercase', mode.font)}>
                    {product.name}
                  </h3>
                  <p className={cn('mt-1 text-xs text-muted-foreground', mode.font)}>
                    {product.description}
                  </p>
                  <p className={cn('mt-2 text-lg font-bold tabular-nums', mode.font)}>
                    {formatPrice(product.price)}
                  </p>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    disabled={!product.inStock}
                    onClick={() => addToCart(product)}
                  >
                    {product.inStock ? '> ADD TO CART' : '> SOLD OUT'}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </main>

        {/* Cart Sidebar */}
        {cartOpen && (
          <aside className="w-full border-l border-border lg:w-80">
            <div className="sticky top-0">
              <div className="border-b border-border px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className={cn('text-xs font-bold uppercase tracking-wider', mode.font)}>
                    [CART] {cartItemCount} ITEMS
                  </span>
                  <button
                    onClick={() => setCartOpen(false)}
                    className={cn('text-xs text-muted-foreground hover:text-foreground', mode.font)}
                  >
                    [CLOSE]
                  </button>
                </div>
              </div>

              {cart.length === 0 ? (
                <div className="p-4">
                  <p className={cn('text-xs text-muted-foreground', mode.font)}>
                    Cart is empty. Add items to get started.
                  </p>
                </div>
              ) : (
                <>
                  <div className="max-h-96 overflow-y-auto">
                    {cart.map((item) => (
                      <div
                        key={item.product.id}
                        className="border-b border-border px-4 py-3"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className={cn('text-xs font-bold uppercase truncate', mode.font)}>
                              {item.product.name}
                            </h4>
                            <p className={cn('text-xs text-muted-foreground tabular-nums', mode.font)}>
                              {formatPrice(item.product.price)} each
                            </p>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.product.id)}
                            className={cn(
                              'ml-2 text-xs text-destructive hover:text-destructive/80',
                              mode.font
                            )}
                          >
                            [X]
                          </button>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.product.id, -1)}
                            className={cn(
                              'flex h-6 w-6 items-center justify-center border border-border text-xs hover:bg-muted',
                              mode.radius,
                              mode.font
                            )}
                          >
                            -
                          </button>
                          <span className={cn('w-8 text-center text-xs tabular-nums', mode.font)}>
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.product.id, 1)}
                            className={cn(
                              'flex h-6 w-6 items-center justify-center border border-border text-xs hover:bg-muted',
                              mode.radius,
                              mode.font
                            )}
                          >
                            +
                          </button>
                          <span className={cn('ml-auto text-xs font-bold tabular-nums', mode.font)}>
                            {formatPrice(item.product.price * item.quantity)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Cart Total + Checkout */}
                  <div className="border-t border-border p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className={cn('text-xs uppercase text-muted-foreground', mode.font)}>
                        TOTAL
                      </span>
                      <span className={cn('text-lg font-bold tabular-nums', mode.font)}>
                        {formatPrice(cartTotal)}
                      </span>
                    </div>
                    <Button className="w-full">
                      {'> CHECKOUT'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
