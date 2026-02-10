import { render, RenderOptions, RenderResult } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserEvent } from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import React from 'react'

function customRender(ui: React.ReactElement, options?: RenderOptions): RenderResult & { user: UserEvent } {
  return {
    user: userEvent.setup(),
    ...render(ui, options),
  }
}

export { customRender as render, axe }
export { screen, within, waitFor } from '@testing-library/react'
export { userEvent }
