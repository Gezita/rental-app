import { redirect } from "next/navigation";

export default async function UtilityConnectRedirectPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = await params;
  redirect(`/properties/${propertyId}/utility-bills/import`);
}
