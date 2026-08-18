/**
 * Admin entry point.
 *
 * Everything admin-related is re-exported here and loaded lazily from the
 * router, so none of it ships in the storefront's initial bundle.
 */
export { AdminRoutes } from './AdminRoutes';
