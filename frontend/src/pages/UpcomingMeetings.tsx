import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, isToday, isTomorrow, isThisWeek, isPast } from 'date-fns'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import Layout from '@/components/Layout'

interface UpcomingMeeting {
  id: string
  type: string
  subject: string | null
  date: string
  duration: number | null
  location: string | null
  contact: {
    id: string
    name: string
    company: string | null
  }
}

export default function UpcomingMeetings() {
  const [filter, setFilter] = useState<'all' | 'today' | 'this-week'>('all')

  const { data: meetings, isLoading } = useQuery({
    queryKey: ['upcoming-meetings'],
    queryFn: async (): Promise<UpcomingMeeting[]> => {
      const response = await api.get('/communications/upcoming')
      return response.data
    },
  })

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'MEETING': return '🤝'
      case 'PHONE': return '📞'
      case 'EMAIL': return '📧'
      case 'LINKEDIN': return '💼'
      case 'TEXT': return '💬'
      default: return '🔗'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'MEETING': return 'Meeting'
      case 'PHONE': return 'Phone Call'
      case 'EMAIL': return 'Email'
      case 'LINKEDIN': return 'LinkedIn'
      case 'TEXT': return 'Text/SMS'
      default: return 'Other'
    }
  }

  const formatMeetingDate = (dateString: string) => {
    const date = new Date(dateString)
    if (isToday(date)) return 'Today'
    if (isTomorrow(date)) return 'Tomorrow'
    return format(date, 'MMM d, yyyy')
  }

  const formatMeetingTime = (dateString: string) => {
    const date = new Date(dateString)
    return format(date, 'h:mm a')
  }

  const getDateUrgency = (dateString: string) => {
    const date = new Date(dateString)
    if (isPast(date)) return 'text-red-600'
    if (isToday(date)) return 'text-orange-600'
    if (isTomorrow(date)) return 'text-blue-600'
    return 'text-gray-600'
  }

  const filteredMeetings = meetings?.filter(meeting => {
    const date = new Date(meeting.date)
    switch (filter) {
      case 'today':
        return isToday(date)
      case 'this-week':
        return isThisWeek(date)
      default:
        return true
    }
  }) || []

  const groupedMeetings = filteredMeetings.reduce((groups, meeting) => {
    const date = new Date(meeting.date)
    let key: string
    
    if (isPast(date)) {
      key = 'overdue'
    } else if (isToday(date)) {
      key = 'today'
    } else if (isTomorrow(date)) {
      key = 'tomorrow'
    } else if (isThisWeek(date)) {
      key = 'this-week'
    } else {
      key = 'later'
    }
    
    if (!groups[key]) groups[key] = []
    groups[key].push(meeting)
    return groups
  }, {} as Record<string, UpcomingMeeting[]>)

  // Sort meetings within each group by time
  Object.keys(groupedMeetings).forEach(key => {
    groupedMeetings[key].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  })

  return (
    <Layout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Upcoming Meetings</h1>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Filter:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">All Upcoming</option>
              <option value="today">Today</option>
              <option value="this-week">This Week</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading meetings...</p>
          </div>
        ) : !filteredMeetings.length ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No upcoming meetings</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filter === 'all' 
                ? 'Schedule meetings by creating future-dated interactions.' 
                : `No meetings scheduled for ${filter === 'today' ? 'today' : 'this week'}.`
              }
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overdue */}
            {groupedMeetings.overdue && (
              <div>
                <h2 className="text-lg font-semibold text-red-600 mb-3">
                  Overdue ({groupedMeetings.overdue.length})
                </h2>
                <div className="space-y-3">
                  {groupedMeetings.overdue.map(meeting => (
                    <MeetingCard key={meeting.id} meeting={meeting} />
                  ))}
                </div>
              </div>
            )}

            {/* Today */}
            {groupedMeetings.today && (
              <div>
                <h2 className="text-lg font-semibold text-orange-600 mb-3">
                  Today ({groupedMeetings.today.length})
                </h2>
                <div className="space-y-3">
                  {groupedMeetings.today.map(meeting => (
                    <MeetingCard key={meeting.id} meeting={meeting} />
                  ))}
                </div>
              </div>
            )}

            {/* Tomorrow */}
            {groupedMeetings.tomorrow && (
              <div>
                <h2 className="text-lg font-semibold text-blue-600 mb-3">
                  Tomorrow ({groupedMeetings.tomorrow.length})
                </h2>
                <div className="space-y-3">
                  {groupedMeetings.tomorrow.map(meeting => (
                    <MeetingCard key={meeting.id} meeting={meeting} />
                  ))}
                </div>
              </div>
            )}

            {/* This Week */}
            {groupedMeetings['this-week'] && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  This Week ({groupedMeetings['this-week'].length})
                </h2>
                <div className="space-y-3">
                  {groupedMeetings['this-week'].map(meeting => (
                    <MeetingCard key={meeting.id} meeting={meeting} />
                  ))}
                </div>
              </div>
            )}

            {/* Later */}
            {groupedMeetings.later && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  Later ({groupedMeetings.later.length})
                </h2>
                <div className="space-y-3">
                  {groupedMeetings.later.map(meeting => (
                    <MeetingCard key={meeting.id} meeting={meeting} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}

function MeetingCard({ meeting }: { meeting: UpcomingMeeting }) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'MEETING': return '🤝'
      case 'PHONE': return '📞'
      case 'EMAIL': return '📧'
      case 'LINKEDIN': return '💼'
      case 'TEXT': return '💬'
      default: return '🔗'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'MEETING': return 'Meeting'
      case 'PHONE': return 'Phone Call'
      case 'EMAIL': return 'Email'
      case 'LINKEDIN': return 'LinkedIn'
      case 'TEXT': return 'Text/SMS'
      default: return 'Other'
    }
  }

  const formatMeetingDate = (dateString: string) => {
    const date = new Date(dateString)
    if (isToday(date)) return 'Today'
    if (isTomorrow(date)) return 'Tomorrow'
    return format(date, 'MMM d, yyyy')
  }

  const formatMeetingTime = (dateString: string) => {
    const date = new Date(dateString)
    return format(date, 'h:mm a')
  }

  const getDateUrgency = (dateString: string) => {
    const date = new Date(dateString)
    if (isPast(date)) return 'text-red-600'
    if (isToday(date)) return 'text-orange-600'
    if (isTomorrow(date)) return 'text-blue-600'
    return 'text-gray-600'
  }

  return (
    <Link
      to={`/contacts/${meeting.contact.id}`}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow block"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="text-xl">{getTypeIcon(meeting.type)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-medium text-gray-900">
                {meeting.subject || getTypeLabel(meeting.type)}
              </h3>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              with <span className="font-medium">{meeting.contact.name}</span>
              {meeting.contact.company && (
                <span className="text-gray-500"> at {meeting.contact.company}</span>
              )}
            </p>
            <div className="mt-2 flex items-center space-x-4 text-sm">
              <span className={`font-medium ${getDateUrgency(meeting.date)}`}>
                {formatMeetingDate(meeting.date)} at {formatMeetingTime(meeting.date)}
              </span>
              {meeting.duration && (
                <span className="text-gray-500">⏱️ {meeting.duration} min</span>
              )}
              {meeting.location && (
                <span className="text-gray-500">📍 {meeting.location}</span>
              )}
            </div>
          </div>
        </div>
        <div className="ml-3 flex-shrink-0">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  )
}