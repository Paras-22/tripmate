const ONE_DAY = 24 * 60 * 60 * 1000

// Here I show dates in UTC so a date never moves to the day before in another time zone
export function formatDate(date) {
  return new Date(date).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}

// Here I turn the flat activity list into days, with each day sorted by time
export function groupByDay(trip) {
  const sorted = [...trip.activities].sort((a, b) =>
    `${a.date}${a.time || ''}`.localeCompare(`${b.date}${b.time || ''}`),
  )

  const days = new Map()
  for (const activity of sorted) {
    if (!days.has(activity.date)) days.set(activity.date, [])
    days.get(activity.date).push(activity)
  }

  return [...days].map(([date, activities]) => ({
    date,
    activities,
    number: Math.round((new Date(date) - new Date(trip.startDate)) / ONE_DAY) + 1,
  }))
}
