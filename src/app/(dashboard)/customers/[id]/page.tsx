
import Button from "../../../../components/ui/Button";
export default function CustomerDetailPage() {
  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">
          Ramesh Kumar
        </h1>
        <p className="text-gray-600 mt-1">
          9876543210 | 5kW System
        </p>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-between text-sm">
          <span>Created</span>
          <span>Submitted</span>
          <span>Approved</span>
          <span>Installed</span>
          <span>Closed</span>
        </div>

        <div className="mt-3 h-2 bg-gray-200 rounded-full">
          <div className="h-2 bg-[#6d28d9] w-2/5 rounded-full" />
        </div>
      </div>

      {/* Stage Card */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="font-semibold mb-4">
          Government Submission
        </h2>

        <div className="space-y-4">
          <input
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Application Reference Number"
          />

          <button className="bg-[#6d28d9] text-white px-4 py-2 rounded-lg hover:opacity-90 transition">
            Save
          </button>
        </div>
      </div>

    </div>
  );
}