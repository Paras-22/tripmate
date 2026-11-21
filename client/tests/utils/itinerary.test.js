import { formatDate, groupByDay } from '../../src/utils/itinerary'

// Here I test the two helper functions that turn the trip data into the day-by-day plan

const trip = {
  startDate: '2027-01-10',
  activities: [
    { _id: 'a2', date: '2027-01-11', time: '12:00', title: 'Lunch' },
    { _id: 'a3', date: '2027-01-10', time: '18:00', title: 'Hotel' },
    { _id: 'a1', date: '2027-01-10', time: '09:00', title: 'Flight' },
  ],
}

describe('groupByDay', () => {
  // Here I give the activities in a random order, like they can come from the database
  test('puts activities into days and sorts each day by time', () => {
    const days = groupByDay(trip)
    expect(days.map((day) => day.date)).toEqual(['2027-01-10', '2027-01-11'])
    expect(days[0].activities.map((a) => a.title)).toEqual(['Flight', 'Hotel'])
  })

  // Here I check Day 1 is the start date of the trip, so the second date is Day 2
  test('numbers the days from the trip start date', () => {
    expect(groupByDay(trip).map((day) => day.number)).toEqual([1, 2])
  })

  // Here I check a day with no activities is skipped, but the numbers stay true to the calendar
  test('keeps the right day number when a day in the middle is empty', () => {
    const days = groupByDay({ startDate: '2027-01-10', activities: [{ date: '2027-01-13', title: 'Tour' }] })
    expect(days[0].number).toBe(4)
  })

  // Here I check an activity with no time goes first in its day
  test('puts an activity with no time before the timed ones', () => {
    const days = groupByDay({
      startDate: '2027-01-10',
      activities: [
        { date: '2027-01-10', time: '08:00', title: 'Breakfast' },
        { date: '2027-01-10', title: 'Free day' },
      ],
    })
    expect(days[0].activities[0].title).toBe('Free day')
  })

  test('gives an empty list for a trip with no activities', () => {
    expect(groupByDay({ startDate: '2027-01-10', activities: [] })).toEqual([])
  })

  // Here I check the function does not change the trip it was given
  test('does not change the order of the original list', () => {
    const before = trip.activities.map((a) => a._id)
    groupByDay(trip)
    expect(trip.activities.map((a) => a._id)).toEqual(before)
  })
})

describe('formatDate', () => {
  // Here I check the day number, because the date must stay on the same day in every time zone
  test('shows the weekday, day and month of the date', () => {
    const text = formatDate('2027-01-10')
    expect(text).toMatch(/10/)
    expect(text).toMatch(/Jan/)
    expect(text).toMatch(/Sun/)
  })
})
