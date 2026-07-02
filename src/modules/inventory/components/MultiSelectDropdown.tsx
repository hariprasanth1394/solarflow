'use client'

import { memo, useMemo } from 'react'
import Select, { MultiValue } from 'react-select'
import makeAnimated from 'react-select/animated'
import { createInventoryMultiSelectStyles } from './inventorySelectStyles'

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
const selectStyles = createInventoryMultiSelectStyles(44)

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
        <label className="text-sm font-medium text-[var(--inv-text)]">{label}</label>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs font-medium text-[var(--inv-secondary)] hover:text-[var(--inv-text)]"
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
        classNamePrefix="inv-select"
      />
      {helperText ? <p className="text-xs text-[var(--inv-secondary)]">{helperText}</p> : null}
    </div>
  )
}

const MultiSelectDropdown = memo(MultiSelectDropdownComponent)
export default MultiSelectDropdown
