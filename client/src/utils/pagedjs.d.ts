declare module 'pagedjs' {
  export class Previewer {
    preview(
      content: Node,
      styles: Record<string, string>[],
      target: HTMLElement,
    ): Promise<{ total: number }>
    polisher: { destroy(): void }
  }
}
