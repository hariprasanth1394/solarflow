"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createCustomer, updateCustomer } from "@/services/customerService"
import { uploadDocument } from "@/services/documentService"
import { getAvailableSolarSystems, type AvailableSolarSystem } from "@/services/inventoryService"
import CustomerStepper from "./CustomerStepper"
import CustomerStepCustomerDetails from "./CustomerStepCustomerDetails"
import CustomerStepSolarDetails from "./CustomerStepSolarDetails"
import CustomerStepDocuments from "./CustomerStepDocuments"
import type { CustomerDetailsState, DocumentFileMap, SolarDetailsState } from "./types"

const steps = [
  { id: 1, title: "Customer Details" },
  { id: 2, title: "Solar System Details" },
  { id: 3, title: "Documents" }
]

const primaryButtonClass =
  "rounded-lg bg-gradient-to-r from-purple-600 to-blue-500 px-4 py-2 text-sm font-medium text-white hover:from-purple-700 hover:to-blue-600 disabled:cursor-not-allowed disabled:opacity-60"

const initialCustomer: CustomerDetailsState = {
  fullName: "",
  email: "",
  phone: "",
  streetAddress: "",
  city: "",
  state: "",
  pinCode: ""
}

const initialSolar: SolarDetailsState = {
  systemId: "",
  systemCapacity: "",
  paymentStatus: "",
  estimatedInstallationDate: "",
  additionalNotes: ""
}

const initialDocuments: DocumentFileMap = {
  idProof: null,
  addressProof: null,
  electricityBill: null,
  customerAgreement: null
}

