import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import { api } from '@/lib/api'

interface TaskFormProps {
  task?: any // Would be the full task type if editing
  contactId?: string // For contact-specific tasks
  onClose: () => void
  onSuccess: () => void
}

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  category: z.enum(['APPLICATION', 'FOLLOW_UP', 'INTERVIEW_PREP', 'NETWORKING', 'RESUME', 'OTHER']),
})

type TaskFormData = z.infer<typeof taskSchema>

const categoryOptions = [
  { value: 'APPLICATION', label: 'Application' },
  { value: 'FOLLOW_UP', label: 'Follow Up' },
  { value: 'INTERVIEW_PREP', label: 'Interview Prep' },
  { value: 'NETWORKING', label: 'Networking' },
  { value: 'RESUME', label: 'Resume' },
  { value: 'OTHER', label: 'Other' },
]

export default function TaskForm({ task, contactId, onClose, onSuccess }: TaskFormProps) {
  const isEditing = !!task

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<TaskFormData>({
    defaultValues: {
      title: task?.title || '',
      description: task?.description || '',
      dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      priority: task?.priority || 'MEDIUM',
      category: task?.category || 'OTHER',
    },
  })

  const selectedPriority = watch('priority')

  const mutation = useMutation({
    mutationFn: async (data: TaskFormData) => {
      const payload = {
        ...data,
        dueDate: data.dueDate ? new Date(`${data.dueDate}T09:00:00`).toISOString() : undefined,
        ...(contactId && { contactId }),
      }

      if (isEditing) {
        await api.put(`/tasks/${task.id}`, payload)
      } else {
        await api.post('/tasks', payload)
      }
    },
    onSuccess: () => {
      onSuccess()
    },
  })

  const onSubmit = (data: TaskFormData) => {
    mutation.mutate(data)
  }

  const priorityOptions = [
    { value: 'LOW', label: 'Low', icon: '🟢', color: 'text-green-600 bg-green-50' },
    { value: 'MEDIUM', label: 'Medium', icon: '🟡', color: 'text-yellow-600 bg-yellow-50' },
    { value: 'HIGH', label: 'High', icon: '🔴', color: 'text-red-600 bg-red-50' },
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit Task' : 'New Task'}
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

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {mutation.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                {(mutation.error as any)?.response?.data?.error || 'An error occurred'}
              </p>
            </div>
          )}

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              {...register('title')}
              type="text"
              id="title"
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="What needs to be done?"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              {...register('category')}
              id="category"
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {categoryOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <div className="grid grid-cols-3 gap-2">
              {priorityOptions.map((option) => (
                <label key={option.value} className="relative">
                  <input
                    {...register('priority')}
                    type="radio"
                    value={option.value}
                    className="sr-only"
                  />
                  <div className={`p-3 rounded-lg border-2 cursor-pointer transition-all text-center ${
                    selectedPriority === option.value
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <div className="text-lg mb-1">{option.icon}</div>
                    <div className="text-sm font-medium">{option.label}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
              Due Date
            </label>
            <input
              {...register('dueDate')}
              type="date"
              id="dueDate"
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              {...register('description')}
              id="description"
              rows={3}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Any additional notes..."
            />
          </div>

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