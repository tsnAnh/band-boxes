import type { Register } from 'claude-code'

import { isBoxed, splitLayers, tighten } from './layers'

export const register: Register = on => {
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const tree = await next(e)
    if (e.props.hasSurvey) return tree

    const { layers, engine } = splitLayers(tree)
    if (layers.length === 0) return tree

    const { Box } = $.ui.resolve(e)
    return (
      <Box flexDirection="column">
        {layers.map(l =>
          isBoxed(l.parts) ? (
            l.parts[0]
          ) : (
            <Box flexDirection="column" borderStyle="round" borderColor="inactive">
              {l.parts.map(tighten)}
            </Box>
          ),
        )}
        {engine}
      </Box>
    )
  })
}
