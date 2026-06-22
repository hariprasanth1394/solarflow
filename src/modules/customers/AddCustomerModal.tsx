"use client"

import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { CheckCircle2, ChevronRight, CreditCard, IndianRupee, Package, Sparkles, User, Zap, X } from "lucide-react"
import ModalBusyOverlay from "../../components/ui/ModalBusyOverlay"
import ModalPortal from "../../components/ui/ModalPortal"
import type { AvailableSolarSystem } from "../../services/inventoryService"

type SalesRep = { id: string; name: string | null; email: string | null }

type CustomerPayload = {
  name: string
  phone: string | null
  email: string | null
  company: string | null
  address: string | null
  system_id: string | null
  assigned_to: string | null
  status: string
  total_cost?: number | null
  paid_amount?: number | null
}

const PRICE_PER_KW = 30000

const emptyForm: CustomerPayload = {
  name: "",
  phone: null,
  email: null,
  company: null,
  address: null,
  system_id: null,
  assigned_to: null,
  status: "Created",
  total_cost: undefined,
  paid_amount: undefined,
}

const steps = [
  { title: "Customer", icon: User },
  { title: "System", icon: Zap },
  { title: "Payment", icon: CreditCard },
]

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "—"
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function KpiTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User
  label: string
  value: string
}) {
  return (
    <div className="sf-installation-kpi flex min-w-0 items-center gap-3 rounded-xl px-4 py-3 transition duration-150">
      <div className="sf-installation-kpi-icon flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="sf-installation-kpi-label text-[10px] font-semibold uppercase leading-snug tracking-[0.06em] sm:text-[11px] sm:tracking-[0.1em]">
          {label}
        </p>
        <p className="sf-installation-kpi-value mt-1 truncate text-lg font-bold sm:text-[22px]">{value}</p>
      </div>
    </div>
  )
}

