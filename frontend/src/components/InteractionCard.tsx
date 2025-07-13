import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import InteractionForm from './InteractionForm'

interface Communication {
  id: string
  contactId: string
  type: string
  subject: string | null
  content: string
  date: string
  duration: number | null
  location: string | null
  followUpActions: FollowUpAction[]
}

interface FollowUpAction {
  id: string
  description: string
  dueDate: string | null
  completed: boolean
  priority: string
}

interface InteractionCardProps {
  interaction: Communication
  onEdit?: () => void
}

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

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'HIGH': return 'text-red-600 bg-red-50'
    case 'MEDIUM': return 'text-yellow-600 bg-yellow-50'
    case 'LOW': return 'text-green-600 bg-green-50'
    default: return 'text-gray-600 bg-gray-50'
  }
}

export default function InteractionCard({ interaction, onEdit }: InteractionCardProps) {
  const queryClient = useQueryClient()
  const [showDetails, setShowDetails] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 })

  // Calculate dropdown position when opened
  useEffect(() => {
    if (showDeleteConfirm && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8,
        right: window.innerWidth - rect.right - window.scrollX
      })
    }
  }, [showDeleteConfirm])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setShowDeleteConfirm(false)
      }
    }

    if (showDeleteConfirm) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDeleteConfirm])

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/communications/${interaction.id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications', interaction.contactId] })
      queryClient.invalidateQueries({ queryKey: ['contact', interaction.contactId] })
    },
  })

  const toggleFollowUpMutation = useMutation({
    mutationFn: async ({ actionId, completed }: { actionId: string; completed: boolean }) => {
      await api.put(`/communications/follow-up-actions/${actionId}`, { completed })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications', interaction.contactId] })
    },
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const pendingActions = interaction.followUpActions.filter(action => !action.completed)
  const completedActions = interaction.followUpActions.filter(action => action.completed)

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="text-xl">{getTypeIcon(interaction.type)}</div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-semibold text-gray-900">
                  {getTypeLabel(interaction.type)}
                </h3>
                <span className="text-sm text-gray-500">
                  {formatDate(interaction.date)} • {formatTime(interaction.date)}
                </span>
              </div>
              
              {interaction.subject && (
                <p className="text-sm text-gray-600 mb-2">{interaction.subject}</p>
              )}
              
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                {interaction.duration && (
                  <span>⏱️ {interaction.duration} min</span>
                )}
                {interaction.location && (
                  <span>📍 {interaction.location}</span>
                )}
              </div>

              {interaction.followUpActions.length > 0 && (
                <div className="mt-2 flex items-center space-x-2 text-sm">
                  <span className="text-gray-500">Follow-ups:</span>
                  {pendingActions.length > 0 && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">
                      {pendingActions.length} pending
                    </span>
                  )}
                  {completedActions.length > 0 && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                      {completedActions.length} completed
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className={`w-5 h-5 transition-transform ${showDetails ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            <div className="relative">
              <button
                ref={buttonRef}
                onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {showDetails && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Notes</h4>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{interaction.content}</p>
              </div>

              {interaction.followUpActions.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Follow-up Actions</h4>
                  <div className="space-y-2">
                    {interaction.followUpActions.map((action) => (
                      <div key={action.id} className="flex items-start space-x-3 p-2 bg-gray-50 rounded">
                        <button
                          onClick={() => toggleFollowUpMutation.mutate({ actionId: action.id, completed: !action.completed })}
                          className="mt-0.5 flex-shrink-0"
                        >
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                            action.completed 
                              ? 'bg-green-500 border-green-500' 
                              : 'border-gray-300 hover:border-gray-400'
                          }`}>
                            {action.completed && (
                              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${action.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                            {action.description}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(action.priority)}`}>
                              {action.priority.toLowerCase()}
                            </span>
                            {action.dueDate && (
                              <span className="text-xs text-gray-500">
                                Due: {formatDate(action.dueDate)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showEditModal && (
        <InteractionForm
          contactId={interaction.contactId}
          interaction={interaction}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false)
            if (onEdit) onEdit()
          }}
        />
      )}

      {/* Portal for dropdown to render outside card */}
      {showDeleteConfirm && createPortal(
        <div
          ref={dropdownRef}
          className="fixed w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
          style={{
            top: dropdownPosition.top,
            right: dropdownPosition.right,
          }}
        >
          <div className="p-3">
            <div className="flex space-x-2 mb-2">
              <button
                onClick={() => {
                  setShowEditModal(true)
                  setShowDeleteConfirm(false)
                }}
                className="flex-1 text-sm text-gray-700 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100"
              >
                Edit
              </button>
            </div>
            <div className="border-t border-gray-200 pt-2">
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="w-full bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}