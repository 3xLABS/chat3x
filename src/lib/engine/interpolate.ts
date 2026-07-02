// Template interpolation for message text — ManyChat-style variables:
//   {{name}}         → contact name
//   {{field:email}}  → custom field value
import type { Contact } from "../types";

const VARIABLE_PATTERN = /\{\{\s*(name|field:([\w-]+))\s*\}\}/g;

export function interpolate(template: string, contact: Contact): string {
  return template.replace(VARIABLE_PATTERN, (_match, token: string, fieldKey?: string) => {
    if (token === "name") return contact.name;
    if (fieldKey) return contact.fields[fieldKey] ?? "";
    return "";
  });
}
