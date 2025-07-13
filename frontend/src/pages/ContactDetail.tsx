import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import Layout from '@/components/Layout'
import ContactForm from '@/components/ContactForm'
import InteractionForm from '@/components/InteractionForm'
import InteractionCard from '@/components/InteractionCard'
import TaskForm from '@/components/TaskForm'
import ResearchForm from '@/components/ResearchForm'

interface Contact {
  id: string
  name: string
  email: string | null
  phone: string | null
  linkedinUrl: string | null
  notes: string | null
  company: string | null
  companyId: string | null
  companyRef?: {
    id: string
    name: string
  }
  position: string | null
  type: string
  lastContact: string | null
  createdAt: string
  updatedAt: string
}

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isInteractionModalOpen, setIsInteractionModalOpen] = useState(false)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<any>(null)
  const [isResearchModalOpen, setIsResearchModalOpen] = useState(false)
  const [editingResearch, setEditingResearch] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'interactions' | 'tasks' | 'research'>('overview')

  const { data: contact, isLoading, error } = useQuery({
    queryKey: ['contact', id],
    queryFn: async () => {
      const response = await api.get(`/contacts/${id}?include=company`)
      return response.data as Contact
    },
  })

  const { data: communications, isLoading: communicationsLoading } = useQuery({
    queryKey: ['communications', id],
    queryFn: async () => {
      const response = await api.get(`/communications/contact/${id}`)
      return response.data
    },
    enabled: !!id,
  })

  const { data: research, isLoading: researchLoading } = useQuery({
    queryKey: ['research', 'contact', id],
    queryFn: async () => {
      const response = await api.get(`/research/contact/${id}`)
      return response.data
    },
    enabled: !!id,
  })

  const { data: contactTasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['contact-tasks', id],
    queryFn: async () => {
      const response = await api.get(`/tasks/contact/${id}`)
      return response.data
    },
    enabled: !!id,
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/contacts/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      navigate('/contacts')
    },
  })

  const toggleTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await api.patch(`/tasks/${taskId}/toggle`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-tasks', id] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await api.delete(`/tasks/${taskId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-tasks', id] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const deleteResearchMutation = useMutation({
    mutationFn: async (researchId: string) => {
      await api.delete(`/research/${researchId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['research', 'contact', id] })
      queryClient.invalidateQueries({ queryKey: ['research'] })
    },
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </Layout>
    )
  }

  if (error || !contact) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center py-8">
            <p className="text-red-600">Contact not found</p>
            <Link to="/contacts" className="text-indigo-600 hover:text-indigo-700 mt-2 inline-block">
              ← Back to contacts
            </Link>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Link
              to="/contacts"
              className="mr-4 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">{contact.name}</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Edit
            </button>
            <div className="relative">
              <button
                onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
              {showDeleteConfirm && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                  <div className="p-4">
                    <p className="text-sm text-gray-700 mb-3">Delete this contact?</p>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => deleteMutation.mutate()}
                        disabled={deleteMutation.isPending}
                        className="flex-1 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {[
                { id: 'overview', name: 'Overview', icon: '👤' },
                { id: 'interactions', name: 'Interactions', icon: '💬' },
                { id: 'tasks', name: 'Tasks', icon: '✅' },
                { id: 'research', name: 'Research', icon: '🔍' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <p className="text-sm text-gray-900">{contact.name}</p>
                  </div>

                  {contact.email && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <a href={`mailto:${contact.email}`} className="text-sm text-indigo-600 hover:text-indigo-700">
                        {contact.email}
                      </a>
                    </div>
                  )}

                  {contact.phone && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <a href={`tel:${contact.phone}`} className="text-sm text-indigo-600 hover:text-indigo-700">
                        {contact.phone}
                      </a>
                    </div>
                  )}

                  {(contact.companyRef?.name || contact.company) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                      {contact.companyRef ? (
                        <Link
                          to={`/companies/${contact.companyRef.id}`}
                          className="text-sm text-indigo-600 hover:text-indigo-700"
                        >
                          {contact.companyRef.name}
                        </Link>
                      ) : (
                        <p className="text-sm text-gray-900">{contact.company}</p>
                      )}
                    </div>
                  )}

                  {contact.position && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                      <p className="text-sm text-gray-900">{contact.position}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Type</label>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-800">
                      {contact.type?.toLowerCase().replace('_', ' ') || 'other'}
                    </span>
                  </div>

                  {contact.linkedinUrl && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn</label>
                      <a
                        href={contact.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                        View Profile
                        <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Added</label>
                    <p className="text-sm text-gray-900">{formatDate(contact.createdAt)}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
                    <p className="text-sm text-gray-900">{formatDate(contact.updatedAt)}</p>
                  </div>
                </div>

                {contact.notes && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{contact.notes}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'interactions' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Interaction History</h2>
                  <button
                    onClick={() => setIsInteractionModalOpen(true)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    + New Interaction
                  </button>
                </div>

                {communicationsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="text-gray-500 mt-2">Loading interactions...</p>
                  </div>
                ) : !communications?.length ? (
                  <div className="text-center py-8">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No interactions yet</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Start tracking your conversations with this contact.
                    </p>
                    <button
                      onClick={() => setIsInteractionModalOpen(true)}
                      className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      + Add First Interaction
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {communications.map((communication: any) => (
                      <InteractionCard
                        key={communication.id}
                        interaction={communication}
                        onEdit={() => {
                          queryClient.invalidateQueries({ queryKey: ['communications', id] })
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'tasks' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Next Steps & Reminders</h2>
                  <button
                    onClick={() => setIsTaskModalOpen(true)}
                    className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                  >
                    + Add Task
                  </button>
                </div>
                
                {tasksLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="text-gray-500 mt-2">Loading tasks...</p>
                  </div>
                ) : !contactTasks?.length ? (
                  <div className="text-center py-8">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks yet</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Add your first task or reminder for this contact.
                    </p>
                    <button
                      onClick={() => setIsTaskModalOpen(true)}
                      className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                    >
                      + Add First Task
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {contactTasks.map((task: any) => (
                      <div key={task.id} className={`flex items-center justify-between p-3 rounded-lg border ${task.completed ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300'}`}>
                        <div className="flex items-start space-x-3">
                          <button
                            onClick={() => toggleTaskMutation.mutate(task.id)}
                            className="mt-0.5 flex-shrink-0"
                          >
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                              task.completed 
                                ? 'bg-green-500 border-green-500' 
                                : 'border-gray-300 hover:border-gray-400'
                            }`}>
                              {task.completed && (
                                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${task.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                              {task.title}
                            </p>
                            {task.description && (
                              <p className={`text-sm mt-1 ${task.completed ? 'text-gray-400' : 'text-gray-600'}`}>
                                {task.description}
                              </p>
                            )}
                            <div className="flex items-center space-x-2 mt-1">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
                                task.priority === 'HIGH' 
                                  ? 'bg-red-100 text-red-800' 
                                  : task.priority === 'MEDIUM'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {task.priority.toLowerCase()}
                              </span>
                              {task.dueDate && (
                                <span className="text-xs text-gray-500">
                                  Due: {new Date(task.dueDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setEditingTask(task)
                              setIsTaskModalOpen(true)
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteTaskMutation.mutate(task.id)}
                            className="text-gray-400 hover:text-red-600"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'research' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Research</h2>
                  <button
                    onClick={() => setIsResearchModalOpen(true)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    + Add Research
                  </button>
                </div>

                {researchLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="text-gray-500 mt-2">Loading research...</p>
                  </div>
                ) : !research?.length ? (
                  <div className="text-center py-8">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No research yet</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Start tracking research about this contact.
                    </p>
                    <button
                      onClick={() => setIsResearchModalOpen(true)}
                      className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      + Add First Research Item
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {research.map((item: any) => (
                      <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-base font-medium text-gray-900 mb-2">{item.title}</h3>
                            {item.summary && (
                              <p className="text-sm text-gray-600 mb-3">{item.summary}</p>
                            )}
                            
                            {item.findings?.length > 0 && (
                              <div className="mb-3">
                                <h4 className="text-sm font-medium text-gray-700 mb-1">Key Findings:</h4>
                                <ul className="text-sm text-gray-600 space-y-1">
                                  {item.findings.map((finding: string, index: number) => (
                                    <li key={index} className="flex items-start">
                                      <span className="mr-2">•</span>
                                      <span>{finding}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {item.links?.length > 0 && (
                              <div className="mb-3">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Links:</h4>
                                <div className="space-y-1">
                                  {item.links.map((link: any) => (
                                    <a
                                      key={link.id}
                                      href={link.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center"
                                    >
                                      🔗 {link.title}
                                      <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                      </svg>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}

                            {item.tags?.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {item.tags.map((tag: string, index: number) => (
                                  <span
                                    key={index}
                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-800"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2 ml-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
                              item.importance === 'HIGH' || item.importance === 'URGENT'
                                ? 'bg-red-100 text-red-800'
                                : item.importance === 'MEDIUM'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {item.importance.toLowerCase()}
                            </span>
                            <button 
                              onClick={() => {
                                setEditingResearch(item)
                                setIsResearchModalOpen(true)
                              }}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button 
                              onClick={() => deleteResearchMutation.mutate(item.id)}
                              className="text-gray-400 hover:text-red-600"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Edit Modal */}
        {isEditModalOpen && (
          <ContactForm
            contact={contact}
            onClose={() => setIsEditModalOpen(false)}
            onSuccess={() => {
              setIsEditModalOpen(false)
              queryClient.invalidateQueries({ queryKey: ['contact', id] })
            }}
          />
        )}

        {/* Interaction Modal */}
        {isInteractionModalOpen && (
          <InteractionForm
            contactId={id!}
            onClose={() => setIsInteractionModalOpen(false)}
            onSuccess={() => {
              setIsInteractionModalOpen(false)
              queryClient.invalidateQueries({ queryKey: ['communications', id] })
            }}
          />
        )}

        {/* Task Modal */}
        {(isTaskModalOpen || editingTask) && (
          <TaskForm
            task={editingTask}
            contactId={id}
            onClose={() => {
              setIsTaskModalOpen(false)
              setEditingTask(null)
            }}
            onSuccess={() => {
              setIsTaskModalOpen(false)
              setEditingTask(null)
              queryClient.invalidateQueries({ queryKey: ['contact-tasks', id] })
              queryClient.invalidateQueries({ queryKey: ['tasks'] })
            }}
          />
        )}

        {/* Research Modal */}
        {(isResearchModalOpen || editingResearch) && (
          <ResearchForm
            research={editingResearch}
            contactId={id}
            onClose={() => {
              setIsResearchModalOpen(false)
              setEditingResearch(null)
            }}
            onSuccess={() => {
              setIsResearchModalOpen(false)
              setEditingResearch(null)
              queryClient.invalidateQueries({ queryKey: ['research', 'contact', id] })
              queryClient.invalidateQueries({ queryKey: ['research'] })
            }}
          />
        )}
      </div>
    </Layout>
  )
}