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
    borderColor: state.isFocused ? '#3b82f6' : '#cbd5e1',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(59,130,246,0.15)' : 'none',
    '&:hover': { borderColor: '#94a3b8' }
  }),
  menu: (base) => ({ ...base, borderRadius: 12, overflow: 'hidden' }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  menuList: (base) => ({ ...base, maxHeight: 240 }),
  multiValue: (base) => ({ ...base, borderRadius: 9999, backgroundColor: '#eff6ff' }),
  multiValueLabel: (base) => ({ ...base, color: '#1d4ed8', fontWeight: 500 }),
  multiValueRemove: (base) => ({ ...base, color: '#1d4ed8', ':hover': { backgroundColor: '#dbeafe', color: '#1e40af' } })
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
