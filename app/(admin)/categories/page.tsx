import { Save } from "lucide-react";
import { saveCategoryAction, toggleCategoryAction } from "@/app/actions/taxonomy";
import { RequiredMark } from "@/components/required-mark";
import { SubmitButton } from "@/components/submit-button";
import { StatusBadge } from "@/components/ui";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function CategoriesPage() {
  const supabase = await createServerSupabaseClient();
  const { data: categories, error } = await supabase.from("categories").select("*").order("name");
  if (error) throw new Error(error.message);

  const parentCategories = (categories || []).filter((category: any) => !category.parent_id);

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-black text-slate-950">Categories</h1>
        <p className="text-sm text-slate-500">Manage categories and sub-categories for products.</p>
      </div>

      <form action={saveCategoryAction} className="panel grid gap-3 p-4 md:grid-cols-[1fr_240px_auto_auto]">
        <label>
          <span className="field-label">
            New Category
            <RequiredMark />
          </span>
          <input className="field-input" name="name" placeholder="Category name" required />
        </label>
        <label>
          <span className="field-label">Parent</span>
          <select className="field-input" name="parent_id">
            <option value="">Top-level category</option>
            {parentCategories.map((category: any) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm font-semibold text-slate-700">
          <input type="checkbox" name="is_active" defaultChecked />
          Active
        </label>
        <div className="flex items-end">
          <SubmitButton pendingLabel="Adding..." className="btn-primary w-full md:w-auto">
            <Save className="h-4 w-4" />
            Add
          </SubmitButton>
        </div>
      </form>

      <section className="panel overflow-hidden">
        <div className="grid gap-3 p-3 md:hidden">
          {(categories || []).map((category: any) => {
            const parent = (categories || []).find((item: any) => item.id === category.parent_id);
            return (
              <div key={category.id} className="rounded-md border border-line bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-black text-slate-950">{category.name}</div>
                    <div className="text-xs text-slate-500">{parent?.name || "Top-level"}</div>
                  </div>
                  <StatusBadge status={category.is_active ? "active" : "inactive"} />
                </div>

                <form action={saveCategoryAction} className="mt-3 grid gap-2">
                  <input type="hidden" name="id" value={category.id} />
                  <label>
                    <span className="field-label">
                      Category Name
                      <RequiredMark />
                    </span>
                    <input
                      className="field-input"
                      name="name"
                      defaultValue={category.name}
                      required
                    />
                  </label>
                  <select className="field-input" name="parent_id" defaultValue={category.parent_id || ""}>
                    <option value="">Top-level</option>
                    {parentCategories
                      .filter((item: any) => item.id !== category.id)
                      .map((item: any) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                  </select>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="is_active" defaultChecked={category.is_active} />
                    Active
                  </label>
                  <SubmitButton
                    pendingLabel="Saving..."
                    className="btn-secondary w-full"
                    aria-label={`Save ${category.name}`}
                    title={`Save ${category.name}`}
                  >
                    <Save className="h-4 w-4" />
                    Save
                  </SubmitButton>
                </form>

                <form action={toggleCategoryAction} className="mt-3">
                  <input type="hidden" name="id" value={category.id} />
                  <input type="hidden" name="is_active" value={String(!category.is_active)} />
                  <SubmitButton
                    pendingLabel={category.is_active ? "Deactivating..." : "Activating..."}
                    className="btn-secondary w-full"
                  >
                    {category.is_active ? "Deactivate" : "Activate"}
                  </SubmitButton>
                </form>
              </div>
            );
          })}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[900px]">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3">
                  Category
                  <RequiredMark />
                </th>
                <th className="px-4 py-3">Parent</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(categories || []).map((category: any) => {
                const parent = (categories || []).find((item: any) => item.id === category.parent_id);
                return (
                  <tr key={category.id}>
                    <td className="table-cell">
                      <form action={saveCategoryAction} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={category.id} />
                        <input
                          className="field-input max-w-xs"
                          name="name"
                          defaultValue={category.name}
                          aria-label="Category name"
                          required
                        />
                        <select className="field-input max-w-56" name="parent_id" defaultValue={category.parent_id || ""}>
                          <option value="">Top-level</option>
                          {parentCategories
                            .filter((item: any) => item.id !== category.id)
                            .map((item: any) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                        </select>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" name="is_active" defaultChecked={category.is_active} />
                          Active
                        </label>
                        <SubmitButton
                          pendingLabel=""
                          className="btn-secondary px-3"
                          aria-label={`Save ${category.name}`}
                          title={`Save ${category.name}`}
                        >
                          <Save className="h-4 w-4" />
                        </SubmitButton>
                      </form>
                    </td>
                    <td className="table-cell">{parent?.name || "Top-level"}</td>
                    <td className="table-cell">
                      <StatusBadge status={category.is_active ? "active" : "inactive"} />
                    </td>
                    <td className="table-cell">
                      <form action={toggleCategoryAction} className="flex justify-end">
                        <input type="hidden" name="id" value={category.id} />
                        <input type="hidden" name="is_active" value={String(!category.is_active)} />
                        <SubmitButton
                          pendingLabel={category.is_active ? "Deactivating..." : "Activating..."}
                          className="btn-secondary"
                        >
                          {category.is_active ? "Deactivate" : "Activate"}
                        </SubmitButton>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
