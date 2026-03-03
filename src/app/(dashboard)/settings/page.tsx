"use client";

import { useState } from "react";
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";
import Input from "../../../components/ui/Input";

type ToggleProps = {
  enabled: boolean;
  onChange: (value: boolean) => void;
};

function Toggle({ enabled, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
        enabled ? "bg-[#6d28d9]" : "bg-gray-200"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
          enabled ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [compactView, setCompactView] = useState(true);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <Card className="p-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Profile Settings</h2>
          <p className="text-sm text-gray-500">Manage your profile details and account information.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input placeholder="Full Name" defaultValue="Admin User" />
          <Input type="email" placeholder="Email" defaultValue="admin@solarflow.com" />
          <Input placeholder="Phone" defaultValue="+91 98765 43210" />
          <Input placeholder="Role" defaultValue="Operations Manager" />
        </div>
        <div>
          <Button variant="primary">Save Changes</Button>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
          <p className="text-sm text-gray-500">Control when and how SolarFlow notifies you.</p>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Email alerts for stage updates</span>
            <Toggle enabled={emailAlerts} onChange={setEmailAlerts} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Push notifications for urgent tasks</span>
            <Toggle enabled={pushAlerts} onChange={setPushAlerts} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Weekly activity summary</span>
            <Toggle enabled={weeklySummary} onChange={setWeeklySummary} />
          </div>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Security</h2>
          <p className="text-sm text-gray-500">Update your password and secure account access.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Input type="password" placeholder="Current Password" />
          <Input type="password" placeholder="New Password" />
          <Input type="password" placeholder="Confirm Password" />
        </div>
        <div>
          <Button variant="secondary">Update Password</Button>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Preferences</h2>
          <p className="text-sm text-gray-500">Customize your dashboard experience.</p>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Enable dark mode</span>
            <Toggle enabled={darkMode} onChange={setDarkMode} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Use compact table view</span>
            <Toggle enabled={compactView} onChange={setCompactView} />
          </div>
        </div>
      </Card>
    </div>
  );
}