export type CustomerDetailsState = {
  fullName: string
  email: string
  phone: string
  streetAddress: string
  city: string
  state: string
  pinCode: string
}

export type SolarDetailsState = {
  systemId: string
  systemCapacity: string
  paymentStatus: string
  estimatedInstallationDate: string
  additionalNotes: string
}

export type DocumentFileMap = {
  idProof: File | null
  addressProof: File | null
  electricityBill: File | null
  customerAgreement: File | null
}

export type WizardDraftState = {
  customer: CustomerDetailsState
  solar: SolarDetailsState
}
