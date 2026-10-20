import { expect, test } from 'claude-code/testing'
import type { RenderElement, RenderNode } from 'claude-code'

import { boxOwnParts, boxTree, tighten } from './layers'

const engine = { type: 'engine', ref: 'core' } as unknown as RenderElement
const text = (s: string): RenderElement => ({ type: 'Text', children: [s] })
const col = (...children: RenderNode[]): RenderElement => ({ type: 'Box', props: { flexDirection: 'column' }, children })

test('tighten drops side padding but keeps bordered boxes', () => {
  const padded: RenderNode = { type: 'Box', props: { paddingX: 1, flexDirection: 'column' }, children: [text('x')] }
  expect(tighten(padded)).toEqual({ type: 'Box', props: { flexDirection: 'column' }, children: [text('x')] })
  const bordered: RenderNode = { type: 'Box', props: { borderStyle: 'round', paddingX: 1 }, children: [] }
  expect(tighten(bordered)).toEqual(bordered)
})

const fakeBox = ({ children, ...props }: { children?: unknown }): RenderElement =>
  ({ type: 'Box', props, children: children as RenderNode[] }) as RenderElement
const boxed = (...children: RenderNode[]): RenderNode =>
  fakeBox({ flexDirection: 'column', borderStyle: 'round', borderColor: 'inactive', children } as never)

test('boxes a layer root whatever its place in the chain', () => {
  const inner = col(text('usage'), engine)
  const props = { flexDirection: 'column', children: [text('mission'), inner] }
  expect(boxOwnParts(props, fakeBox)).toEqual({ flexDirection: 'column', children: [boxed(text('mission')), inner] })
})

test('keeps own parts on their side of the engine drawing', () => {
  const props = { flexDirection: 'column', children: [text('a'), engine, text('b'), text('c')] }
  expect(boxOwnParts(props, fakeBox).children).toEqual([boxed(text('a')), engine, boxed(text('b'), text('c'))])
})

test('flattens nested children and drops blanks', () => {
  const props = { flexDirection: 'column', children: [[text('a'), null], false, ' ', [[engine]]] }
  expect(boxOwnParts(props as { children: unknown }, fakeBox).children).toEqual([boxed(text('a')), engine])
})

test('leaves a box without the engine drawing alone', () => {
  const props = { flexDirection: 'row', paddingX: 1, children: [text('a')] }
  expect(boxOwnParts(props, fakeBox)).toBe(props)
})

test('leaves a styled box holding the engine drawing alone', () => {
  const props = { flexDirection: 'column', gap: 1, children: [text('a'), engine] }
  expect(boxOwnParts(props, fakeBox)).toBe(props)
})

test('keeps a part that draws its own border', () => {
  const own: RenderNode = { type: 'Box', props: { borderStyle: 'single' }, children: [text('x')] }
  const props = { flexDirection: 'column', children: [own, engine] }
  expect(boxOwnParts(props, fakeBox).children).toEqual([own, engine])
})

test('boxes every nested layer of a tree drawn beneath band-boxes', () => {
  const tree = col(text('mission'), col(text('usage'), col(col(), engine)))
  expect(boxTree(tree, fakeBox)).toEqual(col(boxed(text('mission')), col(boxed(text('usage')), col(col(), engine))))
})

test('a tree already boxed by the resolve path is left as it is', () => {
  const resolved = fakeBox(boxOwnParts({ flexDirection: 'column', children: [text('a'), engine, text('b')] }, fakeBox))
  expect(boxTree(resolved, fakeBox)).toEqual(resolved)
})

test('engine alone is left as it is', () => {
  expect(boxTree(engine, fakeBox)).toEqual(engine)
})

test('a band drawn without the engine is boxed whole', () => {
  expect(boxTree(text('only'), fakeBox)).toEqual(boxed(text('only')))
})

test('a box with no direction is a row, not a layer', () => {
  const props = { children: [text('⚡'), engine] }
  expect(boxOwnParts(props, fakeBox)).toBe(props)
})

test('keeps number children', () => {
  const props = { flexDirection: 'column', children: [3, engine] }
  expect(boxOwnParts(props, fakeBox).children).toEqual([boxed('3'), engine])
})
