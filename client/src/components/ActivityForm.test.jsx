import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import ActivityForm from './ActivityForm'

// Here I test the form for adding and editing one activity of the itinerary

const trip = { startDate: '2027-01-10', endDate: '2027-01-12' }
const flight = { _id: 'a1', title: 'Flight to Tokyo', date: '2027-01-10', time: '09:30', type: 'flight' }

function showForm(activity) {
  const onSubmit = vi.fn(async () => {})
  render(<ActivityForm trip={trip} activity={activity} onSubmit={onSubmit} onCancel={() => {}} />)
  return onSubmit
}

const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save' }))

// Here a new activity starts on the first day of the trip with the type Other
test('says Add activity and starts on the first day of the trip', () => {
  showForm()
  expect(screen.getByRole('heading', { name: 'Add activity' })).toBeTruthy()
  expect(screen.getByLabelText('Date').value).toBe('2027-01-10')
  expect(screen.getByLabelText('Type').value).toBe('other')
})

// Here min and max stop the date picker from showing days outside the trip
test('limits the date picker to the trip dates', () => {
  showForm()
  expect(screen.getByLabelText('Date').min).toBe('2027-01-10')
  expect(screen.getByLabelText('Date').max).toBe('2027-01-12')
})

test('says Edit activity and fills in the saved values when editing', () => {
  showForm(flight)
  expect(screen.getByRole('heading', { name: 'Edit activity' })).toBeTruthy()
  expect(screen.getByLabelText('What is happening?').value).toBe('Flight to Tokyo')
  expect(screen.getByLabelText('Type').value).toBe('flight')
})

test('saves a correct activity with all its fields', async () => {
  const onSubmit = showForm(flight)
  fireEvent.change(screen.getByLabelText('Location'), { target: { value: 'Auckland Airport' } })
  save()
  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
  expect(onSubmit.mock.calls[0][0]).toMatchObject({ title: 'Flight to Tokyo', type: 'flight', location: 'Auckland Airport' })
})

test('needs a title', async () => {
  const onSubmit = showForm()
  save()
  expect(await screen.findByText('Please say what is happening')).toBeTruthy()
  expect(onSubmit).not.toHaveBeenCalled()
})

// Here someone could type a date by hand, so the rule checks it again
test('stops a date outside the trip', async () => {
  const onSubmit = showForm({ title: 'Museum', date: '2027-02-01' })
  save()
  expect(await screen.findByText('Pick a date between 2027-01-10 and 2027-01-12')).toBeTruthy()
  expect(onSubmit).not.toHaveBeenCalled()
})
