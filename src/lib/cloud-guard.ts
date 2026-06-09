import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { isLocalDataOnlyDeploy } from "./deploy-config";

const BLOCKED_MESSAGE =
  "This hosted page does not store data. Install zigglo on your computer — see /get-started.";

export function cloudDataBlockedResponse() {
  return NextResponse.json({ error: BLOCKED_MESSAGE }, { status: 403 });
}

export function assertCloudDataAllowed() {
  if (isLocalDataOnlyDeploy()) {
    redirect("/get-started?error=cloud-data");
  }
}
