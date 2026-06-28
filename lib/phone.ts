export const PHONE_VALIDATION_MESSAGE = "Phone number must contain exactly 10 digits.";
export const PHONE_LIST_VALIDATION_MESSAGE =
  "Each phone number must contain exactly 10 digits. Separate multiple numbers with |.";
export const PHONE_INPUT_PATTERN = "[0-9]{10}";
export const PHONE_LIST_INPUT_PATTERN = "[0-9]{10}(\\s*\\|\\s*[0-9]{10})*";

export function isTenDigitPhone(value: string) {
  return /^[0-9]{10}$/.test(value.trim());
}

export function isValidPhoneList(value: string) {
  const phoneNumbers = value.split("|").map((phoneNumber) => phoneNumber.trim());
  return phoneNumbers.length > 0 && phoneNumbers.every(isTenDigitPhone);
}
