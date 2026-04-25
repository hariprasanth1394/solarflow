'use client'

import { memo, useMemo } from 'react'
import Select, { MultiValue, StylesConfig } from 'react-select'
import makeAnimated from 'react-select/animated'

type MultiSelectDropdownProps = {
  label: string
  placeholder: string
  options: SelectOption[]
  selected: string[]
  onChange: (values: string[]) => void
  helperText?: string
}

type SelectOption = {
  label: string
  value: string
}

const SELECT_ALL_VALUE = '__ALL__'
const animatedComponents = makeAnimated()

const selectStyles: StylesConfig<SelectOption, true> = {
  control: (base, state) => ({
    ...base,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: 'var(--sf-card-bg)',
    color: 'var(--sf-text)',
    borderColor: state.isFocused ? 'var(--sf-primary-start)' : 'var(--sf-card-border)',
    boxShadow: state.isFocused ? 'var(--sf-focus-glow)' : 'none',
    '&:hover': { borderColor: 'var(--sf-card-border)' }
  }),
  menu: (base) => ({
    ...base,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'var(--sf-card-bg)',
    border: '1px solid var(--sf-card-border)',
    boxShadow: '0 10px 24px rgba(15, 23, 42, 0.18)'
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  menuList: (base) => ({ ...base, maxHeight: 240, backgroundColor: 'var(--sf-card-bg)' }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused ? 'var(--sf-hover-soft)' : 'var(--sf-card-bg)',
    color: 'var(--sf-text)'
  }),
  input: (base) => ({ ...base, color: 'var(--sf-text)' }),
  singleValue: (base) => ({ ...base, color: 'var(--sf-text)' }),
  placeholder: (base) => ({ ...base, color: 'var(--sf-muted-text)' }),
  multiValue: (base) => ({ ...base, borderRadius: 9999, backgroundColor: 'var(--sf-hover-soft)' }),
  multiValueLabel: (base) => ({ ...base, color: 'var(--sf-text)', fontWeight: 500 }),
  multiValueRemove: (base) => ({ ...base, color: 'var(--sf-text)', ':hover': { backgroundColor: 'var(--sf-hover-soft)', color: 'var(--sf-text)' } })
}

function MultiSelectDropdownComponent({
  label,
  placeholder,
  options,
  selected,
  onChange,
  helperText
}: MultiSelectDropdownProps) {
  const realOptions = useMemo<SelectOption[]>(() => options, [options])

  const selectOptions = useMemo<SelectOption[]>(
    () => [{ label: 'Select All', value: SELECT_ALL_VALUE }, ...realOptions],
    [realOptions]
  )

  const selectedOptions = useMemo<SelectOption[]>(
    () => realOptions.filter((option) => selected.includes(option.value)),
    [realOptions, selected]
  )

  const handleChange = (values: MultiValue<SelectOption>) => {
    const next = values.map((item) => item.value)
    if (next.includes(SELECT_ALL_VALUE)) {
      const allValues = realOptions.map((option) => option.value)
      const isAllAlreadySelected = allValues.length > 0 && allValues.every((value) => selected.includes(value))
      onChange(isAllAlreadySelected ? [] : allValues)
      return
    }
    onChange(next)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            Clear All
          </button>
        )}
      </div>

      <Select
        isMulti
        closeMenuOnSelect={false}
        hideSelectedOptions={false}
        components={animatedComponents}
        menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
        menuPosition="fixed"
        options={selectOptions}
        value={selectedOptions}
        onChange={handleChange}
        placeholder={placeholder}
        styles={selectStyles}
      />
      {helperText ? <p className="text-xs text-slate-500">{helperText}</p> : null}
    </div>
  )
}

const MultiSelectDropdown = memo(MultiSelectDropdownComponent)
export default MultiSelectDropdown
