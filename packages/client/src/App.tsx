import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Header } from "@/components/layout/Header";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { RequireCustomerAuth } from "@/components/RequireCustomerAuth";
import { isAdminHost } from "@/lib/host";

const HomePage = lazy(() => import("@/pages/home/HomePage"));
const ProductListPage = lazy(() => import("@/pages/products/ProductListPage"));
const ProductDetailPage = lazy(() => import("@/pages/products/ProductDetailPage"));
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/auth/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/auth/ForgotPasswordPage"));
const CartPage = lazy(() => import("@/pages/cart/CartPage"));
const CheckoutPage = lazy(() => import("@/pages/checkout/CheckoutPage"));
const OrderPaymentPage = lazy(() => import("@/pages/orders/OrderPaymentPage"));
const OrdersListPage = lazy(() => import("@/pages/orders/OrdersListPage"));
const OrderDetailPage = lazy(() => import("@/pages/orders/OrderDetailPage"));
const FavoritesPage = lazy(() => import("@/pages/favorites/FavoritesPage"));
const AccountPage = lazy(() => import("@/pages/account/AccountPage"));
const AddressesPage = lazy(() => import("@/pages/account/AddressesPage"));
const AdminLoginPage = lazy(() => import("@/pages/admin/auth/AdminLoginPage"));
const AdminDashboardPage = lazy(() => import("@/pages/admin/dashboard/AdminDashboardPage"));
const AdminProductsPage = lazy(() => import("@/pages/admin/products/AdminProductsPage"));
const AdminOrdersPage = lazy(() => import("@/pages/admin/orders/AdminOrdersPage"));
const AdminMarketingPage = lazy(() => import("@/pages/admin/marketing/AdminMarketingPage"));
const AdminContentPage = lazy(() => import("@/pages/admin/content/AdminContentPage"));
const AdminPaymentMethodsPage = lazy(() => import("@/pages/admin/payments/AdminPaymentMethodsPage"));
const AdminUsersPage = lazy(() => import("@/pages/admin/users/AdminUsersPage"));
const AdminSettingsPage = lazy(() => import("@/pages/admin/settings/AdminSettingsPage"));

function PageLoading() {
  return <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">Loading...</div>;
}

function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper">
      <Header />
      {children}
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          {/* C端商城：浏览 */}
          <Route
            path="/"
            element={
              isAdminHost()
                ? <Navigate to="/admin/dashboard" replace />
                : <StorefrontLayout><HomePage /></StorefrontLayout>
            }
          />
          <Route path="/products" element={<StorefrontLayout><ProductListPage /></StorefrontLayout>} />
          <Route path="/product/:id" element={<StorefrontLayout><ProductDetailPage /></StorefrontLayout>} />

          {/* C端：认证 */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* C端：购物车/结算/订单（需登录） */}
          <Route path="/cart" element={<StorefrontLayout><RequireCustomerAuth><CartPage /></RequireCustomerAuth></StorefrontLayout>} />
          <Route path="/checkout" element={<StorefrontLayout><RequireCustomerAuth><CheckoutPage /></RequireCustomerAuth></StorefrontLayout>} />
          <Route path="/orders" element={<StorefrontLayout><RequireCustomerAuth><OrdersListPage /></RequireCustomerAuth></StorefrontLayout>} />
          <Route path="/orders/:id" element={<StorefrontLayout><RequireCustomerAuth><OrderDetailPage /></RequireCustomerAuth></StorefrontLayout>} />
          <Route path="/orders/:id/payment" element={<StorefrontLayout><RequireCustomerAuth><OrderPaymentPage /></RequireCustomerAuth></StorefrontLayout>} />
          <Route path="/favorites" element={<StorefrontLayout><RequireCustomerAuth><FavoritesPage /></RequireCustomerAuth></StorefrontLayout>} />
          <Route path="/account" element={<StorefrontLayout><RequireCustomerAuth><AccountPage /></RequireCustomerAuth></StorefrontLayout>} />
          <Route path="/account/addresses" element={<StorefrontLayout><RequireCustomerAuth><AddressesPage /></RequireCustomerAuth></StorefrontLayout>} />

          {/* B端后台 */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="products" element={<AdminProductsPage />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="marketing" element={<AdminMarketingPage />} />
            <Route path="content" element={<AdminContentPage />} />
            <Route path="payment-methods" element={<AdminPaymentMethodsPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
