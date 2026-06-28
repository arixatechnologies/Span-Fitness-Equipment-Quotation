"use client";

import { useId, useState, type InputHTMLAttributes } from "react";
import {
  isTenDigitPhone,
  isValidPhoneList,
  PHONE_INPUT_PATTERN,
  PHONE_LIST_INPUT_PATTERN,
  PHONE_LIST_VALIDATION_MESSAGE,
  PHONE_VALIDATION_MESSAGE
} from "@/lib/phone";

type PhoneInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "defaultValue" | "inputMode" | "pattern" | "type" | "value"
> & {
  defaultValue?: string | null;
  multipleNumbers?: boolean;
};

export function PhoneInput({
  className = "field-input",
  defaultValue = "",
  id,
  multipleNumbers = false,
  onBlur,
  onChange,
  onInvalid,
  required,
  ...props
}: PhoneInputProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = `${inputId}-error`;
  const [value, setValue] = useState(String(defaultValue || ""));
  const [touched, setTouched] = useState(false);
  const valid = !value || (multipleNumbers ? isValidPhoneList(value) : isTenDigitPhone(value));
  const errorMessage = multipleNumbers
    ? PHONE_LIST_VALIDATION_MESSAGE
    : PHONE_VALIDATION_MESSAGE;
  const showError =
    !valid && (touched || (!multipleNumbers && value.trim().length >= 10));

  return (
    <>
      <input
        {...props}
        id={inputId}
        className={`${className} ${showError ? "border-red-500 focus:border-red-500 focus:ring-red-200" : ""}`}
        name={props.name}
        type="tel"
        inputMode={multipleNumbers ? "tel" : "numeric"}
        pattern={multipleNumbers ? PHONE_LIST_INPUT_PATTERN : PHONE_INPUT_PATTERN}
        title={errorMessage}
        value={value}
        required={required}
        aria-invalid={showError}
        aria-describedby={showError ? errorId : props["aria-describedby"]}
        onChange={(event) => {
          const nextValue = event.currentTarget.value;
          const nextValid =
            !nextValue ||
            (multipleNumbers ? isValidPhoneList(nextValue) : isTenDigitPhone(nextValue));
          event.currentTarget.setCustomValidity(nextValid ? "" : errorMessage);
          setValue(nextValue);
          onChange?.(event);
        }}
        onBlur={(event) => {
          setTouched(true);
          onBlur?.(event);
        }}
        onInvalid={(event) => {
          setTouched(true);
          onInvalid?.(event);
        }}
      />
      {showError ? (
        <span id={errorId} className="mt-1 block text-xs font-semibold text-red-600" role="alert">
          {errorMessage}
        </span>
      ) : null}
    </>
  );
}
