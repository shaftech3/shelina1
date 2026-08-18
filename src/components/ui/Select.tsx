import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { controlClasses, Field } from './Field';
import { Icon } from './Icon';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  /** Options are always supplied by the caller — no global option dictionaries. */
  options: SelectOption[];
  placeholder?: string;
  wrapperClassName?: string;
}

/** Native select for reliability and zero JS weight; styled to match inputs. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, required, options, placeholder, className, wrapperClassName, ...rest },
  ref,
) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={wrapperClassName}>
      {(fieldProps) => (
        <div className="relative">
          <select
            ref={ref}
            {...fieldProps}
            {...rest}
            className={controlClasses(
              Boolean(error),
              cn('h-12 cursor-pointer appearance-none pr-11', className),
            )}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
          <Icon
            name="chevron-down"
            size={18}
            className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-subtle"
          />
        </div>
      )}
    </Field>
  );
});
