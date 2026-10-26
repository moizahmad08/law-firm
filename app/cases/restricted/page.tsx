import { redirect } from "next/navigation";

export default function RestrictedCasesPage() {
  redirect("/cases?restricted=true");
}
