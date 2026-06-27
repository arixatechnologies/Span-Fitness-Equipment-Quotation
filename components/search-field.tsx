"use client";

import { useState } from "react";

type SearchFieldProps = {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  label: string;
};

export function SearchField({ name, defaultValue = "", placeholder, label }: SearchFieldProps) {
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
    <label>
      <span className="field-label">{label}</span>
      <input
        className="field-input"
        name={name}
        value={value}
        onChange={onSearchChange}
        placeholder={placeholder}
      />
    </label>
  );
}
