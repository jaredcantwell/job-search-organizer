import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'

interface CompanyFormProps {
  company?: any
  onClose?: () => void
  onSuccess?: () => void
}

export default function CompanyForm({ company, onClose, onSuccess }: CompanyFormProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEditing = !!company
  const isModal = !!onClose

  const [formData, setFormData] = useState({
    name: '',
    website: '',
    industry: '',
    size: '',
    location: '',
    description: '',
    notes: '',
    founded: '',
    status: '',
  })

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || '',
        website: company.website || '',
        industry: company.industry || '',
        size: company.size || '',
        location: company.location || '',
        description: company.description || '',
        notes: company.notes || '',
        founded: company.founded ? company.founded.toString() : '',
        status: company.status || '',
      })
    }
  }, [company])

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        founded: data.founded ? parseInt(data.founded) : undefined,
      }
      // Remove empty strings
      Object.keys(payload).forEach(key => {
        if (payload[key] === '') {
          delete payload[key]
        }
      })
      
      const response = await api.post('/companies', payload)
      return response.data
    },
    onSuccess: (newCompany) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      if (isModal && onSuccess) {
        onSuccess()
      } else {
        navigate(`/companies/${newCompany.id}`)
      }
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        founded: data.founded ? parseInt(data.founded) : undefined,
      }
      // Remove empty strings
      Object.keys(payload).forEach(key => {
        if (payload[key] === '') {
          delete payload[key]
        }
      })
      
      const response = await api.put(`/companies/${company.id}`, payload)
      return response.data
    },
    onSuccess: (updatedCompany) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] })
      queryClient.invalidateQueries({ queryKey: ['company', company.id] })
      if (isModal && onSuccess) {
        onSuccess()
      } else {
        navigate(`/companies/${updatedCompany.id}`)
      }
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isEditing) {
      updateMutation.mutate(formData)
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleCancel = () => {
    if (isModal && onClose) {
      onClose()
    } else {
      navigate('/companies')
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Company Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Company Name *
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Enter company name..."
        />
      </div>

      {/* Status */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Status
        </label>
        <select
          value={formData.status}
          onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">Select status...</option>
          <option value="OPPORTUNITY">Opportunity</option>
          <option value="TARGET">Target</option>
          <option value="RESEARCH">Research</option>
          <option value="WATCHING">Watching</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      {/* Website */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Website
        </label>
        <input
          type="url"
          value={formData.website}
          onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="https://..."
        />
      </div>

      {/* Industry and Size */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Industry
          </label>
          <input
            type="text"
            value={formData.industry}
            onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="e.g., Technology, Finance..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Company Size
          </label>
          <select
            value={formData.size}
            onChange={(e) => setFormData(prev => ({ ...prev, size: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Select size...</option>
            <option value="STARTUP">Startup (1-10)</option>
            <option value="SMALL">Small (11-50)</option>
            <option value="MEDIUM">Medium (51-200)</option>
            <option value="LARGE">Large (201-1000)</option>
            <option value="ENTERPRISE">Enterprise (1000+)</option>
            <option value="UNKNOWN">Unknown</option>
          </select>
        </div>
      </div>

      {/* Location and Founded */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Location
          </label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="e.g., San Francisco, CA"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Founded Year
          </label>
          <input
            type="number"
            min="1800"
            max={new Date().getFullYear()}
            value={formData.founded}
            onChange={(e) => setFormData(prev => ({ ...prev, founded: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="e.g., 2010"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={4}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Brief description of the company..."
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Personal notes about this company..."
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={handleCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading || !formData.name}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Saving...' : isEditing ? 'Update Company' : 'Create Company'}
        </button>
      </div>
    </form>
  )

  if (isModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {isEditing ? 'Edit Company' : 'Add Company'}
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {formContent}
          </div>
        </div>
      </div>
    )
  }

  return formContent
}