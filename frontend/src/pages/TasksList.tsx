import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import Layout from '@/components/Layout'
import TaskForm from '@/components/TaskForm'
import Calendar from '@/components/Calendar'
import { format, isToday, isTomorrow, isThisWeek, isPast, isAfter } from 'date-fns'

interface UnifiedTask {
  id: string
  type: 'manual' | 'followup'
  title: string
  description: string | null
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  dueDate: string | null
  completed: boolean
  category: string
  createdAt: string
  source: {
    type: 'contact' | 'application'
    id: string
    name: string
    interactionDate?: string
    interactionType?: string
  } | null
}

const priorityConfig = {
  HIGH: { icon: '🔴', label: 'High', color: 'text-red-600 bg-red-50' },
  MEDIUM: { icon: '🟡', label: 'Medium', color: 'text-yellow-600 bg-yellow-50' },
  LOW: { icon: '🟢', label: 'Low', color: 'text-green-600 bg-green-50' },
}

const categoryLabels = {
  APPLICATION: 'Application',
  FOLLOW_UP: 'Follow Up',
  INTERVIEW_PREP: 'Interview Prep',
  NETWORKING: 'Networking',
  RESUME: 'Resume',
  OTHER: 'Other',
}

export default function TasksList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<any>(null)
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'manual' | 'followup'>('all')
  const [selectedPriority, setSelectedPriority] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'completed'>('pending')
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', 'unified', selectedFilter, selectedPriority, selectedStatus],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedFilter !== 'all') params.append('filter', selectedFilter)
      if (selectedPriority !== 'all') params.append('priority', selectedPriority)
      if (selectedStatus !== 'all') params.append('status', selectedStatus)
      
      const response = await api.get(`/tasks/unified?${params}`)
      return response.data as UnifiedTask[]
    },
  })

  const toggleTaskMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: 'manual' | 'followup' }) => {
      if (type === 'manual') {
        await api.patch(`/tasks/${id}/toggle`)
      } else {
        // For follow-up actions, we need to update via the communications endpoint
        await api.put(`/communications/follow-up-actions/${id}`, { 
          completed: !tasks?.find(t => t.id === id)?.completed 
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['communications'] })
    },
  })

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/tasks/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const groupTasksByDate = (tasks: UnifiedTask[]) => {
    const groups: Record<string, UnifiedTask[]> = {
      overdue: [],
      today: [],
      tomorrow: [],
      thisWeek: [],
      later: [],
    }

    tasks.forEach(task => {
      if (!task.dueDate) {
        groups.later.push(task)
        return
      }

      const dueDate = new Date(task.dueDate)
      if (isPast(dueDate) && !isToday(dueDate)) {
        groups.overdue.push(task)
      } else if (isToday(dueDate)) {
        groups.today.push(task)
      } else if (isTomorrow(dueDate)) {
        groups.tomorrow.push(task)
      } else if (isThisWeek(dueDate) && isAfter(dueDate, new Date())) {
        groups.thisWeek.push(task)
      } else {
        groups.later.push(task)
      }
    })

    return groups
  }

  const formatTaskDate = (dateString: string) => {
    const date = new Date(dateString)
    if (isToday(date)) return 'Today'
    if (isTomorrow(date)) return 'Tomorrow'
    return format(date, 'MMM d')
  }

  const formatSourceInfo = (task: UnifiedTask) => {
    if (!task.source) return null
    
    if (task.source.type === 'contact' && task.source.interactionDate) {
      const interactionDate = format(new Date(task.source.interactionDate), 'MMM d')
      return `From ${task.source.interactionType?.toLowerCase() || 'interaction'} with ${task.source.name} on ${interactionDate}`
    }
    
    return `From ${task.source.name}`
  }

  const handleTaskClick = async (task: UnifiedTask) => {
    if (task.type === 'followup' && task.source) {
      // Navigate to the contact page for follow-up tasks
      navigate(`/contacts/${task.source.id}`)
    } else if (task.type === 'manual') {
      // Fetch the full task details and open edit modal
      try {
        const response = await api.get(`/tasks/${task.id}`)
        setEditingTask(response.data)
      } catch (error) {
        console.error('Failed to fetch task details:', error)
      }
    }
  }

  const TaskItem = ({ task }: { task: UnifiedTask }) => (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${task.completed ? 'opacity-60' : ''}`}>
      <div className="flex items-start space-x-3">
        <button
          onClick={() => toggleTaskMutation.mutate({ id: task.id, type: task.type })}
          className="mt-0.5 flex-shrink-0"
          disabled={toggleTaskMutation.isPending}
        >
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            task.completed 
              ? 'bg-green-500 border-green-500' 
              : 'border-gray-300 hover:border-gray-400'
          }`}>
            {task.completed && (
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 
                className={`text-sm font-medium text-gray-900 cursor-pointer hover:text-indigo-600 transition-colors inline-flex items-center gap-1 ${task.completed ? 'line-through' : ''}`}
                onClick={() => handleTaskClick(task)}
              >
                {task.title}
                {task.type === 'followup' && (
                  <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                )}
              </h3>
              
              <div className="mt-1 flex items-center flex-wrap gap-2 text-xs">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full ${priorityConfig[task.priority].color}`}>
                  {priorityConfig[task.priority].icon} {priorityConfig[task.priority].label}
                </span>
                
                {task.dueDate && (
                  <span className={`text-gray-500 ${isPast(new Date(task.dueDate)) && !task.completed ? 'text-red-600' : ''}`}>
                    Due {formatTaskDate(task.dueDate)}
                  </span>
                )}
                
                {task.type === 'manual' && (
                  <span className="text-gray-500">
                    {categoryLabels[task.category as keyof typeof categoryLabels] || task.category}
                  </span>
                )}
              </div>

              {task.source && (
                <p className="mt-1 text-xs text-gray-500">
                  {formatSourceInfo(task)}
                </p>
              )}

              {task.description && (
                <p className="mt-2 text-sm text-gray-600">
                  {task.description}
                </p>
              )}
            </div>

            {task.type === 'manual' && (
              <button
                onClick={() => deleteTaskMutation.mutate(task.id)}
                className="ml-2 text-gray-400 hover:text-red-600 transition-colors"
                disabled={deleteTaskMutation.isPending}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <Layout>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  const groupedTasks = groupTasksByDate(tasks || [])

  return (
    <Layout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <div className="flex items-center space-x-4">
            {/* View Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setView('list')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  view === 'list'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📋 List
              </button>
              <button
                onClick={() => setView('calendar')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  view === 'calendar'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📅 Calendar
              </button>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              + New Task
            </button>
          </div>
        </div>

        {/* Filters (only show in list view) */}
        {view === 'list' && (
          <div className="mb-6 space-y-4">
            <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value as any)}
                className="block w-40 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All Tasks</option>
                <option value="manual">Manual Only</option>
                <option value="followup">Follow-ups Only</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="block w-40 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All Priorities</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as any)}
                className="block w-40 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          </div>
        )}

        {/* Calendar or List View */}
        {view === 'calendar' ? (
          <Calendar 
            tasks={tasks || []} 
            currentMonth={currentMonth}
            setCurrentMonth={setCurrentMonth}
            navigate={navigate}
            onTaskClick={handleTaskClick}
            onTaskToggle={(task) => toggleTaskMutation.mutate({ id: task.id, type: task.type })}
            showTaskCheckboxes={true}
          />
        ) : (
          <div className="space-y-6">
            {groupedTasks.overdue.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-red-600 mb-3">Overdue ({groupedTasks.overdue.length})</h2>
              <div className="space-y-3">
                {groupedTasks.overdue.map(task => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </div>
            </div>
          )}

          {groupedTasks.today.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Today ({groupedTasks.today.length})</h2>
              <div className="space-y-3">
                {groupedTasks.today.map(task => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </div>
            </div>
          )}

          {groupedTasks.tomorrow.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Tomorrow ({groupedTasks.tomorrow.length})</h2>
              <div className="space-y-3">
                {groupedTasks.tomorrow.map(task => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </div>
            </div>
          )}

          {groupedTasks.thisWeek.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">This Week ({groupedTasks.thisWeek.length})</h2>
              <div className="space-y-3">
                {groupedTasks.thisWeek.map(task => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </div>
            </div>
          )}

          {groupedTasks.later.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Later ({groupedTasks.later.length})</h2>
              <div className="space-y-3">
                {groupedTasks.later.map(task => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </div>
            </div>
          )}

          {tasks?.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new task or adding follow-ups to your interactions.
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                + New Task
              </button>
            </div>
          )}
          </div>
        )}

        {/* Task Form Modal */}
        {(isCreateModalOpen || editingTask) && (
          <TaskForm
            task={editingTask}
            onClose={() => {
              setIsCreateModalOpen(false)
              setEditingTask(null)
            }}
            onSuccess={() => {
              setIsCreateModalOpen(false)
              setEditingTask(null)
              queryClient.invalidateQueries({ queryKey: ['tasks'] })
            }}
          />
        )}
      </div>
    </Layout>
  )
}

