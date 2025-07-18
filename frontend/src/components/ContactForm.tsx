import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { api } from '@/lib/api'

interface Contact {
  id: string
  name: string
  email: string | null
  phone: string | null
  companyId: string | null
  company: string | null
  position: string | null
  linkedinUrl: string | null
  notes: string | null
  type: string
}

interface ContactFormProps {
  contact?: Contact
  defaultCompanyId?: string
  mode?: 'modal' | 'page'
  onClose: () => void
  onSuccess: () => void
}

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Please enter a valid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  companyId: z.string().optional(),
  position: z.string().optional(),
  linkedinUrl: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  notes: z.string().optional(),
  type: z.enum(['RECRUITER', 'HIRING_MANAGER', 'REFERRAL', 'COLLEAGUE', 'OTHER']).default('OTHER'),
})

type ContactFormData = z.infer<typeof contactSchema>

export default function ContactForm({ contact, defaultCompanyId, mode = 'modal', onClose, onSuccess }: ContactFormProps) {
  const queryClient = useQueryClient()
  const isEditing = !!contact

  // Fetch companies for dropdown
  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const response = await api.get('/companies')
      return response.data
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormData>({
    defaultValues: {
      name: contact?.name || '',
      email: contact?.email || '',
      phone: contact?.phone || '',
      companyId: contact?.companyId || defaultCompanyId || '',
      position: contact?.position || '',
      linkedinUrl: contact?.linkedinUrl || '',
      notes: contact?.notes || '',
      type: contact?.type || 'OTHER',
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: ContactFormData) => {
      if (isEditing) {
        await api.put(`/contacts/${contact.id}`, data)
      } else {
        await api.post('/contacts', data)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      onSuccess()
      reset()
    },
  })

  useEffect(() => {
    if (contact) {
      reset({
        name: contact.name,
        email: contact.email || '',
        phone: contact.phone || '',
        companyId: contact.companyId || '',
        position: contact.position || '',
        linkedinUrl: contact.linkedinUrl || '',
        notes: contact.notes || '',
        type: contact.type || 'OTHER',
      })
    }
  }, [contact, reset])

  const onSubmit = (data: ContactFormData) => {
    try {
      contactSchema.parse(data)
      mutation.mutate(data)
    } catch (error) {
      console.error('Validation error:', error)
    }
  }

  const formContent = (
    <>
      {mode === 'modal' && (
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit Contact' : 'New Contact'}
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
      )}

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {mutation.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                {(mutation.error as any)?.response?.data?.error || 'An error occurred'}
              </p>
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              {...register('name')}
              type="text"
              id="name"
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="John Doe"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                {...register('email')}
                type="email"
                id="email"
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="john@company.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                {...register('phone')}
                type="tel"
                id="phone"
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="companyId" className="block text-sm font-medium text-gray-700 mb-1">
                Company
              </label>
              <select
                {...register('companyId')}
                id="companyId"
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select a company...</option>
                {companies?.map((company: any) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">
                Position
              </label>
              <input
                {...register('position')}
                type="text"
                id="position"
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Software Engineer"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                Contact Type
              </label>
              <select
                {...register('type')}
                id="type"
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="OTHER">Other</option>
                <option value="RECRUITER">Recruiter</option>
                <option value="HIRING_MANAGER">Hiring Manager</option>
                <option value="REFERRAL">Referral</option>
                <option value="COLLEAGUE">Colleague</option>
              </select>
            </div>

            <div>
              <label htmlFor="linkedinUrl" className="block text-sm font-medium text-gray-700 mb-1">
                LinkedIn URL
              </label>
              <input
                {...register('linkedinUrl')}
                type="url"
                id="linkedinUrl"
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="https://linkedin.com/in/johndoe"
              />
              {errors.linkedinUrl && (
                <p className="mt-1 text-sm text-red-600">{errors.linkedinUrl.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              {...register('notes')}
              id="notes"
              rows={3}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Any additional notes about this contact..."
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
    </>
  )

  if (mode === 'modal') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
          {formContent}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {formContent}
    </div>
  )
}