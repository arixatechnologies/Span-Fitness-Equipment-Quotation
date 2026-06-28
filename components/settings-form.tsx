import { GST_MODES } from "@/lib/constants";
import { saveCompanySettingsAction } from "@/app/actions/settings";
import { RequiredMark } from "@/components/required-mark";
import { SubmitButton } from "@/components/submit-button";
import type { CompanySettings } from "@/lib/types";

export function SettingsForm({
  settings,
  returnTo,
  section
}: {
  settings: CompanySettings;
  returnTo: string;
  section: "company" | "pdf" | "terms";
}) {
  return (
    <form action={saveCompanySettingsAction} className="panel p-5">
      <input type="hidden" name="return_to" value={returnTo} />
      <input type="hidden" name="logo_url" value={settings.logo_url || ""} />
      <input type="hidden" name="signature_url" value={settings.signature_url || ""} />

      {section === "company" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="field-label">
              Company Name
              <RequiredMark />
            </span>
            <input
              className="field-input"
              name="company_name"
              defaultValue={settings.company_name}
              required
            />
          </label>
          <label>
            <span className="field-label">GST Number</span>
            <input className="field-input" name="gst_number" defaultValue={settings.gst_number} />
          </label>
          <label>
            <span className="field-label">Phone Numbers</span>
            <input
              className="field-input"
              name="phone_numbers"
              defaultValue={settings.phone_numbers}
            />
          </label>
          <label>
            <span className="field-label">Email</span>
            <input className="field-input" name="email" type="email" defaultValue={settings.email} />
          </label>
          <label className="md:col-span-2">
            <span className="field-label">Branch Office Address</span>
            <textarea className="field-input min-h-24" name="address" defaultValue={settings.address} />
          </label>
          <label>
            <span className="field-label">Bank Name</span>
            <input className="field-input" name="bank_name" defaultValue={settings.bank_name} />
          </label>
          <label>
            <span className="field-label">Account Number</span>
            <input
              className="field-input"
              name="bank_account_no"
              defaultValue={settings.bank_account_no}
            />
          </label>
          <label>
            <span className="field-label">Branch</span>
            <input className="field-input" name="bank_branch" defaultValue={settings.bank_branch} />
          </label>
          <label>
            <span className="field-label">IFSC Code</span>
            <input className="field-input" name="bank_ifsc" defaultValue={settings.bank_ifsc} />
          </label>
        </div>
      ) : null}

      {section === "pdf" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <HiddenCompanyFields settings={settings} />
          <label>
            <span className="field-label">Logo</span>
            <input
              className="field-input file:mr-3 file:rounded-md file:border-0 file:bg-rose file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-ink"
              name="logo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
            />
          </label>
          <label>
            <span className="field-label">Signature Image</span>
            <input
              className="field-input file:mr-3 file:rounded-md file:border-0 file:bg-rose file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-ink"
              name="signature"
              type="file"
              accept="image/png,image/jpeg,image/webp"
            />
          </label>
          <label>
            <span className="field-label">Theme Color</span>
            <input
              className="field-input h-11"
              name="pdf_theme_color"
              type="color"
              defaultValue={settings.pdf_theme_color}
            />
          </label>
          <label>
            <span className="field-label">
              Default GST %
              <RequiredMark />
            </span>
            <input
              className="field-input"
              name="default_gst_percent"
              type="number"
              min="0"
              step="0.01"
              defaultValue={settings.default_gst_percent}
              required
            />
          </label>
          <label>
            <span className="field-label">
              Default GST Mode
              <RequiredMark />
            </span>
            <select
              className="field-input"
              name="default_gst_mode"
              defaultValue={settings.default_gst_mode}
              required
            >
              {GST_MODES.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="field-label">
              Default Validity Days
              <RequiredMark />
            </span>
            <input
              className="field-input"
              name="default_validity_days"
              type="number"
              min="1"
              defaultValue={settings.default_validity_days}
              required
            />
          </label>
          <label>
            <span className="field-label">Authorized Person</span>
            <input
              className="field-input"
              name="authorized_person_name"
              defaultValue={settings.authorized_person_name}
            />
          </label>
          <label>
            <span className="field-label">Designation</span>
            <input
              className="field-input"
              name="authorized_person_designation"
              defaultValue={settings.authorized_person_designation}
            />
          </label>
          <label>
            <span className="field-label">Footer Heading</span>
            <input
              className="field-input"
              name="brand_footer_heading"
              defaultValue={settings.brand_footer_heading}
            />
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              name="brand_footer_enabled"
              defaultChecked={settings.brand_footer_enabled}
            />
            Show brand footer
          </label>
        </div>
      ) : null}

      {section === "terms" ? (
        <div className="grid gap-4">
          <HiddenCompanyFields settings={settings} />
          <HiddenPdfFields settings={settings} />
          <label>
            <span className="field-label">Default Terms</span>
            <textarea
              className="field-input min-h-24"
              name="default_terms"
              defaultValue={settings.default_terms}
            />
          </label>
          <label>
            <span className="field-label">Warranty</span>
            <textarea
              className="field-input min-h-28"
              name="default_warranty"
              defaultValue={settings.default_warranty}
            />
          </label>
          <label>
            <span className="field-label">Delivery</span>
            <textarea
              className="field-input min-h-20"
              name="default_delivery"
              defaultValue={settings.default_delivery}
            />
          </label>
          <label>
            <span className="field-label">Transportation</span>
            <textarea
              className="field-input min-h-20"
              name="default_transportation"
              defaultValue={settings.default_transportation}
            />
          </label>
          <label>
            <span className="field-label">Payment Terms</span>
            <textarea
              className="field-input min-h-20"
              name="default_payment_terms"
              defaultValue={settings.default_payment_terms}
            />
          </label>
          <label>
            <span className="field-label">After Sales Support</span>
            <textarea
              className="field-input min-h-20"
              name="default_after_sales_support"
              defaultValue={settings.default_after_sales_support}
            />
          </label>
        </div>
      ) : null}

      {section === "company" ? (
        <>
          <HiddenPdfFields settings={settings} />
          <HiddenTermFields settings={settings} />
        </>
      ) : null}
      {section === "pdf" ? <HiddenTermFields settings={settings} /> : null}

      <div className="mt-6 flex justify-end">
        <SubmitButton pendingLabel="Saving..." className="btn-primary w-full sm:w-auto">
          Save Settings
        </SubmitButton>
      </div>
    </form>
  );
}

