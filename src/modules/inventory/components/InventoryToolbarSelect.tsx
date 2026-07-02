"use client"

import { memo, useMemo } from "react"
import Select from "react-select"
import { createInventorySelectStyles } from "./inventorySelectStyles"
import type { InventorySelectOption } from "./InventorySingleSelect"

type InventoryToolbarSelectProps = {
  ariaLabel: string
  placeholder: string
  value: string
  options: InventorySelectOption[]
  onChange: (value: string) => void
  inputId?: string
  isSearchable?: boolean
  className?: string
}

function InventoryToolbarSelectComponent({
  ariaLabel,
  placeholder,
  value,
  options,
  onChange,
  inputId,
  isSearchable,
  className = "",
}: InventoryToolbarSelectProps) {
  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value]
  )

  const styles = useMemo(() => createInventorySelectStyles(44), [])

  return (
    <div className={`inv-toolbar-select ${className}`.trim()}>
      <Select
        inputId={inputId}
        aria-label={ariaLabel}
        isSearchable={isSearchable ?? options.length > 6}
        isClearable={false}
        menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
        menuPosition="fixed"
        menuPlacement="auto"
        options={options}
        value={selectedOption}
        onChange={(option) => onChange(option?.value ?? "")}
        placeholder={placeholder}
        styles={styles}
        classNamePrefix="inv-toolbar-select"
        noOptionsMessage={() => "No matching options"}
      />
    </div>
  )
}

const InventoryToolbarSelect = memo(InventoryToolbarSelectComponent)
export default InventoryToolbarSelect
