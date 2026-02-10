import type { Meta, StoryObj } from '@storybook/react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from './data-table'

interface SampleRow {
  id: string
  name: string
  status: string
  amount: number
}

const sampleColumns: ColumnDef<SampleRow, unknown>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
  },
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'status',
    header: 'Status',
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ row }) => `$${row.getValue<number>('amount').toFixed(2)}`,
  },
]

const sampleData: SampleRow[] = [
  { id: 'TXN-001', name: 'Alpha Project', status: 'Active', amount: 1250.0 },
  { id: 'TXN-002', name: 'Beta Release', status: 'Pending', amount: 890.5 },
  { id: 'TXN-003', name: 'Gamma Deploy', status: 'Complete', amount: 3200.0 },
  { id: 'TXN-004', name: 'Delta Patch', status: 'Active', amount: 150.75 },
  { id: 'TXN-005', name: 'Epsilon Test', status: 'Failed', amount: 0.0 },
]

const meta = {
  title: 'Data/DataTable',
  component: DataTable,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof DataTable>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    columns: sampleColumns,
    data: sampleData,
    searchKey: 'name',
    searchPlaceholder: 'Search projects...',
  },
}