function HiddenCompanyFields({ settings }: { settings: CompanySettings }) {
  return (
    <>
      <input type="hidden" name="company_name" value={settings.company_name} />
      <input type="hidden" name="gst_number" value={settings.gst_number} />
      <input type="hidden" name="phone_numbers" value={settings.phone_numbers} />
      <input type="hidden" name="email" value={settings.email} />
      <input type="hidden" name="address" value={settings.address} />
      <input type="hidden" name="bank_name" value={settings.bank_name} />
      <input type="hidden" name="bank_account_no" value={settings.bank_account_no} />
      <input type="hidden" name="bank_branch" value={settings.bank_branch} />
      <input type="hidden" name="bank_ifsc" value={settings.bank_ifsc} />
    </>
  );
}

function HiddenPdfFields({ settings }: { settings: CompanySettings }) {
  return (
    <>
      <input type="hidden" name="pdf_theme_color" value={settings.pdf_theme_color} />
      <input type="hidden" name="default_gst_percent" value={settings.default_gst_percent} />
      <input type="hidden" name="default_gst_mode" value={settings.default_gst_mode} />
      <input type="hidden" name="default_validity_days" value={settings.default_validity_days} />
      <input type="hidden" name="authorized_person_name" value={settings.authorized_person_name} />
      <input
        type="hidden"
        name="authorized_person_designation"
        value={settings.authorized_person_designation}
      />
      <input type="hidden" name="brand_footer_heading" value={settings.brand_footer_heading} />
      {settings.brand_footer_enabled ? (
        <input type="hidden" name="brand_footer_enabled" value="on" />
      ) : null}
    </>
  );
}

function HiddenTermFields({ settings }: { settings: CompanySettings }) {
  return (
    <>
      <input type="hidden" name="default_terms" value={settings.default_terms} />
      <input type="hidden" name="default_warranty" value={settings.default_warranty} />
      <input type="hidden" name="default_delivery" value={settings.default_delivery} />
      <input type="hidden" name="default_transportation" value={settings.default_transportation} />
      <input type="hidden" name="default_payment_terms" value={settings.default_payment_terms} />
      <input
        type="hidden"
        name="default_after_sales_support"
        value={settings.default_after_sales_support}
      />
    </>
  );
}
