import type { Register } from 'claude-code'

import { boxOwnParts, boxTree } from './layers'

export const register: Register = on => {
  on('ui.resolve', { component: 'AbovePrompt' }, async ($, e, next) => {
    const table = await next(e)
    const { Box } = table
    return { ...table, Box: props => Box(boxOwnParts(props, Box)) }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const tree = await next(e)
    if (e.props.hasSurvey) return tree
    return boxTree(tree, $.ui.resolve(e).Box)
  })
}
