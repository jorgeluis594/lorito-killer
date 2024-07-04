import { redirect } from "next/navigation";

export default async function Page({ ...params }: any) {
  return redirect("/dashboard");
}
