"use client"

import { memo, useMemo } from "react"
import CreatableSelect from "react-select/creatable"
import Select, { type StylesConfig } from "react-select"
import { createInventorySelectStyles } from "./inventorySelectStyles"

export type InventorySelectOption = {
  label: string
  value: string
}

type InventorySingleSelectProps = {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  options: InventorySelectOption[]
  helperText?: string
  creatable?: boolean
  isClearable?: boolean
  disabled?: boolean
  inputId?: string
}

const selectStyles: StylesConfig<InventorySelectOption, false> = createInventorySelectStyles(44)

function InventorySingleSelectComponent({
  label,
  placeholder,
  value,
  onChange,
  options,
  helperText,
  creatable = false,
  isClearable = true,
  disabled = false,
  inputId,
}: InventorySingleSelectProps) {
  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? (value ? { label: value, value } : null),
    [options, value]
  )

  const SelectComponent = creatable ? CreatableSelect : Select

  return (
    <div className="inv-form-field">
      <label htmlFor={inputId} className="inv-form-label">
        {label}
      </label>
      <SelectComponent
        inputId={inputId}
        isDisabled={disabled}
        isClearable={isClearable}
        menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
        menuPosition="fixed"
        options={options}
        value={selectedOption}
        onChange={(option) => onChange(option?.value ?? "")}
        onCreateOption={
          creatable
            ? (inputValue) => {
                const trimmed = inputValue.trim()
                if (trimmed) onChange(trimmed)
              }
            : undefined
        }
        placeholder={placeholder}
        styles={selectStyles}
        classNamePrefix="inv-select"
        formatCreateLabel={(inputValue) => `Add "${inputValue.trim()}"`}
        noOptionsMessage={() => "No options — type to add new"}
      />
      {helperText ? <p className="inv-form-helper">{helperText}</p> : null}
    </div>
  )
}

const InventorySingleSelect = memo(InventorySingleSelectComponent)
export default InventorySingleSelect