function CustomerModalForm({
  open,
  initialValue,
  loading,
  systemsLoading,
  salesReps,
  availableSystems,
  onClose,
  onSubmit,
}: {
  open: boolean
  initialValue?: CustomerPayload | null
  loading: boolean
  systemsLoading: boolean
  salesReps: SalesRep[]
  availableSystems: AvailableSolarSystem[]
  onClose: () => void
  onSubmit: (payload: CustomerPayload) => Promise<void>
}) {
  const [form, setForm] = useState<CustomerPayload>(initialValue ?? emptyForm)
  const [currentStep, setCurrentStep] = useState(0)
  const [basePrice, setBasePrice] = useState<number | null>(null)
  const [finalPrice, setFinalPrice] = useState<number | null>(null)
  const [priceOverrideEnabled, setPriceOverrideEnabled] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [step1Attempted, setStep1Attempted] = useState(false)
  const [step2Attempted, setStep2Attempted] = useState(false)
  const [finalStepReady, setFinalStepReady] = useState(false)

  const nameRef = useRef<HTMLInputElement | null>(null)
  const packageRef = useRef<HTMLSelectElement | null>(null)
  const paidRef = useRef<HTMLInputElement | null>(null)
  const wizardPanelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (open) {
      setCurrentStep(0)
      setFinalStepReady(false)
      setTimeout(() => nameRef.current?.focus(), 20)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    if (currentStep === 0) nameRef.current?.focus()
    if (currentStep === 1) packageRef.current?.focus()
    if (currentStep === 2) paidRef.current?.focus()
  }, [currentStep, open])

  useEffect(() => {
    if (currentStep !== steps.length - 1) {
      setFinalStepReady(false)
      return
    }

    const timer = window.setTimeout(() => setFinalStepReady(true), 400)
    return () => window.clearTimeout(timer)
  }, [currentStep])

  const selectedSystem = useMemo(
    () => availableSystems.find((system) => system.system_id === form.system_id) ?? null,
    [availableSystems, form.system_id]
  )

  const capacity = selectedSystem?.capacity_kw ?? null
  const availableQty = selectedSystem?.available_systems ?? null

  useEffect(() => {
    if (capacity !== null) {
      const newBasePrice = Math.round(capacity * PRICE_PER_KW)
      setBasePrice(newBasePrice)
      if (!priceOverrideEnabled) {
        setFinalPrice(newBasePrice)
        setForm((prev) => ({ ...prev, total_cost: newBasePrice }))
      } else {
        setForm((prev) => ({ ...prev, total_cost: finalPrice ?? newBasePrice }))
      }
    } else {
      setBasePrice(null)
      setFinalPrice(null)
      setForm((prev) => ({ ...prev, total_cost: null }))
    }
  }, [capacity, finalPrice, priceOverrideEnabled])

  useEffect(() => {
    if (!toastMessage) return
    const timer = window.setTimeout(() => setToastMessage(null), 3200)
    return () => window.clearTimeout(timer)
  }, [toastMessage])

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialValue ?? emptyForm),
    [form, initialValue]
  )

  const handleClose = () => {
    if (loading) return
    if (isDirty && !window.confirm("Discard changes and close the installation wizard?")) return
    onClose()
  }

  const normalizePhone = (value: string) => {
    // Strip everything except digits
    const digits = value.replace(/[^0-9]/g, "")
    // Limit to 10 digits (Indian mobile number without prefix)
    return digits.slice(0, 10)
  }

  const phoneValue = form.phone ?? ""
  const phoneDigits = phoneValue.replace(/[^0-9]/g, "")
  const phoneError = phoneDigits.length > 0 && phoneDigits.length !== 10
  const nameError = form.name.trim().length > 0 && form.name.trim().length < 3
  const nameEmpty = form.name.trim().length === 0
  const emailError = form.email !== null && form.email !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
  const emailEmpty = !form.email || form.email.trim() === ""
  const addressEmpty = !form.address || form.address.trim() === ""
  const phoneEmpty = phoneDigits.length === 0

  const paid = Number(form.paid_amount ?? 0)
  const total = finalPrice ?? 0
  const remaining = Math.max(total - paid, 0)
  const paymentStatus = total <= 0 ? "Pending" : paid <= 0 ? "Pending" : paid >= total ? "Paid" : "Partial"

  const savings =
    basePrice !== null && finalPrice !== null && finalPrice < basePrice
      ? basePrice - finalPrice
      : 0
  const savingsPercent = basePrice && finalPrice ? Math.round(((basePrice - finalPrice) / basePrice) * 100) : 0

  const stepOneValid =
    Boolean(form.name.trim().length >= 3) &&
    Boolean(phoneDigits.length === 10) &&
    Boolean(form.email && !emailError) &&
    Boolean(form.address && form.address.trim().length > 0) &&
    !phoneError &&
    !nameError

  const stepTwoValid = Boolean(form.system_id && total > 0)
  const stepThreeValid = Boolean(total > 0)

  const canContinue = !loading && (currentStep === 0 ? stepOneValid : currentStep === 1 ? stepTwoValid : false)
  const canSubmit = !loading && currentStep === steps.length - 1 && stepThreeValid && finalStepReady

  const handleFinalPriceChange = (value: string) => {
    const num = value === "" ? null : Number(value)
    setFinalPrice(num)
    setForm((prev) => ({ ...prev, total_cost: num }))
  }

  const handleStepChange = (index: number) => {
    // Only allow navigating backward or to current step
    // Forward navigation requires validation via Continue button
    if (index <= currentStep) {
      setCurrentStep(index)
    }
  }

  const handleContinue = () => {
    if (currentStep === 0) {
      setStep1Attempted(true)
      if (!stepOneValid) return
    }
    if (currentStep === 1) {
      setStep2Attempted(true)
      if (!stepTwoValid) return
    }
    if (currentStep >= steps.length - 1) return
    setCurrentStep((prev) => prev + 1)
  }

  const handleSaveDraft = async () => {
    if (!form.name.trim()) return
    try {
      // Submit with current form state regardless of validation
      const draftPayload: CustomerPayload = {
        ...form,
        phone: phoneDigits.length > 0 ? `+91${phoneDigits}` : null,
        status: "Created",
      }
      await onSubmit(draftPayload)
      setToastMessage("Draft saved successfully.")
    } catch {
      setToastMessage("Unable to save draft. Please try again.")
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (currentStep < steps.length - 1) {
      handleContinue()
      return
    }

    if (!canSubmit) return

    try {
      const submitPayload: CustomerPayload = {
        ...form,
        phone: phoneDigits.length === 10 ? `+91${phoneDigits}` : form.phone,
      }
      await onSubmit(submitPayload)
      setToastMessage("Installation created successfully.")
      window.setTimeout(() => onClose(), 600)
    } catch {
      setToastMessage("Unable to create installation. Please try again.")
    }
  }

  const renderStepContent = () => {
    const inputClass = (hasError: boolean, extra = "") =>
      `sf-wizard-input ${hasError ? "border-rose-400" : ""} ${extra}`.trim()

    if (currentStep === 0) {
      return (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="sf-wizard-label">Customer Name <span className="text-rose-500">*</span></label>
              <input
                ref={nameRef}
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Full name"
                className={inputClass(nameError || (nameEmpty && step1Attempted))}
                aria-invalid={nameError}
                aria-label="Customer Name"
              />
              {nameEmpty && step1Attempted ? (
                <p className="text-[12px] text-rose-600">Customer name is required.</p>
              ) : nameError && step1Attempted ? (
                <p className="text-[12px] text-rose-600">At least 3 characters required.</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <label className="sf-wizard-label">Phone <span className="text-rose-500">*</span></label>
              <div className="flex">
                <span className="sf-wizard-phone-prefix">+91</span>
                <input
                  inputMode="tel"
                  value={phoneDigits}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: normalizePhone(e.target.value) }))}
                  placeholder="9876543210"
                  maxLength={10}
                  className={`${inputClass(phoneError || (phoneEmpty && step1Attempted))} rounded-l-none rounded-r-[10px]`}
                  aria-label="Phone"
                />
              </div>
              {phoneEmpty && step1Attempted ? (
                <p className="text-[12px] text-rose-600">Phone number is required.</p>
              ) : phoneError && step1Attempted ? (
                <p className="text-[12px] text-rose-600">Enter exactly 10 digits.</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <label className="sf-wizard-label">Email <span className="text-rose-500">*</span></label>
              <input
                type="email"
                value={form.email ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value || null }))}
                placeholder="email@company.com"
                className={inputClass(emailError || (emailEmpty && step1Attempted))}
                aria-invalid={emailError}
                aria-label="Email"
              />
              {emailEmpty && step1Attempted ? (
                <p className="text-[12px] text-rose-600">Email is required.</p>
              ) : emailError && step1Attempted ? (
                <p className="text-[12px] text-rose-600">Valid email required.</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <label className="sf-wizard-label">Sales Representative</label>
              <select
                value={form.assigned_to ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, assigned_to: e.target.value || null }))}
                className="sf-wizard-select"
                aria-label="Sales Representative"
              >
                <option value="">Select representative</option>
                {salesReps.map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    {rep.name || rep.email || rep.id}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="sf-wizard-label">Address <span className="text-rose-500">*</span></label>
              <input
                value={form.address ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value || null }))}
                placeholder="Street address"
                className={inputClass(addressEmpty && step1Attempted)}
                aria-label="Address"
              />
              {addressEmpty && step1Attempted ? (
                <p className="text-[12px] text-rose-600">Address is required.</p>
              ) : null}
            </div>
          </div>
        </div>
      )
    }

    if (currentStep === 1) {
      return (
        <div className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <label className="sf-wizard-label">Package</label>
            <select
              ref={packageRef}
              value={form.system_id ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, system_id: e.target.value || null }))}
              className="sf-wizard-select"
              aria-label="Package"
            >
              <option value="">{systemsLoading ? "Loading..." : availableSystems.length === 0 ? "No packages" : "Select package"}</option>
              {availableSystems.map((system) => (
                <option key={system.system_id ?? `${system.system_name}-${system.capacity_kw}`} value={system.system_id ?? ""}>
                  {`${system.system_name ?? "Package"} • ${system.capacity_kw ?? 0} kW`}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <KpiTile icon={Zap} label="Capacity" value={capacity !== null ? `${capacity} kW` : "—"} />
            <KpiTile icon={Sparkles} label="Components" value={availableQty !== null ? `${availableQty} available` : "—"} />
            <KpiTile icon={IndianRupee} label="Standard Price" value={formatCurrency(basePrice)} />
          </div>

          <div className={`sf-wizard-panel px-4 py-4 transition ${priceOverrideEnabled ? "sf-wizard-panel-active" : ""}`}>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[12px] font-semibold text-[var(--sf-text)]">Custom Pricing</p>
                <p className="mt-0.5 text-[11px] text-[var(--sf-muted-text)]">
                  {priceOverrideEnabled ? "Override the standard system price" : "Enable to set a custom price"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPriceOverrideEnabled((prev) => !prev)}
                aria-pressed={priceOverrideEnabled}
                aria-label="Toggle custom pricing"
                className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 ${
                  priceOverrideEnabled ? "bg-violet-500" : "bg-[color-mix(in_srgb,var(--sf-muted-text)_35%,var(--sf-card-border))]"
                }`}
              >
                <motion.span
                  layout
                  className="h-5 w-5 rounded-full bg-[var(--sf-card-bg)] shadow-sm"
                  style={{ marginLeft: priceOverrideEnabled ? "auto" : "2px", marginRight: priceOverrideEnabled ? "2px" : "auto" }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                />
              </button>
            </div>
            <div className="space-y-1.5">
              <label className="sf-wizard-label">Final Price</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={finalPrice ?? ""}
                onChange={(e) => handleFinalPriceChange(e.target.value)}
                disabled={!priceOverrideEnabled}
                className={`sf-wizard-input font-semibold [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
                  priceOverrideEnabled ? "" : "cursor-not-allowed opacity-80"
                }`}
                placeholder={priceOverrideEnabled ? "Enter custom price" : formatCurrency(basePrice)}
                aria-label="Final Price"
                aria-readonly={!priceOverrideEnabled}
              />
            </div>
          </div>

          {savings > 0 ? (
            <div className="sf-wizard-savings flex items-center justify-between px-4 py-2.5 text-[13px] font-medium">
              <span className="truncate">Saved {formatCurrency(savings)}</span>
              <span className="ml-2 flex-shrink-0 rounded-full bg-[var(--sf-card-bg)] px-2 py-0.5 text-[11px] font-semibold">{savingsPercent}%</span>
            </div>
          ) : null}
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-4">
        <div className="space-y-1.5">
          <label className="sf-wizard-label">Advance Received</label>
          <input
            ref={paidRef}
            type="number"
            min={0}
            step="0.01"
            value={form.paid_amount ?? ""}
            onChange={(e) => setForm((prev) => ({ ...prev, paid_amount: e.target.value === "" ? undefined : Number(e.target.value) }))}
            className="sf-wizard-input [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            aria-label="Advance Received"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <KpiTile icon={IndianRupee} label="Total Cost" value={formatCurrency(total)} />
          <KpiTile icon={Package} label="Remaining" value={formatCurrency(remaining)} />
        </div>

        <div className="sf-wizard-status-row">
          <p className="sf-wizard-label">Payment Status</p>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-[12px] font-semibold ${
              paymentStatus === "Paid"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                : paymentStatus === "Partial"
                ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                : "bg-[color-mix(in_srgb,var(--sf-muted-text)_18%,var(--sf-card-bg))] text-[var(--sf-muted-text)]"
            }`}
          >
            {paymentStatus}
          </span>
        </div>
      </div>
    )
  }

  return (
    <ModalPortal isOpen={open} onClose={handleClose} preventCloseWhile={loading}>
      <div className="relative mx-auto w-full sm:w-[min(940px,92vw)]">
        <motion.div
          ref={wizardPanelRef}
          className="sf-installation-wizard sf-modal-panel-interactive relative mx-auto w-full shadow-[0_20px_60px_rgba(0,0,0,0.12)] sm:rounded-2xl"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onAnimationComplete={() => {
            if (wizardPanelRef.current) {
              wizardPanelRef.current.style.transform = "none"
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Create Installation"
          aria-busy={loading}
          onClick={(event) => event.stopPropagation()}
        >
          <form
            className={`relative flex min-h-0 flex-1 flex-col ${loading ? "sf-modal-content-busy" : ""}`}
            onSubmit={handleSubmit}
          >
          <header className="sf-installation-wizard-header shrink-0 px-6 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h1 className="sf-installation-wizard-title">Add Customer</h1>
                <p className="sf-installation-wizard-subtitle">Customer, system, and payment details.</p>
              </div>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  handleClose()
                }}
                disabled={loading}
                className="sf-modal-close sf-modal-close-touch inline-flex flex-shrink-0 items-center justify-center rounded-lg disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          <section className="sf-installation-wizard-stepper">
            {/* Background track line — centered through step icons */}
            <div className="pointer-events-none absolute inset-x-6 top-1/2 -translate-y-[calc(50%+10px)]">
              <div className="mx-auto h-[2px] bg-[var(--sf-card-border)]" style={{ width: "calc(100% - 40px)", marginLeft: "20px" }} />
            </div>

            {/* Animated progress overlay */}
            <div className="pointer-events-none absolute inset-x-6 top-1/2 -translate-y-[calc(50%+10px)]">
              <motion.div
                className="h-[2px] rounded-full"
                style={{
                  background: "linear-gradient(to right, var(--primary-start, #7c3aed), var(--primary-end, #06b6d4))",
                  marginLeft: "20px",
                }}
                animate={{
                  width:
                    currentStep === 0
                      ? "0%"
                      : currentStep === 1
                      ? "calc(50% - 20px)"
                      : "calc(100% - 40px)",
                }}
                transition={{ type: "spring", stiffness: 280, damping: 30 }}
              />
            </div>

            {/* Step circles */}
            <div className="relative z-10 flex w-full justify-between">
              {steps.map((step, index) => {
                const isDone = index < currentStep
                const isActive = index === currentStep
                const isFuture = index > currentStep
                const StepIcon = step.icon
                return (
                  <button
                    key={step.title}
                    type="button"
                    onClick={() => handleStepChange(index)}
                    className={`flex flex-col items-center gap-1.5 transition ${isFuture ? "cursor-not-allowed opacity-60" : ""}`}
                    disabled={loading || isFuture}
                  >
                    <div
                      className={`sf-installation-wizard-step-icon flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-all duration-200 ${
                        isDone || isActive
                          ? "bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-[0_4px_12px_rgba(124,58,237,0.2)]"
                          : "border-2 border-[var(--sf-card-border)] bg-[var(--sf-card-bg)] text-[var(--sf-muted-text)]"
                      }`}
                    >
                      {isDone ? <CheckCircle2 className="h-5 w-5" /> : <StepIcon className="h-4 w-4" />}
                    </div>
                    <p
                      className={`sf-installation-wizard-step-label transition ${
                        isActive ? "text-[var(--sf-text)]" : isDone ? "text-[var(--sf-muted-text)]" : "text-[var(--sf-muted-text)]"
                      }`}
                    >
                      {step.title}
                    </p>
                  </button>
                )
              })}
            </div>
          </section>

          {toastMessage ? (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="sf-installation-wizard-toast mx-6 mb-3 rounded-xl px-4 py-2.5 text-[13px]"
            >
              {toastMessage}
            </motion.div>
          ) : null}

          <main className={`sf-installation-wizard-main sf-scroll-area px-6 pb-4 ${loading ? "sf-modal-body-busy" : ""}`}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="min-h-0"
              >
                {renderStepContent()}
              </motion.div>
            </AnimatePresence>
          </main>

          <footer
            className={`sf-installation-wizard-footer sf-modal-footer-compact shrink-0 ${loading ? "sf-modal-footer-busy" : ""}`}
          >
            <div className="sf-modal-footer-secondary">
              {currentStep > 0 ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    setCurrentStep((prev) => Math.max(prev - 1, 0))
                  }}
                  disabled={loading}
                  className="btn btn-secondary sf-modal-secondary-action"
                >
                  ← Back
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    handleClose()
                  }}
                  disabled={loading}
                  className="btn btn-secondary sf-modal-secondary-action"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  handleSaveDraft()
                }}
                disabled={loading || !form.name.trim()}
                className="btn btn-secondary sf-modal-secondary-action"
              >
                Save Draft
              </button>
            </div>

            <div className="sf-modal-footer-primary">
              {currentStep < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    handleContinue()
                  }}
                  disabled={!canContinue}
                  className="btn btn-primary sf-modal-primary-action h-[42px] w-full rounded-[10px] text-[13px] font-semibold"
                >
                  Continue <ChevronRight className="ml-1 inline-block h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  type="submit"
                  name="create-installation"
                  disabled={!canSubmit || loading}
                  className="btn btn-primary sf-modal-primary-action h-[42px] w-full rounded-[10px] bg-gradient-to-r from-violet-500 to-cyan-500 text-[13px] font-semibold text-white"
                >
                  {finalStepReady ? "Create Installation →" : "Review payment..."}
                </button>
              )}
            </div>
          </footer>
        </form>
        </motion.div>

        {loading ? <ModalBusyOverlay message="Creating..." /> : null}
      </div>
    </ModalPortal>
  )
}

type AddCustomerModalProps = {
  open: boolean
  loading: boolean
  systemsLoading: boolean
  salesReps: SalesRep[]
  availableSystems: AvailableSolarSystem[]
  initialValue?: CustomerPayload | null
  onClose: () => void
  onSubmit: (payload: CustomerPayload) => Promise<void>
}

export default function AddCustomerModal(props: AddCustomerModalProps) {
  return props.open ? (
    <CustomerModalForm
      open={props.open}
      initialValue={props.initialValue}
      loading={props.loading}
      systemsLoading={props.systemsLoading}
      salesReps={props.salesReps}
      availableSystems={props.availableSystems}
      onClose={props.onClose}
      onSubmit={props.onSubmit}
    />
  ) : null
}