export default function CustomerWizard() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [systemsLoading, setSystemsLoading] = useState(false)
  const [availableSystems, setAvailableSystems] = useState<AvailableSolarSystem[]>([])
  const [draftCustomerId, setDraftCustomerId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  const [customer, setCustomer] = useState<CustomerDetailsState>(initialCustomer)
  const [solar, setSolar] = useState<SolarDetailsState>(initialSolar)
  const [documents, setDocuments] = useState<DocumentFileMap>(initialDocuments)

  const [customerErrors, setCustomerErrors] = useState<Partial<Record<keyof CustomerDetailsState, string>>>({})
  const [solarErrors, setSolarErrors] = useState<Partial<Record<keyof SolarDetailsState, string>>>({})
  const [documentErrors, setDocumentErrors] = useState<Partial<Record<keyof DocumentFileMap, string>>>({})

  useEffect(() => {
    const loadSystems = async () => {
      setSystemsLoading(true)
      setErrorMessage("")
      try {
        const { data } = await getAvailableSolarSystems()
        setAvailableSystems(data ?? [])
      } catch {
        setAvailableSystems([])
        setErrorMessage("Failed to load available systems")
      } finally {
        setSystemsLoading(false)
      }
    }

    void loadSystems()
  }, [])

  const validateStep1 = () => {
    const nextErrors: Partial<Record<keyof CustomerDetailsState, string>> = {}
    if (!customer.fullName.trim()) nextErrors.fullName = "Full name is required"
    if (!customer.email.trim()) nextErrors.email = "Email is required"
    if (!customer.phone.trim()) nextErrors.phone = "Phone number is required"
    if (!customer.streetAddress.trim()) nextErrors.streetAddress = "Street address is required"
    if (!customer.city.trim()) nextErrors.city = "City is required"
    if (!customer.state.trim()) nextErrors.state = "State is required"
    if (!customer.pinCode.trim()) nextErrors.pinCode = "PIN code is required"
    setCustomerErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const validateStep2 = () => {
    const nextErrors: Partial<Record<keyof SolarDetailsState, string>> = {}
    if (!solar.systemId) nextErrors.systemId = "System package is required"
    if (!solar.paymentStatus) nextErrors.paymentStatus = "Payment status is required"
    if (!solar.estimatedInstallationDate) nextErrors.estimatedInstallationDate = "Installation date is required"
    setSolarErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const validateStep3 = () => {
    const nextErrors: Partial<Record<keyof DocumentFileMap, string>> = {}
    if (!documents.idProof) nextErrors.idProof = "ID proof is required"
    if (!documents.addressProof) nextErrors.addressProof = "Address proof is required"
    if (!documents.electricityBill) nextErrors.electricityBill = "Electricity bill is required"
    setDocumentErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const customerPayload = useMemo(() => {
    const notes = [
      solar.additionalNotes.trim() ? `Notes: ${solar.additionalNotes.trim()}` : null,
      solar.paymentStatus ? `Payment Status: ${solar.paymentStatus}` : null,
      solar.estimatedInstallationDate ? `Estimated Installation Date: ${solar.estimatedInstallationDate}` : null
    ]
      .filter(Boolean)
      .join("\n")

    return {
      name: customer.fullName.trim(),
      email: customer.email.trim() || null,
      phone: customer.phone.trim() || null,
      address: `${customer.streetAddress.trim()} | PIN: ${customer.pinCode.trim()}`,
      city: customer.city.trim() || null,
      state: customer.state.trim() || null,
      country: "India",
      status: "Created",
      current_stage: "CREATED",
      system_id: solar.systemId || null,
      notes: notes || null,
      assigned_to: null,
      company: null
    }
  }, [customer, solar])

  const saveDraft = async () => {
    setSaving(true)
    setErrorMessage("")
    setMessage("")
    try {
      if (!customer.fullName.trim()) {
        setErrorMessage("Enter at least full name to save draft")
        return
      }

      if (draftCustomerId) {
        await updateCustomer(draftCustomerId, customerPayload)
      } else {
        const created = await createCustomer(customerPayload)
        setDraftCustomerId(created.id)
      }
      setMessage("Draft saved successfully")
    } catch {
      setErrorMessage("Failed to save draft")
    } finally {
      setSaving(false)
    }
  }

  const moveNext = async () => {
    setErrorMessage("")
    if (step === 1 && !validateStep1()) return
    if (step === 2 && !validateStep2()) return
    setStep((prev) => Math.min(prev + 1, 3))
  }

  const submitFinal = async () => {
    if (!validateStep3()) return

    setSaving(true)
    setErrorMessage("")
    setMessage("")
    try {
      let customerId = draftCustomerId
      if (customerId) {
        await updateCustomer(customerId, customerPayload)
      } else {
        const created = await createCustomer(customerPayload)
        customerId = created.id
      }

      const uploads: Array<{ file: File | null; folder: string }> = [
        { file: documents.idProof, folder: "id-proof" },
        { file: documents.addressProof, folder: "address-proof" },
        { file: documents.electricityBill, folder: "electricity-bill" },
        { file: documents.customerAgreement, folder: "customer-agreement" }
      ]

      for (const item of uploads) {
        if (!item.file) continue
        const { error } = await uploadDocument(item.file, item.folder, customerId)
        if (error) {
          throw error
        }
      }

      router.push("/customers")
      router.refresh()
    } catch {
      setErrorMessage("Failed to complete customer onboarding")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">Add New Customer</h1>
        <p className="mt-1 text-sm text-gray-600">Complete the form to onboard a new solar installation customer.</p>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <CustomerStepper step={step} steps={steps} />
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        {errorMessage ? <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p> : null}
        {message ? <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}

        {step === 1 ? (
          <CustomerStepCustomerDetails
            value={customer}
            errors={customerErrors}
            onChange={(field, nextValue) => setCustomer((prev) => ({ ...prev, [field]: nextValue }))}
          />
        ) : null}

        {step === 2 ? (
          <CustomerStepSolarDetails
            value={solar}
            errors={solarErrors}
            systemsLoading={systemsLoading}
            systems={availableSystems}
            onFieldChange={(field, nextValue) => setSolar((prev) => ({ ...prev, [field]: nextValue }))}
          />
        ) : null}

        {step === 3 ? (
          <CustomerStepDocuments
            value={documents}
            errors={documentErrors}
            onFileChange={(field, file, error) => {
              setDocuments((prev) => ({ ...prev, [field]: file }))
              setDocumentErrors((prev) => {
                if (error) {
                  return { ...prev, [field]: error }
                }
                const next = { ...prev }
                delete next[field]
                return next
              })
            }}
          />
        ) : null}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setStep((prev) => Math.max(prev - 1, 1))}
            disabled={step === 1 || saving}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Previous
          </button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={saveDraft} disabled={saving} className={primaryButtonClass}>
              Save Draft
            </button>
            {step < 3 ? (
              <button type="button" onClick={moveNext} disabled={saving} className={primaryButtonClass}>
                Save & Continue
              </button>
            ) : (
              <button type="button" onClick={submitFinal} disabled={saving} className={primaryButtonClass}>
                {saving ? "Submitting..." : "Submit"}
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
