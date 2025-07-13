import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface ResearchFormProps {
  research?: any
  contactId?: string
  applicationId?: string
  companyId?: string
  onClose: () => void
  onSuccess: () => void
}

export default function ResearchForm({
  research,
  contactId,
  applicationId,
  companyId,
  onClose,
  onSuccess,
}: ResearchFormProps) {
  const queryClient = useQueryClient()
  const isEditing = !!research

  const [formData, setFormData] = useState({
    title: '',
    type: 'GENERAL' as const,
    summary: '',
    findings: [] as string[],
    notes: '',
    importance: 'MEDIUM' as const,
    tags: [] as string[],
  })

  const [newFinding, setNewFinding] = useState('')
  const [newTag, setNewTag] = useState('')
  const [links, setLinks] = useState<Array<{
    id?: string
    title: string
    url: string
    description?: string
    type: string
  }>>([])
  const [newLink, setNewLink] = useState({
    title: '',
    url: '',
    description: '',
    type: 'OTHER',
  })

  useEffect(() => {
    if (research) {
      setFormData({
        title: research.title || '',
        type: research.type || 'GENERAL',
        summary: research.summary || '',
        findings: research.findings || [],
        notes: research.notes || '',
        importance: research.importance || 'MEDIUM',
        tags: research.tags || [],
      })
      setLinks(research.links || [])
    }
  }, [research])

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        targetId: contactId || applicationId || companyId,
        targetType: contactId ? 'CONTACT' : applicationId ? 'APPLICATION' : companyId ? 'COMPANY' : undefined,
      }
      const response = await api.post('/research', payload)
      return response.data
    },
    onSuccess: async (newResearch) => {
      // Add links to the research item
      for (const link of links) {
        if (link.title && link.url) {
          await api.post(`/research/${newResearch.id}/links`, {
            title: link.title,
            url: link.url,
            description: link.description,
            type: link.type,
          })
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['research'] })
      if (contactId) {
        queryClient.invalidateQueries({ queryKey: ['research', 'contact', contactId] })
      }
      if (applicationId) {
        queryClient.invalidateQueries({ queryKey: ['research', 'application', applicationId] })
      }
      if (companyId) {
        queryClient.invalidateQueries({ queryKey: ['research', 'company', companyId] })
      }
      onSuccess()
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.put(`/research/${research.id}`, data)
      return response.data
    },
    onSuccess: async () => {
      // Update links
      const existingLinkIds = research.links?.map((l: any) => l.id) || []
      const newLinkIds = links.filter(l => l.id).map(l => l.id)
      
      // Delete removed links
      for (const linkId of existingLinkIds) {
        if (!newLinkIds.includes(linkId)) {
          await api.delete(`/research/${research.id}/links/${linkId}`)
        }
      }
      
      // Add or update links
      for (const link of links) {
        if (link.title && link.url) {
          if (link.id) {
            await api.put(`/research/${research.id}/links/${link.id}`, {
              title: link.title,
              url: link.url,
              description: link.description,
              type: link.type,
            })
          } else {
            await api.post(`/research/${research.id}/links`, {
              title: link.title,
              url: link.url,
              description: link.description,
              type: link.type,
            })
          }
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['research'] })
      if (contactId) {
        queryClient.invalidateQueries({ queryKey: ['research', 'contact', contactId] })
      }
      if (applicationId) {
        queryClient.invalidateQueries({ queryKey: ['research', 'application', applicationId] })
      }
      if (companyId) {
        queryClient.invalidateQueries({ queryKey: ['research', 'company', companyId] })
      }
      onSuccess()
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

  const addFinding = () => {
    if (newFinding.trim()) {
      setFormData(prev => ({
        ...prev,
        findings: [...prev.findings, newFinding.trim()]
      }))
      setNewFinding('')
    }
  }

  const removeFinding = (index: number) => {
    setFormData(prev => ({
      ...prev,
      findings: prev.findings.filter((_, i) => i !== index)
    }))
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag('')
    }
  }

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }))
  }

  const addLink = () => {
    if (newLink.title && newLink.url) {
      setLinks(prev => [...prev, { ...newLink }])
      setNewLink({ title: '', url: '', description: '', type: 'OTHER' })
    }
  }

  const removeLink = (index: number) => {
    setLinks(prev => prev.filter((_, i) => i !== index))
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {isEditing ? 'Edit Research' : 'Add Research'}
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

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Research title..."
              />
            </div>

            {/* Type and Importance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="GENERAL">General</option>
                  <option value="CONTACT">Contact</option>
                  <option value="COMPANY">Company</option>
                  <option value="INDUSTRY">Industry</option>
                  <option value="COMPETITIVE">Competitive</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Importance
                </label>
                <select
                  value={formData.importance}
                  onChange={(e) => setFormData(prev => ({ ...prev, importance: e.target.value as any }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>

            {/* Summary */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Summary
              </label>
              <textarea
                value={formData.summary}
                onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Brief summary of your research..."
              />
            </div>

            {/* Key Findings */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Key Findings
              </label>
              <div className="space-y-2">
                {formData.findings.map((finding, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600 flex-1">• {finding}</span>
                    <button
                      type="button"
                      onClick={() => removeFinding(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newFinding}
                    onChange={(e) => setNewFinding(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Add a key finding..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFinding())}
                  />
                  <button
                    type="button"
                    onClick={addFinding}
                    className="bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 text-sm"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Links */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Links
              </label>
              <div className="space-y-2">
                {links.map((link, index) => (
                  <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{link.title}</div>
                      <div className="text-xs text-gray-500 truncate">{link.url}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLink(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                
                <div className="border border-gray-200 rounded-lg p-3 space-y-2">
                  <input
                    type="text"
                    value={newLink.title}
                    onChange={(e) => setNewLink(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Link title..."
                  />
                  <input
                    type="url"
                    value={newLink.url}
                    onChange={(e) => setNewLink(prev => ({ ...prev, url: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="https://..."
                  />
                  <div className="flex space-x-2">
                    <select
                      value={newLink.type}
                      onChange={(e) => setNewLink(prev => ({ ...prev, type: e.target.value }))}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="OTHER">Other</option>
                      <option value="ARTICLE">Article</option>
                      <option value="VIDEO">Video</option>
                      <option value="SOCIAL">Social Media</option>
                      <option value="COMPANY_PAGE">Company Page</option>
                      <option value="NEWS">News</option>
                      <option value="GLASSDOOR">Glassdoor</option>
                      <option value="LINKEDIN">LinkedIn</option>
                      <option value="GITHUB">GitHub</option>
                    </select>
                    <button
                      type="button"
                      onClick={addLink}
                      className="bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 text-sm"
                    >
                      Add Link
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <div className="space-y-2">
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {formData.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1 text-gray-500 hover:text-gray-700"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Add a tag..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 text-sm"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Additional notes or details..."
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !formData.title}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Saving...' : isEditing ? 'Update Research' : 'Add Research'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}