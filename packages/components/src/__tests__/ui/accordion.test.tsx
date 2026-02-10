// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen, axe, waitFor } from '../test-utils'
import React from 'react'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '../../ui/accordion'

function TestAccordion() {
  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="item-1">
        <AccordionTrigger>What is FABRK?</AccordionTrigger>
        <AccordionContent>FABRK is a UI framework for AI agents.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>How do I install it?</AccordionTrigger>
        <AccordionContent>Run pnpm add @fabrk/components.</AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

describe('Accordion', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<TestAccordion />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders all trigger headings', () => {
    render(<TestAccordion />)
    expect(screen.getByText('What is FABRK?')).toBeInTheDocument()
    expect(screen.getByText('How do I install it?')).toBeInTheDocument()
  })

  it('content is not visible by default in collapsible mode', () => {
    render(<TestAccordion />)
    // Radix Accordion removes closed content from DOM or hides it
    const content = screen.queryByText('FABRK is a UI framework for AI agents.')
    if (content) {
      expect(content).not.toBeVisible()
    } else {
      expect(content).toBeNull()
    }
  })

  it('expands on trigger click and shows content', async () => {
    const { user } = render(<TestAccordion />)
    await user.click(screen.getByText('What is FABRK?'))
    await waitFor(() => {
      expect(screen.getByText('FABRK is a UI framework for AI agents.')).toBeVisible()
    })
  })

  it('collapses when same trigger is clicked again', async () => {
    const { user } = render(<TestAccordion />)
    const trigger = screen.getByText('What is FABRK?')
    // Expand
    await user.click(trigger)
    await waitFor(() => {
      expect(screen.getByText('FABRK is a UI framework for AI agents.')).toBeVisible()
    })
    // Collapse — Radix may remove content from DOM or hide it
    await user.click(trigger)
    await waitFor(() => {
      const content = screen.queryByText('FABRK is a UI framework for AI agents.')
      if (content) {
        expect(content).not.toBeVisible()
      } else {
        expect(content).toBeNull()
      }
    })
  })

  it('only one item is open at a time in single mode', async () => {
    const { user } = render(<TestAccordion />)
    // Open first item
    await user.click(screen.getByText('What is FABRK?'))
    await waitFor(() => {
      expect(screen.getByText('FABRK is a UI framework for AI agents.')).toBeVisible()
    })
    // Open second item - first should close
    await user.click(screen.getByText('How do I install it?'))
    await waitFor(() => {
      expect(screen.getByText('Run pnpm add @fabrk/components.')).toBeVisible()
      const firstContent = screen.queryByText('FABRK is a UI framework for AI agents.')
      if (firstContent) {
        expect(firstContent).not.toBeVisible()
      } else {
        expect(firstContent).toBeNull()
      }
    })
  })
})
