import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import TripForm from './TripForm'

// Here I test the form for creating and editing a trip

const trip = { _id: 't1', title: 'Japan', destination: 'Tokyo', startDate: '2027-01-10', endDate: '2027-01-12' }

function showForm(props) {
  const onSubmit = vi.fn(async () => {})
  render(<TripForm onSubmit={onSubmit} onCancel={() => {}} {...props} />)
  return onSubmit
}

const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save' }))

test('says New trip when there is no trip yet', () => {
  showForm()
  expect(screen.getByRole('heading', { name: 'New trip' })).toBeTruthy()
})

// Here the same form is used to edit, so it must start with the saved values
test('says Edit trip and fills in the saved values when editing', () => {
  showForm({ trip })
  expect(screen.getByRole('heading', { name: 'Edit trip' })).toBeTruthy()
  expect(screen.getByLabelText('Trip name').value).toBe('Japan')
  expect(screen.getByLabelText('End date').value).toBe('2027-01-12')
})

test('saves when every field is correct', async () => {
  const onSubmit = showForm({ trip })
  save()
  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
  expect(onSubmit.mock.calls[0][0]).toEqual({
    title: 'Japan',
    destination: 'Tokyo',
    startDate: '2027-01-10',
    endDate: '2027-01-12',
  })
})

test('shows a message under each empty field and does not save', async () => {
  const onSubmit = showForm()
  save()
  expect(await screen.findByText('Please enter a trip name')).toBeTruthy()
  expect(screen.getByText('Please enter where you are going')).toBeTruthy()
  expect(screen.getByText('Please pick a start date')).toBeTruthy()
  expect(onSubmit).not.toHaveBeenCalled()
})

test('does not save a trip that ends before it starts', async () => {
  const onSubmit = showForm({ trip: { ...trip, endDate: '2027-01-01' } })
  save()
  expect(await screen.findByText('End date must be on or after the start date')).toBeTruthy()
  expect(onSubmit).not.toHaveBeenCalled()
})

// Here the message goes away once the user fixes the field and saves again.
// The label also holds the error text now, so I find each box by how its label starts.
test('removes the message after the field is fixed', async () => {
  const onSubmit = showForm()
  save()
  await screen.findByText('Please enter a trip name')

  fireEvent.change(screen.getByLabelText(/^Trip name/), { target: { value: 'Bali' } })
  fireEvent.change(screen.getByLabelText(/^Destination/), { target: { value: 'Ubud' } })
  fireEvent.change(screen.getByLabelText(/^Start date/), { target: { value: '2027-06-01' } })
  fireEvent.change(screen.getByLabelText(/^End date/), { target: { value: '2027-06-05' } })
  save()

  await waitFor(() => expect(onSubmit).toHaveBeenCalled())
  expect(screen.queryByText('Please enter a trip name')).toBeNull()
})
