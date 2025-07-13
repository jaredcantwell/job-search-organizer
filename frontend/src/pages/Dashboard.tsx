import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isToday, isThisWeek, isPast, isTomorrow, format } from 'date-fns'
import Layout from '@/components/Layout'
import Calendar from '@/components/Calendar'
import { api } from '@/lib/api'

interface DashboardStats {
  totalContacts: number
  totalInteractions: number
  outstandingTasks: number
}

interface UnifiedTask {
  id: string
  type: 'manual' | 'followup'
  title: string
  description: string | null
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  dueDate: string | null
  completed: boolean
  source: {
    id: string
    name: string
    type?: 'contact' | 'application'
  } | null
}


export default function DashboardPage() {
  const navigate = useNavigate()
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const queryClient = useQueryClient()

  // Fetch dashboard statistics
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const [contactsRes, tasksRes] = await Promise.all([
        api.get('/contacts'),
        api.get('/tasks/unified')
      ])
      
      const contacts = contactsRes.data
      const tasks = tasksRes.data

      // Get total interactions by fetching communications for each contact
      const communicationPromises = contacts.map((contact: any) =>
        api.get(`/communications/contact/${contact.id}`)
      )
      
      const communicationResponses = await Promise.all(communicationPromises)
      const totalInteractions = communicationResponses.reduce((sum, response) => 
        sum + response.data.length, 0
      )

      const outstandingTasks = tasks.filter((task: any) => !task.completed).length

      return {
        totalContacts: contacts.length,
        totalInteractions,
        outstandingTasks,
      }
    }
  })

  // Fetch upcoming tasks
  const { data: upcomingTasks } = useQuery({
    queryKey: ['upcoming-tasks'],
    queryFn: async (): Promise<UnifiedTask[]> => {
      const response = await api.get('/tasks/unified?status=pending')
      // Sort by due date (tasks without due dates go to the end)
      const sortedTasks = [...response.data].sort((a: UnifiedTask, b: UnifiedTask) => {
        if (!a.dueDate && !b.dueDate) return 0
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      })
      return sortedTasks.slice(0, 5) // Get next 5 tasks
    }
  })

  // Fetch upcoming meetings
  const { data: upcomingMeetings } = useQuery({
    queryKey: ['upcoming-meetings'],
    queryFn: async () => {
      const response = await api.get('/communications/upcoming')
      return response.data.slice(0, 5) // Get next 5 meetings
    }
  })

  // Fetch all meetings for calendar (separate from widget)
  const { data: allMeetings } = useQuery({
    queryKey: ['all-meetings'],
    queryFn: async () => {
      const response = await api.get('/communications/upcoming')
      return response.data // Get all meetings
    },
    enabled: showCalendar
  })

  // Fetch all tasks for calendar (separate from widget) 
  const { data: allTasks } = useQuery({
    queryKey: ['all-tasks'],
    queryFn: async () => {
      const response = await api.get('/tasks/unified?status=pending')
      return response.data // Get all tasks
    },
    enabled: showCalendar
  })


  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await api.get('/export/user-data', {
        responseType: 'blob',
      })
      
      // Create download link
      const blob = new Blob([response.data], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Extract filename from Content-Disposition header or use default
      const contentDisposition = response.headers['content-disposition']
      let filename = 'job-search-data.json'
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }
      
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    },
    onSuccess: () => {
      setIsExporting(false)
    },
    onError: (error) => {
      setIsExporting(false)
      console.error('Export failed:', error)
    },
  })

  const importMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/import', data)
      return response.data
    },
    onSuccess: (data) => {
      setIsImporting(false)
      // Invalidate all queries to refresh the data
      queryClient.invalidateQueries()
      alert(`Import successful! Created ${data.summary.contactsCreated} contacts, ${data.summary.communicationsCreated} interactions, ${data.summary.tasksCreated} tasks, and ${data.summary.followUpActionsCreated} follow-up actions.`)
    },
    onError: (error) => {
      setIsImporting(false)
      console.error('Import failed:', error)
      alert('Import failed. Please check the file format and try again.')
    },
  })

  const handleExport = () => {
    setIsExporting(true)
    exportMutation.mutate()
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        importMutation.mutate(data)
      } catch (error) {
        setIsImporting(false)
        alert('Invalid JSON file. Please check the file format.')
      }
    }
    reader.readAsText(file)
    
    // Reset file input
    event.target.value = ''
  }

  return (
    <Layout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              showCalendar 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📅 {showCalendar ? 'Hide' : 'Show'} Calendar
          </button>
        </div>

        {/* Calendar View */}
        {showCalendar && (
          <div className="mb-8">
            <Calendar 
              tasks={allTasks || []} 
              meetings={allMeetings || []}
              currentMonth={currentMonth}
              setCurrentMonth={setCurrentMonth}
              navigate={navigate}
            />
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Upcoming Meetings - Top Left */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Upcoming Meetings</h3>
              <button 
                onClick={() => navigate('/meetings')}
                className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
              >
                View All →
              </button>
            </div>
            {upcomingMeetings ? (
              <div className="space-y-3">
                {upcomingMeetings.length === 0 ? (
                  <p className="text-gray-500 text-center py-2">No upcoming meetings</p>
                ) : (
                  upcomingMeetings.map((meeting: any) => (
                    <div key={meeting.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                         onClick={() => navigate(`/contacts/${meeting.contact.id}`)}>
                      <div className="text-sm">
                        {meeting.type === 'MEETING' ? '🤝' : 
                         meeting.type === 'PHONE' ? '📞' : 
                         meeting.type === 'EMAIL' ? '📧' : 
                         meeting.type === 'LINKEDIN' ? '💼' : 
                         meeting.type === 'TEXT' ? '💬' : '🔗'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {meeting.subject || (meeting.type === 'MEETING' ? 'Meeting' : 
                                               meeting.type === 'PHONE' ? 'Phone Call' : 
                                               meeting.type === 'EMAIL' ? 'Email' : 
                                               meeting.type === 'LINKEDIN' ? 'LinkedIn' : 
                                               meeting.type === 'TEXT' ? 'Text/SMS' : 'Other')}
                        </p>
                        <p className="text-xs text-gray-500">
                          with {meeting.contact.name} • {
                            isToday(new Date(meeting.date)) ? 'Today' :
                            isTomorrow(new Date(meeting.date)) ? 'Tomorrow' :
                            format(new Date(meeting.date), 'MMM d')
                          } at {format(new Date(meeting.date), 'h:mm a')}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            )}
          </div>

          {/* Upcoming Tasks - Top Right */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Upcoming Tasks</h3>
              <button 
                onClick={() => navigate('/tasks')}
                className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
              >
                View All →
              </button>
            </div>
            {upcomingTasks ? (
              <div className="space-y-2">
                {upcomingTasks.length === 0 ? (
                  <p className="text-gray-500 text-center py-2">No pending tasks</p>
                ) : (
                  upcomingTasks.map((task) => (
                    <div key={task.id} 
                         className="flex items-start space-x-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                         onClick={() => {
                           if (task.type === 'manual' && !task.source) {
                             navigate('/tasks')
                           } else if (task.source?.type === 'contact' || task.type === 'followup') {
                             navigate(`/contacts/${task.source?.id}`)
                           } else if (task.source?.type === 'application') {
                             navigate('/applications') // or wherever applications are shown
                           }
                         }}>
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        task.dueDate && isPast(new Date(task.dueDate)) ? 'bg-red-500' :
                        task.dueDate && isToday(new Date(task.dueDate)) ? 'bg-orange-500' :
                        task.priority === 'HIGH' ? 'bg-red-400' :
                        task.priority === 'MEDIUM' ? 'bg-yellow-400' :
                        'bg-green-400'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {task.title}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          {task.dueDate && (
                            <span className={
                              isPast(new Date(task.dueDate)) ? 'text-red-600' :
                              isToday(new Date(task.dueDate)) ? 'text-orange-600' :
                              'text-gray-500'
                            }>
                              {isToday(new Date(task.dueDate)) ? 'Today' :
                               isTomorrow(new Date(task.dueDate)) ? 'Tomorrow' :
                               format(new Date(task.dueDate), 'MMM d')}
                            </span>
                          )}
                          {task.type === 'followup' && task.source && (
                            <span>• {task.source.name}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            )}
          </div>
          
          {/* Quick Stats - Bottom Left */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
            {stats ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Contacts</span>
                  <span className="font-semibold text-indigo-600">{stats.totalContacts}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Interactions</span>
                  <span className="font-semibold text-indigo-600">{stats.totalInteractions}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Outstanding Tasks</span>
                  <span className="font-semibold text-orange-600">{stats.outstandingTasks}</span>
                </div>
              </div>
            ) : (
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            )}
          </div>
          
          {/* Data Import/Export - Bottom Right */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Data Management</h3>
            <p className="text-gray-600 mb-4">Import or export your data</p>
            
            <div className="space-y-3">
              {/* Import */}
              <div>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  disabled={isImporting}
                  id="import-file"
                  className="hidden"
                />
                <label
                  htmlFor="import-file"
                  className={`w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2 cursor-pointer ${isImporting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isImporting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Importing...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                      </svg>
                      <span>Import Data</span>
                    </>
                  )}
                </label>
              </div>

              {/* Export */}
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isExporting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Export Data</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

