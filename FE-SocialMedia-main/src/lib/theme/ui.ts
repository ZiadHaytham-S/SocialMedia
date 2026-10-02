/**
 * Semantic UI — Facebook-like feed layout.
 */
export const ui = {
  page: "min-h-screen bg-background text-foreground",

  /* Cards */
  card: "overflow-hidden rounded-lg bg-surface shadow-[var(--shadow-card)]",
  feedCard: "overflow-hidden rounded-lg bg-surface shadow-[var(--shadow-card)]",
  /** Stories strip — no overflow clip (rings/avatars must not be cut). */
  feedCardStories: "rounded-lg bg-surface shadow-[var(--shadow-card)]",
  cardPadded: "rounded-lg bg-surface p-4 shadow-[var(--shadow-card)]",
  cardPaddedSm: "rounded-lg bg-surface p-3 shadow-[var(--shadow-card)]",

  /** Home feed column spacing (Facebook-like rhythm). */
  feedMain: "grid grid-cols-[minmax(0,1fr)] gap-y-4 px-2 pb-10 pt-16 sm:px-4 lg:grid-cols-[240px_minmax(0,680px)] xl:grid-cols-[240px_minmax(0,680px)_280px] xl:justify-center",
  feedColumn: "mx-auto flex min-w-0 w-full max-w-[680px] flex-col gap-3 sm:gap-4",
  storiesTrack:
    "flex items-stretch gap-3 overflow-x-auto overflow-y-visible overscroll-x-contain px-4 py-4 scrollbar-hide",
  storyTile:
    "relative shrink-0 snap-start overflow-hidden rounded-2xl shadow-sm transition hover:brightness-[1.02]",
  storyTileRing: "ring-[3px] ring-fb ring-offset-2 ring-offset-surface",

  /* Typography */
  textPrimary: "text-t-primary",
  textSecondary: "text-t-secondary",
  textMuted: "text-t-muted",
  textFaint: "text-t-faint",
  textLink: "font-semibold text-t-primary hover:underline",

  headingXl: "text-2xl font-bold text-t-primary",
  headingLg: "text-[17px] font-bold text-t-primary leading-snug",
  headingMd: "text-[15px] font-semibold text-t-secondary",
  headingSm: "text-[13px] font-semibold text-t-primary",

  body: "text-[15px] leading-5 text-t-primary",
  bodySm: "text-[13px] leading-[1.38] text-t-primary",
  caption: "text-[13px] text-t-muted",
  meta: "text-[12px] text-t-muted",

  link: "font-semibold text-fb hover:underline",

  /* Inputs */
  inputField:
    "w-full rounded-lg border border-border-light bg-surface px-3 py-2 text-[15px] text-t-primary outline-none transition placeholder:text-t-muted focus:border-fb focus:ring-1 focus:ring-fb/30",
  authInput:
    "h-12 w-full rounded-lg border border-border-light bg-surface px-4 text-[15px] text-t-primary outline-none transition placeholder:text-t-muted focus:border-fb focus:ring-1 focus:ring-fb/30",
  authInputCompact:
    "h-11 w-full rounded-lg border border-border-light bg-surface-input px-3 text-[15px] text-t-primary outline-none transition placeholder:text-t-muted focus:border-fb focus:bg-surface focus:ring-1 focus:ring-fb/30",
  /** Email, password, phone — always LTR regardless of page locale */
  inputLtr: "dir-ltr text-start",
  infoBox: "rounded-lg bg-surface-muted px-3 py-2 text-[13px] font-medium text-t-secondary",
  inputFieldSm:
    "h-9 w-full rounded-lg border border-border-light bg-surface px-3 text-[13px] text-t-primary outline-none transition focus:border-fb focus:ring-1 focus:ring-fb/30",
  composerPill:
    "flex min-h-10 min-w-0 flex-1 items-center rounded-full bg-surface-input px-3 py-2 text-start text-[14px] sm:px-4 sm:text-[17px] font-normal text-t-muted transition hover:bg-surface-hover cursor-text",
  inputSoft:
    "min-w-0 flex-1 rounded-full bg-surface-input px-4 py-2 text-[15px] text-t-primary outline-none transition placeholder:text-t-muted focus:bg-surface focus:ring-1 focus:ring-fb/25",
  textarea:
    "min-h-24 w-full rounded-lg border border-border-light bg-surface p-3 text-[15px] text-t-primary outline-none transition focus:border-fb focus:ring-1 focus:ring-fb/30",

  divider: "border-border-light",
  dividerSubtle: "border-border-light",

  menuDropdown:
    "z-20 min-w-[200px] rounded-lg bg-surface py-1.5 text-[15px] font-medium text-t-primary shadow-[var(--shadow-elevated)] ring-1 ring-border-light",
  menuItem: "block w-full px-3 py-2 text-start transition hover:bg-surface-hover",
  menuItemDanger:
    "block w-full px-3 py-2 text-start font-semibold text-danger transition hover:bg-danger-soft",

  /* Comments — FB gray bubble */
  commentBubble: "inline-block max-w-full rounded-[18px] bg-surface-muted px-3 py-2",
  commentActions: "mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 ps-1 text-[12px] font-semibold text-t-muted",

  /* Buttons */
  btnPrimary: "rounded-lg bg-fb px-4 py-2 text-[15px] font-semibold text-white transition hover:bg-fb-hover disabled:opacity-50",
  btnGhost: "rounded-lg px-3 py-2 text-[15px] font-semibold text-t-secondary transition hover:bg-surface-hover",
  btnSecondary:
    "rounded-lg bg-surface-muted px-4 py-2 text-[15px] font-semibold text-t-primary transition hover:bg-surface-hover",
  composerAction:
    "flex min-w-0 flex-1 flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 rounded-lg py-2 text-[12px] sm:text-[15px] font-semibold text-t-secondary transition hover:bg-surface-hover",

  alertError: "rounded-lg bg-danger-soft px-3 py-2 text-[13px] font-medium text-danger",
  alertSuccess: "rounded-lg bg-success-soft px-3 py-2 text-[13px] font-medium text-success",

  navHeader: "fixed inset-x-0 top-0 z-30 border-b border-border-light bg-surface shadow-[var(--shadow-card)]",

  skeletonCard: "rounded-lg bg-surface p-4 shadow-[var(--shadow-card)]",

  iconButton:
    "flex h-9 w-9 items-center justify-center rounded-full bg-surface-muted text-t-secondary transition hover:bg-surface-hover",

  sidebarItem:
    "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-start text-[15px] font-semibold text-t-primary transition hover:bg-surface-hover",
  sidebarHeading: "mb-2 px-2 text-[17px] font-bold text-t-muted",

  /* Post action bar — four actions on one row */
  postStats: "flex flex-wrap items-center justify-between gap-2 border-b border-border-light px-3 sm:px-4 py-2.5",
  postActions: "relative z-[1] flex overflow-visible border-b border-border-light px-1 py-0.5",
  postActionBtn:
    "mx-0.5 flex min-h-11 min-w-0 flex-1 flex-col sm:flex-row items-center justify-center gap-1 rounded-lg px-0.5 py-1 text-[11px] font-semibold text-t-secondary transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40 sm:text-[15px] sm:gap-2",

  commentsSection: "bg-surface px-4 py-3.5",
  commentComposer: "flex items-center gap-2 border-t border-border-light bg-surface px-4 py-3.5",

  /** White canvas for post/comment images (transparent PNGs). */
  mediaCanvas: "flex w-full items-center justify-center bg-white",
  mediaImage: "max-h-[min(560px,70vh)] w-full object-contain",
  mediaImageSm: "max-h-60 w-full object-contain",

  avatarSm: "h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-border-light",
  avatarMd: "h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-border-light",
  avatarLg: "h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-border-light",

  /** Profile page */
  profileCover: "relative h-[200px] bg-surface-muted sm:h-[280px] md:h-[360px]",
  profileAvatar:
    "h-[120px] w-[120px] rounded-full border-4 border-surface bg-surface object-cover shadow-sm sm:h-[148px] sm:w-[148px] md:h-[168px] md:w-[168px]",
  profileEditBtn:
    "inline-flex items-center justify-center gap-2 rounded-lg bg-surface px-3 py-2 text-[15px] font-semibold text-t-primary shadow-[var(--shadow-card)] ring-1 ring-border-light transition hover:bg-surface-hover",

  /** Friend actions — Facebook-style (no profileEditBtn mix; avoids text/background conflicts) */
  friendBtnPrimary:
    "inline-flex h-10 min-w-[148px] shrink-0 items-center justify-center gap-2 rounded-lg bg-fb px-5 text-[15px] font-bold leading-none text-white shadow-sm transition hover:bg-fb-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fb disabled:cursor-not-allowed disabled:opacity-60",
  friendBtnSecondary:
    "inline-flex h-10 min-w-[128px] shrink-0 items-center justify-center gap-2 rounded-lg bg-surface-muted px-5 text-[15px] font-bold leading-none text-t-primary ring-1 ring-border-light transition hover:bg-surface-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border disabled:cursor-not-allowed disabled:opacity-60",
  friendBtnDanger:
    "inline-flex h-10 min-w-[108px] shrink-0 items-center justify-center gap-2 rounded-lg bg-surface-muted px-4 text-[15px] font-bold leading-none text-red-600 ring-1 ring-border-light transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-500/15",
  friendBtnCompactPrimary:
    "inline-flex h-9 min-w-[120px] shrink-0 items-center justify-center gap-1.5 rounded-lg bg-fb px-4 text-[14px] font-bold leading-none text-white shadow-sm transition hover:bg-fb-hover disabled:cursor-not-allowed disabled:opacity-60",
  friendBtnCompactSecondary:
    "inline-flex h-9 min-w-[100px] shrink-0 items-center justify-center gap-1.5 rounded-lg bg-surface-muted px-4 text-[14px] font-bold leading-none text-t-primary ring-1 ring-border-light transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60",
  friendBadge:
    "inline-flex h-9 items-center rounded-lg bg-emerald-600/15 px-4 text-[14px] font-bold text-emerald-700 dark:text-emerald-400",
  friendStatusPill:
    "inline-flex h-9 items-center rounded-lg bg-surface-muted px-4 text-[14px] font-semibold text-t-secondary ring-1 ring-border-light",

  profileIconBtn:
    "flex h-9 w-9 items-center justify-center rounded-full bg-surface text-t-primary shadow-[var(--shadow-card)] ring-1 ring-border-light transition hover:bg-surface-hover",
} as const;

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
