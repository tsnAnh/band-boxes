import type { RenderElement, RenderNode } from 'claude-code'

const isElement = (n: RenderNode | null | undefined): n is RenderElement => typeof n === 'object' && n !== null

const holdsEngine = (n: RenderNode): boolean =>
  isElement(n) && (n.type === 'engine' || ('children' in n && (n.children ?? []).some(holdsEngine)))

const isBare = (n: RenderNode): n is Extract<RenderElement, { type: 'Box' }> =>
  isElement(n) &&
  n.type === 'Box' &&
  Object.keys(n.props ?? {}).every(k => k === 'flexDirection' && n.props?.[k] === 'column')

const isBlank = (n: RenderNode | undefined): boolean =>
  n === undefined || (typeof n === 'string' && n.trim() === '') || (isBare(n) && (n.children ?? []).every(isBlank))

export type Layer = { parts: RenderNode[] }

export function splitLayers(tree: RenderNode): { layers: Layer[]; engine: RenderNode | null } {
  const layers: Layer[] = []
  let node: RenderNode | null = tree
  while (node !== null) {
    if (!holdsEngine(node)) {
      if (!isBlank(node)) layers.push({ parts: [node] })
      return { layers, engine: null }
    }
    if (isElement(node) && node.type === 'engine') return { layers, engine: node }
    if (!isBare(node)) {
      layers.push({ parts: [node] })
      return { layers, engine: null }
    }
    const children: RenderNode[] = node.children ?? []
    const restAt = children.findIndex(holdsEngine)
    const own = children.filter((c: RenderNode, i: number) => i !== restAt && !isBlank(c))
    if (own.length > 0) layers.push({ parts: own })
    node = children[restAt] ?? null
  }
  return { layers, engine: null }
}

export const isBoxed = (parts: RenderNode[]): boolean =>
  parts.length === 1 && isElement(parts[0]) && parts[0].type === 'Box' && parts[0].props?.borderStyle !== undefined

const SIDE_PADDING = new Set(['paddingX', 'paddingLeft', 'paddingRight', 'padding'])

export const tighten = (n: RenderNode): RenderNode => {
  if (!isElement(n) || n.type !== 'Box' || n.props?.borderStyle !== undefined) return n
  const props = Object.fromEntries(Object.entries(n.props ?? {}).filter(([k]) => !SIDE_PADDING.has(k)))
  return { ...n, props, children: (n.children ?? []).map(c => (isElement(c) && c.type === 'Box' ? tighten(c) : c)) }
}
