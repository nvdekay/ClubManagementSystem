/** Merge section feedback into the existing decision reason without truncating either text. */
export function appendProposalReason(reason: string, title: string, content: string): string | null {
  const heading = title.trim();
  const comment = content.trim();
  if (!heading || heading.length > 300 || !comment || comment.length > 2000) return null;
  const result = [reason.trim(), `[${heading}]\n${comment}`].filter(Boolean).join("\n\n");
  return result.length <= 5000 ? result : null;
}

export interface TrackedProposalComment {
  id: string; sectionId: string; sectionTitle: string; authorName: string;
  content: string; createdAt: string; start: number; end: number;
}

/** Recover existing section blocks from older reason-only drafts without changing their text. */
export function recoverProposalComments(reason: string, authorName: string): TrackedProposalComment[] {
  return Array.from(reason.matchAll(/^\[([^\]\n]{1,300})\]\n([\s\S]*?)(?=\n\n\[[^\]\n]{1,300}\]\n|$)/gm)).map((match) => ({
    id: `recovered-${match.index}`, sectionId: "", sectionTitle: match[1]!, authorName,
    content: match[2]!, createdAt: "", start: match.index!, end: match.index! + match[0].length,
  })).filter((comment) => Boolean(comment.content.trim()));
}

/** Shift unaffected anchors after manual edits; discard anchors whose text was edited directly. */
export function reconcileProposalComments(previous: string, next: string, comments: TrackedProposalComment[]): TrackedProposalComment[] {
  let prefix = 0;
  while (prefix < previous.length && prefix < next.length && previous[prefix] === next[prefix]) prefix += 1;
  let suffix = 0;
  while (suffix < previous.length - prefix && suffix < next.length - prefix
    && previous[previous.length - 1 - suffix] === next[next.length - 1 - suffix]) suffix += 1;
  const oldEnd = previous.length - suffix;
  const delta = next.length - previous.length;
  return comments.flatMap((comment) => {
    const shifted = comment.end <= prefix ? comment
      : comment.start >= oldEnd ? { ...comment, start: comment.start + delta, end: comment.end + delta } : null;
    return shifted && next.slice(shifted.start, shifted.end) === `[${shifted.sectionTitle}]\n${shifted.content}` ? [shifted] : [];
  });
}

/** Edit by anchored range so two identical comments never modify the wrong occurrence. */
export function changeProposalComment(reason: string, comments: TrackedProposalComment[], id: string, content?: string): { reason: string; comments: TrackedProposalComment[] } | null {
  const target = comments.find((comment) => comment.id === id);
  if (!target || reason.slice(target.start, target.end) !== `[${target.sectionTitle}]\n${target.content}`) return null;
  const trimmed = content?.trim();
  if (content !== undefined && (!trimmed || trimmed.length > 2000)) return null;
  let start = target.start;
  let end = target.end;
  const replacement = content === undefined ? "" : `[${target.sectionTitle}]\n${trimmed}`;
  if (content === undefined) {
    if (start >= 2 && reason.slice(start - 2, start) === "\n\n") start -= 2;
    else if (reason.slice(end, end + 2) === "\n\n") end += 2;
  }
  const next = reason.slice(0, start) + replacement + reason.slice(end);
  if (next.length > 5000) return null;
  const delta = replacement.length - (end - start);
  return { reason: next, comments: comments.flatMap((comment) => {
    if (comment.id === id) return content === undefined ? [] : [{ ...comment, content: trimmed!, end: comment.start + replacement.length }];
    return [{ ...comment, start: comment.start >= end ? comment.start + delta : comment.start, end: comment.start >= end ? comment.end + delta : comment.end }];
  }) };
}
