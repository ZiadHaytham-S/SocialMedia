"use client";

import type { ApiComment, ApiUser } from "@/types/social";
import { canModerateContent } from "@/lib/auth/roles";
import type { CommentNode } from "@/lib/utils/comment-tree";
import { resolveTagIds } from "@/lib/utils/tag-users";
import { CommentItem } from "./comment-item";

type CommentThreadProps = {
  nodes: CommentNode[];
  contacts: ApiUser[];
  viewer: ApiUser;
  depth?: number;
  editingCommentId?: string;
  updatingCommentId?: string;
  deletingCommentId?: string;
  editedCommentContent: string;
  replyingToId?: string;
  onDelete: (commentId: string) => void;
  onEditStart: (comment: ApiComment) => void;
  onEditCancel: () => void;
  onEditSave: (commentId: string) => void;
  onEditContentChange: (value: string) => void;
  onReply: (comment: ApiComment) => void;
  onUpdate: (comment: ApiComment) => void;
  onError: () => void;
};

export function CommentThread({
  nodes,
  contacts,
  viewer,
  depth = 0,
  editingCommentId,
  updatingCommentId,
  deletingCommentId,
  editedCommentContent,
  replyingToId,
  onDelete,
  onEditStart,
  onEditCancel,
  onEditSave,
  onEditContentChange,
  onReply,
  onUpdate,
  onError,
}: CommentThreadProps) {
  return (
    <div className={depth > 0 ? "ms-11 mt-2 space-y-2 border-s border-border-light ps-3" : "space-y-3"}>
      {nodes.map((node) => (
        <div className="space-y-3" key={node.id}>
          <CommentItem
            canEdit={canModerateContent(viewer, node.author.id)}
            comment={node}
            depth={depth}
            editedContent={editedCommentContent}
            isEditing={editingCommentId === node.id}
            isDeleting={deletingCommentId === node.id}
            isReplyTarget={replyingToId === node.id}
            isUpdating={updatingCommentId === node.id}
            onDelete={() => onDelete(node.id)}
            onEditCancel={onEditCancel}
            onEditContentChange={onEditContentChange}
            onEditSave={() => onEditSave(node.id)}
            onEditStart={() => onEditStart(node)}
            onError={onError}
            onReply={() => onReply(node)}
            onUpdate={onUpdate}
            mentionContacts={contacts}
            taggedUsers={resolveTagIds(node.tagIds, contacts)}
          />
          {node.replies.length > 0 ? (
            <CommentThread
              contacts={contacts}
              depth={depth + 1}
              editedCommentContent={editedCommentContent}
              editingCommentId={editingCommentId}
              deletingCommentId={deletingCommentId}
              nodes={node.replies}
              onDelete={onDelete}
              onEditCancel={onEditCancel}
              onEditContentChange={onEditContentChange}
              onEditSave={onEditSave}
              onEditStart={onEditStart}
              onError={onError}
              onReply={onReply}
              onUpdate={onUpdate}
              replyingToId={replyingToId}
              updatingCommentId={updatingCommentId}
              viewer={viewer}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}
