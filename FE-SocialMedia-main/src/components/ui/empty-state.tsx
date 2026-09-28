import { ui } from "@/lib/theme/ui";

type EmptyStateProps = {
  title: string;
  description?: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <section className={`${ui.card} p-8 text-center`}>
      <h3 className={ui.headingLg}>{title}</h3>
      {description ? <p className={`mt-2 text-sm ${ui.textMuted}`}>{description}</p> : null}
    </section>
  );
}
