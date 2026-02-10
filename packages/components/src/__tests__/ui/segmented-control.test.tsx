import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, axe } from '../test-utils'
import { SegmentedControl } from '../../ui/segmented-control'

const options = [
  { value: 'day', label: 'DAY' },
  { value: 'week', label: 'WEEK' },
  { value: 'month', label: 'MONTH' },
]

describe('SegmentedControl', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <SegmentedControl options={options} value="day" onChange={vi.fn()} />
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders all segment options', () => {
    render(<SegmentedControl options={options} value="day" onChange={vi.fn()} />)
    expect(screen.getByText('DAY')).toBeInTheDocument()
    expect(screen.getByText('WEEK')).toBeInTheDocument()
    expect(screen.getByText('MONTH')).toBeInTheDocument()
  })

  it('marks the active segment with aria-checked', () => {
    render(<SegmentedControl options={options} value="week" onChange={vi.fn()} />)
    const radios = screen.getAllByRole('radio')
    expect(radios[0]).toHaveAttribute('aria-checked', 'false') // DAY
    expect(radios[1]).toHaveAttribute('aria-checked', 'true')  // WEEK
    expect(radios[2]).toHaveAttribute('aria-checked', 'false') // MONTH
  })

  it('calls onChange with the correct value when a segment is clicked', async () => {
    const onChange = vi.fn()
    const { user } = render(
      <SegmentedControl options={options} value="day" onChange={onChange} />
    )
    await user.click(screen.getByText('MONTH'))
    expect(onChange).toHaveBeenCalledWith('month')
  })

  it('renders with disabled option', () => {
    const optionsWithDisabled = [
      { value: 'day', label: 'DAY' },
      { value: 'week', label: 'WEEK', disabled: true },
      { value: 'month', label: 'MONTH' },
    ]
    render(
      <SegmentedControl options={optionsWithDisabled} value="day" onChange={vi.fn()} />
    )
    const radios = screen.getAllByRole('radio')
    expect(radios[1]).toBeDisabled()
  })

  it('does not call onChange when a disabled option is clicked', async () => {
    const onChange = vi.fn()
    const optionsWithDisabled = [
      { value: 'day', label: 'DAY' },
      { value: 'week', label: 'WEEK', disabled: true },
      { value: 'month', label: 'MONTH' },
    ]
    const { user } = render(
      <SegmentedControl options={optionsWithDisabled} value="day" onChange={onChange} />
    )
    await user.click(screen.getByText('WEEK'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('has a radiogroup role on the container', () => {
    render(<SegmentedControl options={options} value="day" onChange={vi.fn()} />)
    expect(screen.getByRole('radiogroup')).toBeInTheDocument()
  })

  it('renders with custom className', () => {
    render(
      <SegmentedControl options={options} value="day" onChange={vi.fn()} className="custom-class" />
    )
    expect(screen.getByRole('radiogroup')).toHaveClass('custom-class')
  })
})
