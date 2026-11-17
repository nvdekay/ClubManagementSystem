import { Fragment } from "react";

import { documentTextParts, type DocumentLink } from "@/utils/documentLinks";

interface AppLinkedTextProps { text: string; links?: readonly DocumentLink[] }

export function AppLinkedText({ text, links }: AppLinkedTextProps) {
  return <>{documentTextParts(text, links).map((part, index) => part.href
    ? <a key={index} href={part.href} target="_blank" rel="noopener noreferrer"
        className="break-words text-primary-app underline decoration-primary-app/40 underline-offset-2 hover:decoration-primary-app focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-app">{part.text}</a>
    : <Fragment key={index}>{part.text}</Fragment>)}</>;
}
