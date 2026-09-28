import type { ApiComment } from "@/types/social";

export type CommentNode = ApiComment & {
  replies: CommentNode[];
};

export function buildCommentTree(comments: ApiComment[]): CommentNode[] {
  const nodes = new Map<string, CommentNode>();

  for (const comment of comments) {
    nodes.set(comment.id, { ...comment, replies: [] });
  }

  const roots: CommentNode[] = [];

  for (const comment of comments) {
    const node = nodes.get(comment.id);
    if (!node) {
      continue;
    }

    if (comment.parentCommentId && nodes.has(comment.parentCommentId)) {
      nodes.get(comment.parentCommentId)!.replies.push(node);
      continue;
    }

    roots.push(node);
  }

  const sortNewest = (a: CommentNode, b: CommentNode) =>
    new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();

  function sortTree(list: CommentNode[]) {
    list.sort(sortNewest);
    for (const item of list) {
      sortTree(item.replies);
    }
  }

  sortTree(roots);
  return roots;
}

export function flattenCommentTree(nodes: CommentNode[]): CommentNode[] {
  const flat: CommentNode[] = [];

  function walk(list: CommentNode[]) {
    for (const node of list) {
      flat.push(node);
      walk(node.replies);
    }
  }

  walk(nodes);
  return flat;
}

export function countCommentsIncludingReplies(comments: ApiComment[]) {
  return comments.length;
}

export function collectDescendantIds(comments: ApiComment[], rootId: string) {
  const ids = new Set<string>([rootId]);

  function collect(parentId: string) {
    for (const comment of comments) {
      if (comment.parentCommentId === parentId) {
        ids.add(comment.id);
        collect(comment.id);
      }
    }
  }

  collect(rootId);
  return ids;
}

export function removeCommentBranch(comments: ApiComment[], rootId: string) {
  const ids = collectDescendantIds(comments, rootId);
  return comments.filter((comment) => !ids.has(comment.id));
}
