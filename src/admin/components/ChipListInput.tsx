import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';
import { Button, Icon } from '@/components/ui';
import { controlClasses } from '@/components/ui/Field';

interface ChipListInputProps {
  label: string;
  /** Values in author order, exactly as typed. */
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  hint?: string;
  /** Rendered before the text of each chip — used for colour swatches. */
  renderPrefix?: (value: string) => React.ReactNode;
  emptyLabel: string;
}

/**
 * Manual, free-form chip entry.
 *
 * ============================================================================
 * ARCHITECTURAL RULE — DO NOT ADD A PRESET LIST TO THIS COMPONENT
 * ============================================================================
 * This is the component behind "Available Sizes" and "Available Colors". It
 * has NO predefined options, NO dropdown, NO autocomplete and NO taxonomy of
 * any kind, by design:
 *
 *   • Whatever the admin types is stored verbatim — "38", "UK 7", "EU 40",
 *     "Free Size", "Coffee", "Dark Brown" are all equally valid.
 *   • Nothing is validated against a list, lower-cased, title-cased, mapped to
 *     a CSS colour, or reordered. The typed string IS the value.
 *   • The only rules are: non-empty after trimming, and no exact duplicate
 *     within this product (a duplicate is a data-entry slip, not a taxonomy).
 *
 * Sizes and colours are per-product data that the shop owner alone decides.
 * Adding a "helpful" preset list here would silently recreate the global
 * dictionary the whole project is built to avoid.
 * ============================================================================
 */
export function ChipListInput({
  label,
  values,
  onChange,
  placeholder,
  hint,
  renderPrefix,
  emptyLabel,
}: ChipListInputProps) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  function add() {
    const value = draft.trim();
    if (!value) return;

    // Case-insensitive duplicate check, but the ORIGINAL casing is stored.
    if (values.some((existing) => existing.toLowerCase() === value.toLowerCase())) {
      setError(`"${value}" has already been added.`);
      return;
    }

    onChange([...values, value]);
    setDraft('');
    setError(null);
    inputRef.current?.focus();
  }

  function remove(index: number) {
    onChange(values.filter((_, position) => position !== index));
    setError(null);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Enter adds without submitting the surrounding product form.
    if (event.key === 'Enter') {
      event.preventDefault();
      add();
    }
    // Backspace on an empty field removes the last chip — standard tag-input
    // behaviour that keyboard users expect.
    if (event.key === 'Backspace' && !draft && values.length > 0) {
      event.preventDefault();
      remove(values.length - 1);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-label font-medium text-ink">
        {label}
      </label>

      <div className="flex gap-2">
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-describedby={cn(hint && hintId, error && errorId) || undefined}
          aria-invalid={error ? true : undefined}
          className={controlClasses(Boolean(error), 'h-11')}
        />
        <Button
          type="button"
          variant="outline"
          onClick={add}
          disabled={!draft.trim()}
          className="h-11 shrink-0"
        >
          Add
        </Button>
      </div>

      {error ? (
        <p id={errorId} role="alert" className="text-caption text-error">
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="text-caption text-ink-subtle">
            {hint}
          </p>
        )
      )}

      {values.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-cream px-3.5 py-3 text-caption text-ink-subtle">
          {emptyLabel}
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2 pt-0.5">
          {values.map((value, index) => (
            <li key={`${value}-${index}`}>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-3 pr-1 text-body-sm text-ink">
                {renderPrefix?.(value)}
                {value}
                <button
                  type="button"
                  onClick={() => remove(index)}
                  aria-label={`Remove ${value}`}
                  className={cn(
                    'inline-flex h-6 w-6 items-center justify-center rounded-full text-ink-subtle',
                    'transition-colors duration-fast hover:bg-cream hover:text-ink',
                    'focus-visible:outline-none focus-visible:shadow-focus',
                  )}
                >
                  <Icon name="close" size={13} strokeWidth={2.2} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
