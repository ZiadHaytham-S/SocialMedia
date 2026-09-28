import { ProfilePage } from "@/components/profile/profile-page";

export default async function Page({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;

  return <ProfilePage userId={userId} />;
}
