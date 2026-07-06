import { redirect } from "next/navigation";

export default function LegacyAuthResetPasswordPage() {
  redirect("/reset-password");
}
