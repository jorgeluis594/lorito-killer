import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authConfig } from "@/lib/auth-config";

export default async function Page() {
  const session = await getServerSession(authConfig);

  if (session) {
    return redirect("/dashboard");
  } else {
    return redirect("/login");
  }
}
