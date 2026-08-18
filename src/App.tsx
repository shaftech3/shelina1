import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '@/components/ui';
import { CartProvider } from '@/cart';
import { seoService } from '@/services';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { PageTransition } from '@/components/layout/PageTransition';
import { RouteFallback } from '@/components/layout/RouteFallback';
import { HomePage } from '@/pages/HomePage';
import { ShopPage } from '@/pages/ShopPage';
import { ProductPage } from '@/pages/ProductPage';
import { CartPage } from '@/pages/CartPage';
import { AccountAuthPage } from '@/pages/AccountAuthPage';
import { AccountPage } from '@/pages/AccountPage';
import { AccountOrdersPage } from '@/pages/AccountOrdersPage';
import { AccountOrderDetailPage } from '@/pages/AccountOrderDetailPage';
import { CheckoutPage } from '@/pages/CheckoutPage';
import { OrderSuccessPage } from '@/pages/OrderSuccessPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

/**
 * The entire admin panel is one lazy chunk, so none of it — pages, forms or
 * the auth provider — is downloaded by a customer browsing the shop.
 */
const AdminRoutes = lazy(() =>
  import('@/admin').then((module) => ({ default: module.AdminRoutes })),
);

/**
 * Routes still ahead of the current stage. These render an honest placeholder
 * rather than a fake page — checkout, in particular, must not pretend to
 * process an order.
 */

export default function App() {
  // Global SEO settings live in the database, but seoService.resolve() has to
  // stay synchronous for the page components that call it during render. So we
  // load the settings once at startup and let the service notify its
  // subscribers; until that resolves, pages fall back to neutral defaults.
  useEffect(() => {
    void seoService.prime().catch(() => {
      // A failed prime is not fatal — the fallback metadata still renders.
    });
  }, []);

  return (
    <ToastProvider>
      <BrowserRouter>
        <CartProvider>
          <Suspense fallback={<RouteFallback />}>
            <PageTransition>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/shop" element={<ShopPage />} />
                <Route path="/product/:slug" element={<ProductPage />} />
                <Route path="/cart" element={<CartPage />} />
                {/* Checkout requires a signed-in customer; the page itself
                    redirects a guest to sign-in and preserves their cart. */}
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/order/success/:orderNumber" element={<OrderSuccessPage />} />

                {/* Category, sale and new-arrivals are the shop view with a
                    filter pre-applied rather than separate implementations. */}
                <Route path="/category/:slug" element={<ShopPage />} />
                <Route path="/new-arrivals" element={<ShopPage />} />
                <Route path="/sale" element={<ShopPage />} />

                {/* Customer accounts (Stage 5). Separate from /admin. */}
                <Route path="/account" element={<AccountPage />} />
                <Route path="/account/orders" element={<AccountOrdersPage />} />
                <Route path="/account/orders/:id" element={<AccountOrderDetailPage />} />
                <Route path="/account/sign-in" element={<AccountAuthPage mode="sign-in" />} />
                <Route path="/account/register" element={<AccountAuthPage mode="register" />} />

                {/* Admin panel. `/*` hands the whole subtree to AdminRoutes. */}
                <Route path="/admin/*" element={<AdminRoutes />} />

                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </PageTransition>
          </Suspense>

          {/* Mounted once, outside the routes, so it survives navigation. */}
          <CartDrawer />
        </CartProvider>
      </BrowserRouter>
    </ToastProvider>
  );
}
