"use client";

import { useState } from "react";
import { Search } from "lucide-react";

type SearchFieldProps = {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  label: string;
  showSearchIcon?: boolean;
};

export function SearchField({
  name,
  defaultValue = "",
  placeholder,
  label,
  showSearchIcon = false
}: SearchFieldProps) {
  const [value, setValue] = useState(defaultValue);

  function onSearchChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextValue = event.target.value;
    const form = event.currentTarget.form;

    setValue(nextValue);

    if (!nextValue.trim() && value.trim()) {
      window.setTimeout(() => form?.requestSubmit(), 0);
    }
  }

  return (
    <label className={showSearchIcon ? "relative" : undefined}>
      <span className="field-label">{label}</span>
      {showSearchIcon ? (
        <Search className="pointer-events-none absolute left-3 top-8 h-4 w-4 text-slate-400" />
      ) : null}
      <input
        className={`field-input ${showSearchIcon ? "!pl-10" : ""}`}
        name={name}
        value={value}
        onChange={onSearchChange}
        placeholder={placeholder}
      />
    </label>
  );
}
