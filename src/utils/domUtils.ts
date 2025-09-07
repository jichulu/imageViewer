export function createEl<K extends keyof HTMLElementTagNameMap>(tag: K, props?: Omit<Partial<HTMLElementTagNameMap[K]>, 'style'> & { style?: string }): HTMLElementTagNameMap[K] {
    const el = document.createElement(tag);
    if (props) {
        const { style, ...rest } = props;
        Object.assign(el, rest);
        if (style) (el as HTMLElement).style.cssText = style;
    }
    return el;
}