import type { GroupBase, StylesConfig } from "react-select"
import type { InventorySelectOption } from "./InventorySingleSelect"

type SelectOption = { label: string; value: string }

function optionBackground(isSelected: boolean, isFocused: boolean) {
  if (isSelected) return "var(--primary-soft)"
  if (isFocused) return "var(--hover)"
  return "transparent"
}

function baseControlStyles(minHeight: number) {
  return {
    control: (base: Record<string, unknown>, state: { isFocused: boolean }) => ({
      ...base,
      minHeight,
      height: minHeight,
      borderRadius: 12,
      backgroundColor: "var(--sf-card-bg)",
      color: "var(--sf-text)",
      borderColor: state.isFocused ? "var(--sf-primary-start)" : "var(--sf-card-border)",
      boxShadow: state.isFocused ? "var(--sf-focus-glow)" : "none",
      cursor: "pointer",
      "&:hover": {
        borderColor: state.isFocused ? "var(--sf-primary-start)" : "var(--sf-card-border)",
      },
    }),
    valueContainer: (base: Record<string, unknown>) => ({
      ...base,
      height: minHeight,
      padding: "0 12px",
    }),
    indicatorsContainer: (base: Record<string, unknown>) => ({
      ...base,
      height: minHeight,
    }),
    menu: (base: Record<string, unknown>) => ({
      ...base,
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: "var(--sf-card-bg)",
      border: "1px solid var(--sf-card-border)",
      boxShadow:
        "0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 16px 32px -8px rgba(15, 23, 42, 0.14)",
      zIndex: 9999,
    }),
    menuPortal: (base: Record<string, unknown>) => ({ ...base, zIndex: 10001 }),
    menuList: (base: Record<string, unknown>) => ({
      ...base,
      maxHeight: 240,
      padding: 4,
      backgroundColor: "var(--sf-card-bg)",
    }),
    option: (base: Record<string, unknown>, state: { isSelected: boolean; isFocused: boolean }) => ({
      ...base,
      borderRadius: 8,
      backgroundColor: optionBackground(state.isSelected, state.isFocused),
      color: "var(--sf-text)",
      cursor: "pointer",
      fontSize: 14,
    }),
    input: (base: Record<string, unknown>) => ({
      ...base,
      color: "var(--sf-text)",
      margin: 0,
      padding: 0,
    }),
    singleValue: (base: Record<string, unknown>) => ({
      ...base,
      color: "var(--sf-text)",
      fontSize: 14,
      fontWeight: 500,
    }),
    placeholder: (base: Record<string, unknown>) => ({
      ...base,
      color: "var(--sf-muted-text)",
      fontSize: 14,
    }),
    indicatorSeparator: () => ({ display: "none" }),
    dropdownIndicator: (base: Record<string, unknown>) => ({
      ...base,
      color: "var(--sf-muted-text)",
      paddingRight: 10,
      "&:hover": { color: "var(--sf-text)" },
    }),
  }
}

export function createInventorySelectStyles(
  minHeight = 44
): StylesConfig<InventorySelectOption, false> {
  return baseControlStyles(minHeight) as StylesConfig<InventorySelectOption, false>
}

export function createInventoryMultiSelectStyles(
  minHeight = 44
): StylesConfig<SelectOption, true, GroupBase<SelectOption>> {
  const base = baseControlStyles(minHeight)

  return {
    ...(base as StylesConfig<SelectOption, true>),
    multiValue: (baseStyles) => ({
      ...baseStyles,
      borderRadius: 9999,
      backgroundColor: "var(--hover)",
    }),
    multiValueLabel: (baseStyles) => ({
      ...baseStyles,
      color: "var(--sf-text)",
      fontWeight: 500,
    }),
    multiValueRemove: (baseStyles) => ({
      ...baseStyles,
      color: "var(--sf-muted-text)",
      ":hover": {
        backgroundColor: "var(--primary-soft)",
        color: "var(--sf-text)",
      },
    }),
  } as StylesConfig<SelectOption, true, GroupBase<SelectOption>>
}
