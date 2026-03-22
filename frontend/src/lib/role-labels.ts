import type { UserRole } from "./types";

export function roleLabelRu(role: UserRole): string {
  switch (role) {
    case "applicant":
      return "Студент / выпускник";
    case "employer":
      return "Работодатель";
    case "admin":
      return "Администратор";
    default:
      return role;
  }
}
