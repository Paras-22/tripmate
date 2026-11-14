import { validateActivity, validateInviteCode, validateTrip } from './validation'

const goodTrip = { title: 'Japan', destination: 'Tokyo', startDate: '2027-01-10', endDate: '2027-01-15' }
const trip = { startDate: '2027-01-10', endDate: '2027-01-15' }

test('a correct trip has no errors', () => {
  expect(validateTrip(goodTrip)).toEqual({})
})

test('a trip needs a name and destination, and spaces alone do not count', () => {
  const errors = validateTrip({ ...goodTrip, title: '   ', destination: '' })
  expect(errors.title).toBe('Please enter a trip name')
  expect(errors.destination).toBe('Please enter where you are going')
})

test('a trip cannot end before it starts, but can be one day', () => {
  expect(validateTrip({ ...goodTrip, endDate: '2027-01-09' }).endDate).toBe(
    'End date must be on or after the start date',
  )
  expect(validateTrip({ ...goodTrip, endDate: '2027-01-10' })).toEqual({})
})

test('a trip name longer than 100 characters is stopped', () => {
  expect(validateTrip({ ...goodTrip, title: 'a'.repeat(101) }).title).toMatch(/100 characters/)
})

test('an activity must be on a day of the trip', () => {
  const activity = { title: 'Flight', date: '2027-01-10', time: '09:30' }
  expect(validateActivity(activity, trip)).toEqual({})
  expect(validateActivity({ ...activity, date: '2027-01-16' }, trip).date).toBe(
    'Pick a date between 2027-01-10 and 2027-01-15',
  )
})

test('an activity needs a title and short notes', () => {
  const errors = validateActivity({ title: '', date: '2027-01-11', notes: 'x'.repeat(501) }, trip)
  expect(errors.title).toBe('Please say what is happening')
  expect(errors.notes).toMatch(/500 characters/)
})

test('invite codes must be 8 letters and numbers', () => {
  expect(validateInviteCode('a1b2c3d4')).toBe('')
  expect(validateInviteCode('')).toBe('Please type the invite code from the organiser')
  expect(validateInviteCode('ABC')).toMatch(/8 letters and numbers/)
  expect(validateInviteCode('ZZZZZZZZ')).toMatch(/8 letters and numbers/)
})
