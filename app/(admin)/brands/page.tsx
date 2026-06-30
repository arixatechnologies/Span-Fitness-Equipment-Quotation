import { Save, Trash2 } from "lucide-react";
import { deleteBrandAction, toggleBrandAction } from "@/app/actions/taxonomy";
import { BrandActionForm } from "@/components/brand-action-form";
import { RequiredMark } from "@/components/required-mark";
import { SubmitButton } from "@/components/submit-button";
import { StatusBadge } from "@/components/ui";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function BrandsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: brands, error } = await supabase.from("brands").select("*").order("name");
  if (error) throw new Error(error.message);

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-black text-slate-950">Brands</h1>
        <p className="text-sm text-slate-500">Manage product brands used in product dropdowns.</p>
      </div>

      <BrandActionForm
        className="panel grid gap-3 p-4 md:grid-cols-[1fr_auto_auto]"
        feedbackClassName="md:col-span-3"
        resetOnSuccess
      >
        <label>
          <span className="field-label">
            New Brand
            <RequiredMark />
          </span>
          <input className="field-input" name="name" placeholder="Brand name" required />
        </label>
        <label
          className="flex items-end gap-2 pb-2 text-sm font-semibold text-slate-700"
          title="Active brands appear in product brand dropdowns."
        >
          <input
            type="checkbox"
            name="is_active"
            defaultChecked
            aria-label="Active brand appears in product brand dropdowns"
          />
          Active
        </label>
        <div className="flex items-end">
          <SubmitButton pendingLabel="Adding..." className="btn-primary w-full md:w-auto">
            <Save className="h-4 w-4" />
            Add Brand
          </SubmitButton>
        </div>
      </BrandActionForm>

      <section className="panel overflow-hidden">
        <div className="grid gap-3 p-3 md:hidden">
          {(brands || []).map((brand: any) => (
            <div key={brand.id} className="rounded-md border border-line bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-black text-slate-950">{brand.name}</div>
                  <div className="text-xs text-slate-500">{brand.slug}</div>
                </div>
                <StatusBadge status={brand.is_active ? "active" : "inactive"} />
              </div>

              <BrandActionForm className="mt-3 grid gap-2">
                <input type="hidden" name="id" value={brand.id} />
                <label>
                  <span className="field-label">
                    Brand Name
                    <RequiredMark />
                  </span>
                  <input className="field-input" name="name" defaultValue={brand.name} required />
                </label>
                <label
                  className="flex items-center gap-2 text-sm"
                  title="Active brands appear in product brand dropdowns."
                >
                  <input
                    type="checkbox"
                    name="is_active"
                    defaultChecked={brand.is_active}
                    aria-label={`${brand.name} active brand appears in product brand dropdowns`}
                  />
                  Active
                </label>
                <SubmitButton
                  pendingLabel="Saving..."
                  className="btn-secondary w-full"
                  aria-label={`Save ${brand.name}`}
                  title={`Save ${brand.name}`}
                >
                  <Save className="h-4 w-4" />
                  Save
                </SubmitButton>
              </BrandActionForm>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <form action={toggleBrandAction}>
                  <input type="hidden" name="id" value={brand.id} />
                  <input type="hidden" name="is_active" value={String(!brand.is_active)} />
                  <SubmitButton
                    className="btn-muted w-full px-3"
                    pendingLabel={brand.is_active ? "Deactivating..." : "Activating..."}
                    title={brand.is_active ? `Deactivate ${brand.name}` : `Activate ${brand.name}`}
                    aria-label={brand.is_active ? `Deactivate ${brand.name}` : `Activate ${brand.name}`}
                  >
                    {brand.is_active ? "Deactivate" : "Activate"}
                  </SubmitButton>
                </form>
                <form action={deleteBrandAction}>
                  <input type="hidden" name="id" value={brand.id} />
                  <SubmitButton
                    className="btn-danger w-full px-3"
                    pendingLabel="Deleting..."
                    title={`Delete ${brand.name}`}
                    aria-label={`Delete ${brand.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </SubmitButton>
                </form>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[900px]">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3">
                  Brand
                  <RequiredMark />
                </th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(brands || []).map((brand: any) => (
                <tr key={brand.id}>
                  <td className="table-cell">
                    <BrandActionForm
                      className="flex flex-wrap items-center gap-2"
                      feedbackClassName="basis-full"
                    >
                      <input type="hidden" name="id" value={brand.id} />
                      <input
                        className="field-input max-w-xs"
                        name="name"
                        defaultValue={brand.name}
                        aria-label="Brand name"
                        required
                      />
                      <label
                        className="flex items-center gap-2 text-sm"
                        title="Active brands appear in product brand dropdowns."
                      >
                        <input
                          type="checkbox"
                          name="is_active"
                          defaultChecked={brand.is_active}
                          aria-label={`${brand.name} active brand appears in product brand dropdowns`}
                        />
                        Active
                      </label>
                      <SubmitButton
                        pendingLabel=""
                        className="btn-secondary px-3"
                        aria-label={`Save ${brand.name}`}
                        title={`Save ${brand.name}`}
                      >
                        <Save className="h-4 w-4" />
                      </SubmitButton>
                    </BrandActionForm>
                  </td>
                  <td className="table-cell">{brand.slug}</td>
                  <td className="table-cell">
                    <StatusBadge status={brand.is_active ? "active" : "inactive"} />
                  </td>
                  <td className="table-cell">
                    <div className="flex justify-end gap-2">
                      <form action={toggleBrandAction}>
                        <input type="hidden" name="id" value={brand.id} />
                        <input type="hidden" name="is_active" value={String(!brand.is_active)} />
                        <SubmitButton
                          className="btn-muted px-3"
                          pendingLabel={brand.is_active ? "Deactivating..." : "Activating..."}
                          title={brand.is_active ? `Deactivate ${brand.name}` : `Activate ${brand.name}`}
                          aria-label={brand.is_active ? `Deactivate ${brand.name}` : `Activate ${brand.name}`}
                        >
                          {brand.is_active ? "Deactivate" : "Activate"}
                        </SubmitButton>
                      </form>
                      <form action={deleteBrandAction}>
                        <input type="hidden" name="id" value={brand.id} />
                        <SubmitButton
                          className="btn-danger px-3"
                          pendingLabel="Deleting..."
                          title={`Delete ${brand.name}`}
                          aria-label={`Delete ${brand.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </SubmitButton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
