import { useState } from 'react'
import { format, isToday, isPast, isTomorrow, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths } from 'date-fns'
import { Link } from 'react-router-dom'

interface UnifiedTask {
  id: string
  type: 'manual' | 'followup'
  title: string
  description: string | null
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  dueDate: string | null
  completed: boolean
  source: {
    type: 'contact' | 'application'
    id: string
    name: string
    interactionDate?: string
    interactionType?: string
  } | null
}

interface Meeting {
  id: string
  type: string
  subject: string | null
  date: string
  duration: number | null
  location: string | null
  contact: {
    id: string
    name: string
    company?: string | null
  }
}

interface CalendarProps {
  tasks?: UnifiedTask[]
  meetings?: Meeting[]
  currentMonth: Date
  setCurrentMonth: (date: Date) => void
  navigate?: (path: string) => void
  onTaskClick?: (task: UnifiedTask) => void
  onTaskToggle?: (task: UnifiedTask) => void
  showTaskCheckboxes?: boolean
}

export default function Calendar({
  tasks = [],
  meetings = [],
  currentMonth,
  setCurrentMonth,
  navigate,
  onTaskClick,
  onTaskToggle,
  showTaskCheckboxes = false
}: CalendarProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  
  // Get items for this month
  const monthTasks = tasks.filter(task => 
    task.dueDate && isSameMonth(new Date(task.dueDate), currentMonth)
  )
  const monthMeetings = meetings.filter(meeting => 
    meeting.date && isSameMonth(new Date(meeting.date), currentMonth)
  )

  // Group items by date
  const itemsByDate = {} as Record<string, { tasks: UnifiedTask[], meetings: Meeting[] }>
  
  monthTasks.forEach(task => {
    if (!task.dueDate) return
    const dateKey = format(new Date(task.dueDate), 'yyyy-MM-dd')
    if (!itemsByDate[dateKey]) itemsByDate[dateKey] = { tasks: [], meetings: [] }
    itemsByDate[dateKey].tasks.push(task)
  })
  
  monthMeetings.forEach(meeting => {
    if (!meeting.date) return
    const dateKey = format(new Date(meeting.date), 'yyyy-MM-dd')
    if (!itemsByDate[dateKey]) itemsByDate[dateKey] = { tasks: [], meetings: [] }
    itemsByDate[dateKey].meetings.push(meeting)
  })

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const goToCurrentMonth = () => setCurrentMonth(new Date())

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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'bg-red-100 text-red-700'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-700'
      default: return 'bg-green-100 text-green-700'
    }
  }

  const handleTaskClick = (task: UnifiedTask) => {
    if (onTaskClick) {
      onTaskClick(task)
    } else if (navigate) {
      if (task.type === 'manual' && !task.source) {
        navigate('/tasks')
      } else if (task.source?.type === 'contact' || task.type === 'followup') {
        navigate(`/contacts/${task.source?.id}`)
      } else if (task.source?.type === 'application') {
        navigate('/applications')
      }
    }
  }

  const handleMeetingClick = (meeting: Meeting) => {
    if (navigate) {
      navigate(`/contacts/${meeting.contact.id}`)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 relative">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <button
          onClick={goToPreviousMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <button
            onClick={goToCurrentMonth}
            className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 transition-colors"
          >
            Today
          </button>
        </div>
        
        <button
          onClick={goToNextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Global Tooltip */}
      {hoveredItem && (() => {
        // Find the hovered item data
        const isTask = hoveredItem.startsWith('task-')
        const itemData = isTask 
          ? tasks.find(t => `task-${t.id}` === hoveredItem)
          : meetings.find(m => `meeting-${m.id}` === hoveredItem)
        
        if (!itemData) return null

        return (
          <div 
            className="fixed bg-gray-900 text-white text-xs rounded px-3 py-2 shadow-lg border"
            style={{ 
              zIndex: 99999,
              top: `${mousePosition.y + 10}px`,
              left: `${mousePosition.x + 10}px`,
              minWidth: '250px',
              maxWidth: '350px'
            }}
          >
            {isTask ? (
              <>
                <div className="font-medium mb-1">{itemData.title}</div>
                {itemData.description && <div className="mb-1">{itemData.description}</div>}
                <div>Priority: {itemData.priority.toLowerCase()}</div>
                <div>Status: {itemData.completed ? 'Completed' : 'Pending'}</div>
                {itemData.dueDate && <div>Due: {format(new Date(itemData.dueDate), 'MMM d, h:mm a')}</div>}
                {itemData.source && (
                  <div>
                    {itemData.source.type === 'contact' ? 'Contact: ' : 'Application: '}
                    {itemData.source.name}
                  </div>
                )}
                {itemData.type === 'followup' && itemData.source?.interactionDate && (
                  <div>
                    From {itemData.source.interactionType?.toLowerCase() || 'interaction'} on{' '}
                    {format(new Date(itemData.source.interactionDate), 'MMM d')}
                  </div>
                )}
                <div className="text-gray-300 mt-1">Click to {itemData.type === 'followup' ? 'view contact' : 'edit task'}</div>
              </>
            ) : (
              <>
                <div className="font-medium mb-1">
                  {itemData.subject || (
                    itemData.type === 'MEETING' ? 'Meeting' : 
                    itemData.type === 'PHONE' ? 'Phone Call' : 
                    itemData.type === 'EMAIL' ? 'Email' : 
                    itemData.type === 'LINKEDIN' ? 'LinkedIn' : 
                    itemData.type === 'TEXT' ? 'Text/SMS' : 'Other'
                  )}
                </div>
                <div>with {itemData.contact.name}</div>
                {itemData.contact.company && <div>at {itemData.contact.company}</div>}
                <div>{format(new Date(itemData.date), 'MMM d, h:mm a')}</div>
                {itemData.location && <div>📍 {itemData.location}</div>}
                {itemData.duration && <div>⏱️ {itemData.duration} min</div>}
                <div className="text-gray-300 mt-1">Click to view contact</div>
              </>
            )}
          </div>
        )
      })()}

      {/* Calendar Grid */}
      <div className="p-4 overflow-visible">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1 overflow-visible">
          {/* Empty cells for days before month start */}
          {Array.from({ length: monthStart.getDay() }).map((_, index) => (
            <div key={`empty-${index}`} className="h-32"></div>
          ))}
          
          {/* Days of the month */}
          {days.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd')
            const dayItems = itemsByDate[dateKey] || { tasks: [], meetings: [] }
            const isToday_ = isToday(day)
            const isPastDay = isPast(day) && !isToday_
            const totalItems = dayItems.tasks.length + dayItems.meetings.length
            
            return (
              <div
                key={day.toISOString()}
                className={`h-32 p-1 border border-gray-100 rounded-lg relative overflow-visible ${
                  isToday_ ? 'bg-indigo-50 border-indigo-200' : 'hover:bg-gray-50'
                } ${isPastDay ? 'bg-gray-50' : ''}`}
              >
                <div className={`text-sm font-medium mb-1 ${
                  isToday_ ? 'text-indigo-600' : isPastDay ? 'text-gray-400' : 'text-gray-900'
                }`}>
                  {format(day, 'd')}
                </div>
                
                {/* Items for this day */}
                <div className="space-y-1 text-xs">
                  {/* Show up to 2 meetings */}
                  {dayItems.meetings.slice(0, 2).map(meeting => {
                    const itemId = `meeting-${meeting.id}`
                    return (
                      <div
                        key={itemId}
                        onClick={() => handleMeetingClick(meeting)}
                        onMouseEnter={(e) => {
                          setHoveredItem(itemId)
                          setMousePosition({ x: e.clientX, y: e.clientY })
                        }}
                        onMouseLeave={() => setHoveredItem(null)}
                        className={`p-1 rounded cursor-pointer truncate relative ${
                          isPast(new Date(meeting.date)) && !isToday(new Date(meeting.date))
                            ? 'bg-gray-200 text-gray-600'
                            : isToday(new Date(meeting.date))
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-blue-100 text-blue-700'
                        } hover:opacity-80 transition-opacity`}
                      >
                        <span className="mr-1">{getTypeIcon(meeting.type)}</span>
                        <span className="font-medium">{format(new Date(meeting.date), 'h:mm a')}</span>
                        <div className="truncate">{meeting.contact.name}</div>
                      </div>
                    )
                  })}
                  
                  {/* Show remaining space for tasks */}
                  {dayItems.tasks.slice(0, Math.min(3 - dayItems.meetings.length, dayItems.tasks.length)).map(task => {
                    const itemId = `task-${task.id}`
                    return (
                      <div
                        key={itemId}
                        className={`p-1 rounded cursor-pointer truncate relative flex items-center ${
                          task.completed
                            ? 'bg-gray-100 text-gray-500 opacity-60'
                            : getPriorityColor(task.priority)
                        } hover:opacity-80 transition-opacity`}
                        onMouseEnter={(e) => {
                          setHoveredItem(itemId)
                          setMousePosition({ x: e.clientX, y: e.clientY })
                        }}
                        onMouseLeave={() => setHoveredItem(null)}
                      >
                        {showTaskCheckboxes && onTaskToggle && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onTaskToggle(task)
                            }}
                            className="mr-1 flex-shrink-0"
                          >
                            <div className={`w-3 h-3 rounded border flex items-center justify-center ${
                              task.completed 
                                ? 'bg-green-500 border-green-500' 
                                : 'border-gray-400'
                            }`}>
                              {task.completed && (
                                <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          </button>
                        )}
                        <div 
                          onClick={() => handleTaskClick(task)}
                          className={`truncate font-medium flex-1 ${task.completed ? 'line-through' : ''}`}
                        >
                          {!showTaskCheckboxes && <span className="mr-1">✅</span>}
                          {task.title}
                        </div>
                      </div>
                    )
                  })}
                  
                  {/* Show count if more than 3 items */}
                  {totalItems > 3 && (
                    <div className="text-xs text-gray-500 text-center p-1">
                      +{totalItems - 3} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}