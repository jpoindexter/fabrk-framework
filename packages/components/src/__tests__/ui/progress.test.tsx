import { describe, it, expect } from 'vitest'
import React from 'react'
import { render, screen, axe } from '../test-utils'
import { Progress, SolidProgress } from '../../ui/progress'

describe('Progress', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<Progress value={50} />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders as a progressbar role', () => {
    render(<Progress value={50} />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('sets aria-valuenow to the given value', () => {
    render(<Progress value={66} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '66')
  })

  it('sets aria-valuemin and aria-valuemax', () => {
    render(<Progress value={50} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '100')
  })

  it('clamps values below 0 to 0', () => {
    render(<Progress value={-20} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  })

  it('clamps values above 100 to 100', () => {
    render(<Progress value={150} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
  })

  it('shows percentage text when showPercentage is true', () => {
    render(<Progress value={42} showPercentage />)
    expect(screen.getByText('42%')).toBeInTheDocument()
  })

  it('does not show percentage by default', () => {
    render(<Progress value={42} />)
    expect(screen.queryByText('42%')).not.toBeInTheDocument()
  })

  it('has a descriptive aria-label', () => {
    render(<Progress value={75} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-label', 'Progress: 75%')
  })

  it('uses custom label in aria-label when provided', () => {
    render(<Progress value={50} label="Downloading" />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-label', 'Downloading')
  })
})

describe('SolidProgress', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<SolidProgress value={75} />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('renders as a progressbar role', () => {
    render(<SolidProgress value={75} />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('sets aria-valuenow to the given value', () => {
    render(<SolidProgress value={60} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '60')
  })

  it('clamps values below 0 to 0', () => {
    render(<SolidProgress value={-10} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  })

  it('clamps values above 100 to 100', () => {
    render(<SolidProgress value={200} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
  })

  it('shows percentage by default', () => {
    render(<SolidProgress value={45} />)
    expect(screen.getByText('45%')).toBeInTheDocument()
  })

  it('shows DONE text when value reaches 100', () => {
    render(<SolidProgress value={100} />)
    expect(screen.getByText('DONE')).toBeInTheDocument()
  })

  it('shows custom complete text', () => {
    render(<SolidProgress value={100} completeText="FINISHED" />)
    expect(screen.getByText('FINISHED')).toBeInTheDocument()
  })

  it('renders label when provided', () => {
    render(<SolidProgress value={50} label="Upload" />)
    expect(screen.getByText('Upload')).toBeInTheDocument()
  })

  it('has a descriptive aria-label', () => {
    render(<SolidProgress value={80} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-label', 'Progress: 80%')
  })
})
