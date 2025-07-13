import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { api } from '@/lib/api'

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

interface InteractionFormProps {
  contactId: string
  interaction?: Communication
  onClose: () => void
  onSuccess: () => void
}

const interactionSchema = z.object({
  type: z.enum(['EMAIL', 'PHONE', 'LINKEDIN', 'TEXT', 'MEETING', 'OTHER']),
  subject: z.string().optional(),
  content: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  time: z.string().optional(),
  duration: z.number().optional(),
  location: z.string().optional(),
  followUpActions: z.array(z.object({
    id: z.string().optional(), // For tracking existing actions
    description: z.string().min(1, 'Description is required'),
    dueDate: z.string().optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  })).optional(),
})

type InteractionFormData = z.infer<typeof interactionSchema>

const communicationTypes = [
  { value: 'MEETING', label: 'Meeting', icon: '🤝' },
  { value: 'PHONE', label: 'Phone Call', icon: '📞' },
  { value: 'EMAIL', label: 'Email', icon: '📧' },
  { value: 'LINKEDIN', label: 'LinkedIn', icon: '💼' },
  { value: 'TEXT', label: 'Text/SMS', icon: '💬' },
  { value: 'OTHER', label: 'Other', icon: '🔗' },
]

export default function InteractionForm({ contactId, interaction, onClose, onSuccess }: InteractionFormProps) {
  const queryClient = useQueryClient()
  const isEditing = !!interaction
  const [showFollowUpActions, setShowFollowUpActions] = useState(true)

  const formatDateForInput = (dateString: string) => {
    const date = new Date(dateString)
    return date.toISOString().split('T')[0]
  }

  const formatTimeForInput = (dateString: string) => {
    const date = new Date(dateString)
    return date.toTimeString().slice(0, 5)
  }

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    watch,
  } = useForm<InteractionFormData>({
    defaultValues: {
      type: interaction?.type as any || 'MEETING',
      subject: interaction?.subject || '',
      content: interaction?.content || '',
      date: interaction ? formatDateForInput(interaction.date) : new Date().toISOString().split('T')[0],
      time: interaction ? formatTimeForInput(interaction.date) : '09:00',
      duration: interaction?.duration || 60,
      location: interaction?.location || '',
      followUpActions: interaction?.followUpActions?.map(action => ({
        id: action.id, // Track the ID so we know this is existing
        description: action.description,
        dueDate: action.dueDate ? formatDateForInput(action.dueDate) : '',
        priority: action.priority as any,
      })) || [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'followUpActions',
  })

  const selectedType = watch('type')

  const mutation = useMutation({
    mutationFn: async (data: InteractionFormData) => {
      const datetime = new Date(`${data.date}T${data.time || '09:00'}:00`)
      
      if (isEditing) {
        // For editing, update communication details
        const updatePayload = {
          type: data.type,
          subject: data.subject || undefined,
          content: data.content || undefined,
          date: datetime.toISOString(),
          duration: data.duration || undefined,
          location: data.location || undefined,
        }
        await api.put(`/communications/${interaction.id}`, updatePayload)
        
        // Handle follow-up actions CRUD operations
        const formActions = data.followUpActions?.filter(action => action.description.trim()) || []
        const originalActions = interaction?.followUpActions || []
        
        // Create new actions (those without ID)
        const newActions = formActions.filter(action => !action.id)
        for (const action of newActions) {
          await api.post(`/communications/${interaction.id}/follow-up-actions`, {
            description: action.description,
            dueDate: action.dueDate ? new Date(`${action.dueDate}T09:00:00`).toISOString() : undefined,
            priority: action.priority,
          })
        }
        
        // Update existing actions (those with ID)
        const existingActions = formActions.filter(action => action.id)
        for (const action of existingActions) {
          const original = originalActions.find(orig => orig.id === action.id)
          if (original) {
            // Check if action was modified
            const originalDate = original.dueDate ? new Date(original.dueDate).toISOString().split('T')[0] : ''
            const hasChanged = 
              original.description !== action.description ||
              originalDate !== action.dueDate ||
              original.priority !== action.priority
            
            if (hasChanged) {
              await api.put(`/communications/follow-up-actions/${action.id}`, {
                description: action.description,
                dueDate: action.dueDate ? new Date(`${action.dueDate}T09:00:00`).toISOString() : null,
                priority: action.priority,
              })
            }
          }
        }
        
        // Delete removed actions (those in original but not in form)
        const formActionIds = new Set(existingActions.map(action => action.id))
        const actionsToDelete = originalActions.filter(action => !formActionIds.has(action.id))
        for (const action of actionsToDelete) {
          await api.delete(`/communications/follow-up-actions/${action.id}`)
        }
      } else {
        // For creating, include follow-up actions
        const createPayload = {
          contactId,
          type: data.type,
          subject: data.subject || undefined,
          content: data.content || undefined,
          date: datetime.toISOString(),
          duration: data.duration || undefined,
          location: data.location || undefined,
          followUpActions: data.followUpActions?.filter(action => action.description.trim())
            .map(action => ({
              description: action.description,
              dueDate: action.dueDate ? new Date(`${action.dueDate}T09:00:00`).toISOString() : undefined,
              priority: action.priority,
            })) || [],
        }
        await api.post('/communications', createPayload)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications', contactId] })
      queryClient.invalidateQueries({ queryKey: ['contact', contactId] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['upcoming-meetings'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      onSuccess()
    },
  })

  const onSubmit = (data: InteractionFormData) => {
    mutation.mutate(data)
  }

  const addFollowUpAction = () => {
    append({
      // No id - this marks it as a new action
      description: '',
      dueDate: '',
      priority: 'MEDIUM',
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit Interaction' : 'New Interaction'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {mutation.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                {(mutation.error as any)?.response?.data?.error || 'An error occurred'}
              </p>
              {(mutation.error as any)?.response?.data?.details && (
                <details className="mt-2">
                  <summary className="text-xs text-red-600 cursor-pointer">View details</summary>
                  <pre className="text-xs text-red-600 mt-1 whitespace-pre-wrap">
                    {JSON.stringify((mutation.error as any)?.response?.data?.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}

          {/* Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {communicationTypes.map((type) => (
                <label key={type.value} className="relative">
                  <input
                    {...register('type')}
                    type="radio"
                    value={type.value}
                    className="sr-only"
                  />
                  <div className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedType === type.value
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <div className="text-center">
                      <div className="text-lg mb-1">{type.icon}</div>
                      <div className="text-sm font-medium">{type.label}</div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                Date *
              </label>
              <input
                {...register('date')}
                type="date"
                id="date"
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {errors.date && (
                <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">
                Time
              </label>
              <input
                {...register('time')}
                type="time"
                id="time"
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Duration and Location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
                Duration (minutes)
              </label>
              <input
                {...register('duration', { valueAsNumber: true })}
                type="number"
                id="duration"
                min="1"
                placeholder="60"
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                {...register('location')}
                type="text"
                id="location"
                placeholder="Coffee shop, Zoom, etc."
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Subject (for emails/calls) */}
          {(selectedType === 'EMAIL' || selectedType === 'PHONE') && (
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                Subject
              </label>
              <input
                {...register('subject')}
                type="text"
                id="subject"
                placeholder="Brief description"
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              {...register('content')}
              id="content"
              rows={4}
              placeholder="What was discussed? Key takeaways?"
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            {errors.content && (
              <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
            )}
          </div>

          {/* Follow-up Actions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Follow-up Actions
              </label>
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setShowFollowUpActions(!showFollowUpActions)}
                  className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                >
                  {showFollowUpActions ? 'Hide' : 'Add Follow-ups'}
                </button>
              )}
            </div>

            {showFollowUpActions && (
              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 space-y-2">
                      <input
                        {...register(`followUpActions.${index}.description`)}
                        type="text"
                        placeholder="What needs to be done?"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <div className="flex space-x-2">
                        <input
                          {...register(`followUpActions.${index}.dueDate`)}
                          type="date"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <select
                          {...register(`followUpActions.${index}.priority`)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                        </select>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="text-red-600 hover:text-red-700 p-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addFollowUpAction}
                  className="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-colors"
                >
                  + Add Follow-up Action
                </button>
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {mutation.isPending 
                ? (isEditing ? 'Updating...' : 'Creating...') 
                : (isEditing ? 'Update' : 'Create')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}