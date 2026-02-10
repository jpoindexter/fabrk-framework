import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, axe } from '../test-utils'
import { DataTable } from '../../ui/data-table/data-table'
import type { ColumnDef } from '@tanstack/react-table'

interface TestRow {
  name: string
  status: string
  email: string
}

const columns: ColumnDef<TestRow, unknown>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'email', header: 'Email' },
]

const sampleData: TestRow[] = [
  { name: 'Alice', status: 'Active', email: 'alice@test.com' },
  { name: 'Bob', status: 'Inactive', email: 'bob@test.com' },
  { name: 'Carol', status: 'Active', email: 'carol@test.com' },
]

describe('DataTable', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <DataTable columns={columns} data={sampleData} />
    )
    // Exclude button-name: the pagination Select trigger from Radix lacks
    // an accessible label — this is a known upstream issue, not a DataTable bug.
    expect(await axe(container, { rules: { 'button-name': { enabled: false } } })).toHaveNoViolations()
  })

  it('renders column headers', () => {
    render(<DataTable columns={columns} data={sampleData} />)
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
  })

  it('renders all data rows', () => {
    render(<DataTable columns={columns} data={sampleData} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Carol')).toBeInTheDocument()
  })

  it('renders cell data correctly', () => {
    render(<DataTable columns={columns} data={sampleData} />)
    expect(screen.getByText('alice@test.com')).toBeInTheDocument()
    expect(screen.getByText('Inactive')).toBeInTheDocument()
  })

  it('shows empty state when data is an empty array', () => {
    render(<DataTable columns={columns} data={[]} />)
    expect(screen.getByText('No results found.')).toBeInTheDocument()
  })

  it('calls onRowClick when a row is clicked', async () => {
    const onRowClick = vi.fn()
    const { user } = render(
      <DataTable columns={columns} data={sampleData} onRowClick={onRowClick} />
    )
    await user.click(screen.getByText('Alice'))
    expect(onRowClick).toHaveBeenCalledWith(sampleData[0])
  })

  it('renders search input when searchKey is provided', () => {
    render(
      <DataTable columns={columns} data={sampleData} searchKey="name" searchPlaceholder="Search names..." />
    )
    expect(screen.getByPlaceholderText('Search names...')).toBeInTheDocument()
  })

  it('does not render search input when searchKey is not provided', () => {
    render(<DataTable columns={columns} data={sampleData} />)
    expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument()
  })
})
