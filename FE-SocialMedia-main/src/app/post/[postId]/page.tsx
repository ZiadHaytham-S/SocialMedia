import { PostDetailPage } from "@/components/post/post-detail-page";

export default async function Page({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;

  return <PostDetailPage postId={postId} />;
}
