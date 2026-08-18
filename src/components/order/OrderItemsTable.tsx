import { formatPrice } from '@/lib/format';
import type { OrderItem } from '@/types';

/**
 * The purchased lines of an order.
 *
 * Every value rendered here is a purchase-time SNAPSHOT stored on the order
 * item — not a live product lookup. A product that has since been renamed,
 * re-priced or deleted does not change what this shows.
 *
 * Mobile-first: a stacked card layout below `md`, a real table from `md` up.
 * Both render the same snapshot fields, including the exact free-form size and
 * colour the customer chose.
 */
interface OrderItemsTableProps {
  items: OrderItem[];
}

/** Size/colour are optional per product; an em dash beats an empty cell. */
function variantLabel(value: string | null): string {
  return value && value.trim() ? value : '—';
}

export function OrderItemsTable({ items }: OrderItemsTableProps) {
  return (
    <div>
      {/* ── Mobile: stacked cards ─────────────────────────────────── */}
      <ul className="flex flex-col gap-4 md:hidden">
        {items.map((item) => (
          <li key={item.id} className="flex gap-3 border-b border-border pb-4 last:border-0 last:pb-0">
            {item.productImage ? (
              <img
                src={item.productImage}
                alt=""
                loading="lazy"
                className="h-20 w-16 shrink-0 rounded-md bg-cream object-cover"
              />
            ) : (
              <div className="h-20 w-16 shrink-0 rounded-md bg-cream" aria-hidden="true" />
            )}

            <div className="min-w-0 flex-1">
              <p className="text-body-sm font-medium text-ink">{item.productName}</p>
              {item.sku && <p className="mt-0.5 text-caption text-ink-muted">{item.sku}</p>}

              <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-caption text-ink-muted">
                <div className="flex gap-1">
                  <dt>Size:</dt>
                  <dd className="text-ink">{variantLabel(item.size)}</dd>
                </div>
                <div className="flex gap-1">
                  <dt>Colour:</dt>
                  <dd className="text-ink">{variantLabel(item.color)}</dd>
                </div>
                <div className="flex gap-1">
                  <dt>Qty:</dt>
                  <dd className="text-ink">{item.quantity}</dd>
                </div>
              </dl>

              <p className="mt-2 text-body-sm">
                <span className="text-ink-muted">{formatPrice(item.unitPrice)} each</span>
                <span className="ml-2 font-semibold text-ink">{formatPrice(item.lineTotal)}</span>
              </p>
            </div>
          </li>
        ))}
      </ul>

      {/* ── Desktop: table ────────────────────────────────────────── */}
      <div className="hidden md:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="pb-3 text-caption font-semibold uppercase tracking-wide text-ink-muted">
                Product
              </th>
              <th scope="col" className="pb-3 text-caption font-semibold uppercase tracking-wide text-ink-muted">
                Size
              </th>
              <th scope="col" className="pb-3 text-caption font-semibold uppercase tracking-wide text-ink-muted">
                Colour
              </th>
              <th
                scope="col"
                className="pb-3 text-right text-caption font-semibold uppercase tracking-wide text-ink-muted"
              >
                Qty
              </th>
              <th
                scope="col"
                className="pb-3 text-right text-caption font-semibold uppercase tracking-wide text-ink-muted"
              >
                Unit price
              </th>
              <th
                scope="col"
                className="pb-3 text-right text-caption font-semibold uppercase tracking-wide text-ink-muted"
              >
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-border last:border-0">
                <td className="py-4 pr-4">
                  <div className="flex items-center gap-3">
                    {item.productImage ? (
                      <img
                        src={item.productImage}
                        alt=""
                        loading="lazy"
                        className="h-14 w-12 shrink-0 rounded-md bg-cream object-cover"
                      />
                    ) : (
                      <div className="h-14 w-12 shrink-0 rounded-md bg-cream" aria-hidden="true" />
                    )}
                    <div className="min-w-0">
                      <p className="text-body-sm font-medium text-ink">{item.productName}</p>
                      {item.sku && <p className="mt-0.5 text-caption text-ink-muted">{item.sku}</p>}
                    </div>
                  </div>
                </td>
                <td className="py-4 pr-4 text-body-sm text-ink">{variantLabel(item.size)}</td>
                <td className="py-4 pr-4 text-body-sm text-ink">{variantLabel(item.color)}</td>
                <td className="py-4 pr-4 text-right text-body-sm text-ink">{item.quantity}</td>
                <td className="py-4 pr-4 text-right text-body-sm text-ink-muted">
                  {formatPrice(item.unitPrice)}
                </td>
                <td className="py-4 text-right text-body-sm font-semibold text-ink">
                  {formatPrice(item.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
