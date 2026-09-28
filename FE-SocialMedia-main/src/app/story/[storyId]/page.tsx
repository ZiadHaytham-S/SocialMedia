import { StoryDetailPage } from "@/components/story/story-detail-page";

export default async function Page({ params }: { params: Promise<{ storyId: string }> }) {
  const { storyId } = await params;

  return <StoryDetailPage storyId={storyId} />;
}
