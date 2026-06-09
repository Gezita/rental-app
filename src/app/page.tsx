import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { isLocalDataOnlyDeploy } from "@/lib/deploy-config";

export default async function HomePage() {
  if (isLocalDataOnlyDeploy()) {
    redirect("/get-started");
  }

  const userId = await getSessionUserId();
  redirect(userId ? "/dashboard" : "/sign-in");
}
