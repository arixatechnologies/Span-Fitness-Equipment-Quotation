import { CustomerForm } from "@/components/customer-form";

export default function NewCustomerPage() {
  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-black text-slate-950">Add Customer</h1>
        <p className="text-sm text-slate-500">Save customer details for quick quotation creation.</p>
      </div>
      <CustomerForm />
    </div>
  );
}
