import { expect, test } from 'claude-code/testing'
import type { RenderNode } from 'claude-code'

import { isBoxed, splitLayers, tighten } from './layers'

const engine = { type: 'engine', ref: 'core' } as unknown as RenderNode
const text = (s: string): RenderNode => ({ type: 'Text', children: [s] })
const col = (...children: RenderNode[]): RenderNode => ({ type: 'Box', props: { flexDirection: 'column' }, children })

test('splits nested mod layers above the engine drawing', () => {
  const tree = col(text('mission'), col(text('usage'), col(col(), engine)))
  const { layers, engine: core } = splitLayers(tree)
  expect(layers.map(l => l.parts)).toEqual([[text('mission')], [text('usage')]])
  expect(core).toEqual(engine)
})

test('keeps a mod whose content sits below the rest', () => {
  const boxed: RenderNode = { type: 'Box', props: { borderStyle: 'round' }, children: [text('ctx')] }
  const { layers } = splitLayers(col(col(engine, text('a')), boxed))
  expect(layers.length).toBe(2)
  expect(isBoxed(layers[0]?.parts ?? [])).toBe(true)
})

test('engine alone yields no layers', () => {
  expect(splitLayers(engine).layers).toEqual([])
})

test('tighten drops side padding but keeps bordered boxes', () => {
  const padded: RenderNode = { type: 'Box', props: { paddingX: 1, flexDirection: 'column' }, children: [text('x')] }
  expect(tighten(padded)).toEqual({ type: 'Box', props: { flexDirection: 'column' }, children: [text('x')] })
  const bordered: RenderNode = { type: 'Box', props: { borderStyle: 'round', paddingX: 1 }, children: [] }
  expect(tighten(bordered)).toEqual(bordered)
})
