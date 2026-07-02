// Condition node evaluation — checks contact fields and tags.
import type { ConditionNodeData, Contact } from "../types";

function fieldValue(contact: Contact, field: string): string {
  if (field === "name") return contact.name;
  return contact.fields[field] ?? "";
}

export function evaluateCondition(data: ConditionNodeData, contact: Contact): boolean {
  switch (data.op) {
    case "has_tag":
      return contact.tags.includes(data.value);
    case "not_has_tag":
      return !contact.tags.includes(data.value);
    case "eq":
      return fieldValue(contact, data.field).toLowerCase() === data.value.toLowerCase();
    case "neq":
      return fieldValue(contact, data.field).toLowerCase() !== data.value.toLowerCase();
    case "contains":
      return fieldValue(contact, data.field).toLowerCase().includes(data.value.toLowerCase());
    case "gt":
      return Number(fieldValue(contact, data.field)) > Number(data.value);
    case "lt":
      return Number(fieldValue(contact, data.field)) < Number(data.value);
    default:
      return false;
  }
}
