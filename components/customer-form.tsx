import Link from "next/link";
import { saveCustomerAction } from "@/app/actions/customers";
import { PhoneInput } from "@/components/phone-input";
import { RequiredMark } from "@/components/required-mark";
import { StateCitySelects } from "@/components/state-city-selects";
import { SubmitButton } from "@/components/submit-button";
import { customerSuffixOptions } from "@/lib/customer-options";
import type { Customer } from "@/lib/types";

export function CustomerForm({ customer }: { customer?: Customer }) {
  return (
    <form action={saveCustomerAction} className="panel p-5">
      <input type="hidden" name="id" value={customer?.id || ""} />
      <div className="grid gap-4 md:grid-cols-2">
        <label>
          <span className="field-label">
            Phone
            <RequiredMark />
          </span>
          <PhoneInput
            name="phone"
            defaultValue={customer?.phone || ""}
            autoComplete="tel"
            required
          />
        </label>
        <label>
          <span className="field-label">Suffix</span>
          <select
            className="field-input"
            name="suffix"
            defaultValue={customer?.suffix || ""}
          >
            <option value="">Select suffix</option>
            {customerSuffixOptions.map((suffix) => (
              <option key={suffix} value={suffix}>
                {suffix}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="field-label">
            Customer Name
            <RequiredMark />
          </span>
          <input
            className="field-input"
            name="customer_name"
            defaultValue={customer?.customer_name || ""}
            required
          />
        </label>
        <label>
          <span className="field-label">Alternate Phone Number</span>
          <PhoneInput
            name="alternate_phone"
            defaultValue={customer?.alternate_phone || ""}
            autoComplete="tel"
          />
        </label>
        <label>
          <span className="field-label">Email</span>
          <input className="field-input" name="email" type="email" defaultValue={customer?.email || ""} />
        </label>
        <StateCitySelects defaultState={customer?.state || ""} defaultCity={customer?.city || ""} />
        <label>
          <span className="field-label">Pin Code</span>
          <input className="field-input" name="pincode" defaultValue={customer?.pincode || ""} />
        </label>
        <label className="md:col-span-2">
          <span className="field-label">Address</span>
          <textarea className="field-input min-h-24" name="address" defaultValue={customer?.address || ""} />
        </label>
        <label>
          <span className="field-label">GST Number</span>
          <input className="field-input" name="gst_number" defaultValue={customer?.gst_number || ""} />
        </label>
        <label className="md:col-span-2">
          <span className="field-label">Notes</span>
          <textarea className="field-input min-h-20" name="notes" defaultValue={customer?.notes || ""} />
        </label>
      </div>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link href="/customers" className="btn-secondary w-full sm:w-auto">
          Cancel
        </Link>
        <SubmitButton pendingLabel="Saving..." className="btn-primary w-full sm:w-auto">
          Save Customer
        </SubmitButton>
      </div>
    </form>
  );
}
