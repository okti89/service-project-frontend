export function getServiceDateRange(cursor, mode = 'daily') {
  const start = new Date(cursor)
  const end = new Date(cursor)

  if (mode === 'weekly') {
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
    end.setTime(start.getTime())
    end.setDate(end.getDate() + 6)
  } else if (mode === 'monthly') {
    start.setDate(1)
    end.setMonth(end.getMonth() + 1, 0)
  } else if (mode === 'yearly') {
    start.setMonth(0, 1)
    end.setMonth(11, 31)
  }

  const dateKey = (date) => {
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${date.getFullYear()}-${month}-${day}`
  }

  return { start_date: dateKey(start), end_date: dateKey(end) }
}
