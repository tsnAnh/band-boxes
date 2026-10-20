import type { RenderElement, RenderNode } from 'claude-code'

const isElement = (n: RenderNode | null | undefined): n is RenderElement => typeof n === 'object' && n !== null

const holdsEngine = (n: RenderNode): boolean =>
  isElement(n) && (n.type === 'engine' || ('children' in n && (n.children ?? []).some(holdsEngine)))

const isColumnOnly = (props: Record<string, unknown>): boolean =>
  props.flexDirection === 'column' && Object.keys(props).every(k => k === 'flexDirection')

const isBare = (n: RenderNode): n is Extract<RenderElement, { type: 'Box' }> =>
  isElement(n) && n.type === 'Box' && isColumnOnly(n.props ?? {})

const isBlank = (n: RenderNode | undefined): boolean =>
  n === undefined || (typeof n === 'string' && n.trim() === '') || (isBare(n) && (n.children ?? []).every(isBlank))

export const isBoxed = (parts: RenderNode[]): boolean =>
  parts.length === 1 && isElement(parts[0]) && parts[0].type === 'Box' && parts[0].props?.borderStyle !== undefined

const SIDE_PADDING = new Set(['paddingX', 'paddingLeft', 'paddingRight', 'padding'])

export const tighten = (n: RenderNode): RenderNode => {
  if (!isElement(n) || n.type !== 'Box' || n.props?.borderStyle !== undefined) return n
  const props = Object.fromEntries(Object.entries(n.props ?? {}).filter(([k]) => !SIDE_PADDING.has(k)))
  return { ...n, props, children: (n.children ?? []).map(c => (isElement(c) && c.type === 'Box' ? tighten(c) : c)) }
}

type BoxProps = { children?: unknown } & Record<string, unknown>
type BoxConstructor = (props: never) => RenderElement

const flatten = (children: unknown): RenderNode[] =>
  Array.isArray(children)
    ? children.flatMap(flatten)
    : typeof children === 'number'
      ? [String(children)]
      : typeof children === 'string' || isElement(children as RenderNode)
        ? [children as RenderNode]
        : []

const ROUND_BOX = { flexDirection: 'column', borderStyle: 'round', borderColor: 'inactive' } as const

const roundBox = (own: RenderNode[], Box: BoxConstructor): RenderElement =>
  Box({ ...ROUND_BOX, children: own.map(tighten) } as never)

const boxParts = (parts: RenderNode[], Box: BoxConstructor): RenderNode[] => {
  const own = parts.filter(n => !isBlank(n))
  if (own.length === 0) return parts
  return isBoxed(own) ? own : [roundBox(own, Box)]
}

export function boxOwnParts<P extends BoxProps>(props: P, Box: BoxConstructor): P {
  const { children, ...style } = props
  if (!isColumnOnly(style)) return props
  const nodes = flatten(children)
  if (!nodes.some(holdsEngine)) return props

  const out: RenderNode[] = []
  let run: RenderNode[] = []
  for (const n of nodes) {
    if (holdsEngine(n)) {
      out.push(...boxParts(run, Box), n)
      run = []
    } else run.push(n)
  }
  out.push(...boxParts(run, Box))
  return { ...props, children: out }
}

const boxLayers = (node: RenderElement, Box: BoxConstructor): RenderElement => {
  if (!isBare(node)) return node
  const children = (node.children ?? []).map(c => (isElement(c) && holdsEngine(c) ? boxLayers(c, Box) : c))
  return { ...node, children: boxOwnParts({ ...node.props, children }, Box).children as RenderNode[] }
}

export const boxTree = (tree: RenderElement, Box: BoxConstructor): RenderElement => {
  if (holdsEngine(tree)) return boxLayers(tree, Box)
  return isBlank(tree) || isBoxed([tree]) ? tree : roundBox([tree], Box)
}
