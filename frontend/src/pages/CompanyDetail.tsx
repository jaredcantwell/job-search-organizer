import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import Layout from '@/components/Layout'
import ResearchForm from '@/components/ResearchForm'

interface Company {
  id: string
  name: string
  website: string | null
  industry: string | null
  size: string | null
  location: string | null
  description: string | null
  notes: string | null
  founded: number | null
  applications: Application[]
  contacts: Contact[]
  _count: {
    applications: number
    contacts: number
  }
  createdAt: string
  updatedAt: string
}

interface Application {
  id: string
  position: string
  status: string
  appliedDate: string | null
  contact: {
    id: string
    name: string
  } | null
  createdAt: string
}

interface Contact {
  id: string
  name: string
  position: string | null
  email: string | null
  phone: string | null
  linkedinUrl: string | null
  type: string
}

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'overview' | 'applications' | 'contacts' | 'research'>('overview')
  const [isResearchModalOpen, setIsResearchModalOpen] = useState(false)
  const [editingResearch, setEditingResearch] = useState<any>(null)
  const [isAssignContactModalOpen, setIsAssignContactModalOpen] = useState(false)

  const { data: company, isLoading, error } = useQuery({
    queryKey: ['company', id],
    queryFn: async () => {
      const response = await api.get(`/companies/${id}`)
      return response.data as Company
    },
  })

  const { data: research, isLoading: researchLoading } = useQuery({
    queryKey: ['research', 'company', id],
    queryFn: async () => {
      const response = await api.get(`/research/company/${id}`)
      return response.data
    },
    enabled: !!id,
  })

  const { data: availableContacts } = useQuery({
    queryKey: ['available-contacts', id],
    queryFn: async () => {
      const response = await api.get('/contacts')
      const allContacts = response.data
      // Filter out contacts that are already assigned to this company
      return allContacts.filter((contact: any) => contact.companyId !== id)
    },
    enabled: !!id && isAssignContactModalOpen,
  })

  const deleteResearchMutation = useMutation({
    mutationFn: async (researchId: string) => {
      await api.delete(`/research/${researchId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['research', 'company', id] })
      queryClient.invalidateQueries({ queryKey: ['research'] })
    },
  })

  const assignContactMutation = useMutation({
    mutationFn: async (contactId: string) => {
      await api.put(`/contacts/${contactId}`, { companyId: id })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company', id] })
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      queryClient.invalidateQueries({ queryKey: ['available-contacts', id] })
      setIsAssignContactModalOpen(false)
    },
  })

  const getSizeLabel = (size: string | null) => {
    switch (size) {
      case 'STARTUP': return 'Startup (1-10)'
      case 'SMALL': return 'Small (11-50)'
      case 'MEDIUM': return 'Medium (51-200)'
      case 'LARGE': return 'Large (201-1000)'
      case 'ENTERPRISE': return 'Enterprise (1000+)'
      default: return 'Unknown Size'
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'INTERESTED': return 'bg-blue-100 text-blue-800'
      case 'APPLIED': return 'bg-yellow-100 text-yellow-800'
      case 'SCREENING': return 'bg-purple-100 text-purple-800'
      case 'INTERVIEWING': return 'bg-orange-100 text-orange-800'
      case 'OFFER': return 'bg-green-100 text-green-800'
      case 'ACCEPTED': return 'bg-green-100 text-green-800'
      case 'REJECTED': return 'bg-red-100 text-red-800'
      case 'WITHDRAWN': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getContactTypeIcon = (type: string) => {
    switch (type) {
      case 'RECRUITER': return '🎯'
      case 'HIRING_MANAGER': return '👨‍💼'
      case 'REFERRAL': return '🤝'
      case 'COLLEAGUE': return '👥'
      default: return '👤'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </Layout>
    )
  }

  if (error || !company) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center py-8">
            <p className="text-red-600">Company not found</p>
            <Link to="/companies" className="text-indigo-600 hover:text-indigo-700 mt-2 inline-block">
              ← Back to companies
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
              to="/companies"
              className="mr-4 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
              {company.industry && (
                <p className="text-gray-600 mt-1">{company.industry}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Link
              to={`/companies/${company.id}/edit`}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Edit
            </Link>
            {company.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Visit Website
              </a>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {[
                { id: 'overview', name: 'Overview', icon: '🏢' },
                { id: 'applications', name: `Applications (${company._count.applications})`, icon: '📋' },
                { id: 'contacts', name: `Contacts (${company._count.contacts})`, icon: '👥' },
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Company Information</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <p className="text-sm text-gray-900">{company.name}</p>
                      </div>

                      {company.website && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                          <a
                            href={company.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center"
                          >
                            {company.website}
                            <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      )}

                      {company.industry && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                          <p className="text-sm text-gray-900">{company.industry}</p>
                        </div>
                      )}

                      {company.size && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Company Size</label>
                          <p className="text-sm text-gray-900">{getSizeLabel(company.size)}</p>
                        </div>
                      )}

                      {company.location && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                          <p className="text-sm text-gray-900">{company.location}</p>
                        </div>
                      )}

                      {company.founded && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Founded</label>
                          <p className="text-sm text-gray-900">{company.founded}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Stats</h3>
                    
                    <div className="space-y-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center">
                          <svg className="w-8 h-8 text-indigo-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <div>
                            <p className="text-sm text-gray-600">Applications</p>
                            <p className="text-2xl font-bold text-gray-900">{company._count.applications}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center">
                          <svg className="w-8 h-8 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-5.5a6 6 0 01-6 6" />
                          </svg>
                          <div>
                            <p className="text-sm text-gray-600">Contacts</p>
                            <p className="text-2xl font-bold text-gray-900">{company._count.contacts}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center">
                          <svg className="w-8 h-8 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                          </svg>
                          <div>
                            <p className="text-sm text-gray-600">Research Items</p>
                            <p className="text-2xl font-bold text-gray-900">{research?.length || 0}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {company.description && (
                  <div className="mt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Description</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{company.description}</p>
                  </div>
                )}

                {company.notes && (
                  <div className="mt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Notes</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{company.notes}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'applications' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Applications</h2>
                  <Link
                    to={`/applications/new?company=${company.id}`}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    + New Application
                  </Link>
                </div>

                {!company.applications?.length ? (
                  <div className="text-center py-8">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No applications yet</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Start tracking applications to this company.
                    </p>
                    <Link
                      to={`/applications/new?company=${company.id}`}
                      className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      + Add First Application
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {company.applications.map((application) => (
                      <Link
                        key={application.id}
                        to={`/applications/${application.id}`}
                        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow block"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-base font-medium text-gray-900">
                              {application.position}
                            </h3>
                            <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                              <span>Applied {application.appliedDate ? formatDate(application.appliedDate) : 'Date not set'}</span>
                              {application.contact && (
                                <span>Contact: {application.contact.name}</span>
                              )}
                            </div>
                          </div>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(application.status)}`}>
                            {application.status.toLowerCase()}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'contacts' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Contacts</h2>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setIsAssignContactModalOpen(true)}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      + Assign Contact
                    </button>
                    <Link
                      to={`/contacts/new?company=${company.id}`}
                      className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      + New Contact
                    </Link>
                  </div>
                </div>

                {!company.contacts?.length ? (
                  <div className="text-center py-8">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-5.5a6 6 0 01-6 6" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No contacts yet</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Start building your network at this company.
                    </p>
                    <div className="mt-4 flex space-x-2 justify-center">
                      <button
                        onClick={() => setIsAssignContactModalOpen(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                      >
                        + Assign Existing Contact
                      </button>
                      <Link
                        to={`/contacts/new?company=${company.id}`}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700"
                      >
                        + Create New Contact
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {company.contacts.map((contact) => (
                      <Link
                        key={contact.id}
                        to={`/contacts/${contact.id}`}
                        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow block"
                      >
                        <div className="flex items-start">
                          <div className="text-2xl mr-3">
                            {getContactTypeIcon(contact.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-medium text-gray-900 truncate">
                              {contact.name}
                            </h3>
                            {contact.position && (
                              <p className="text-sm text-gray-600 mt-1">{contact.position}</p>
                            )}
                            <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                              {contact.email && (
                                <span className="flex items-center">
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                  Email
                                </span>
                              )}
                              {contact.phone && (
                                <span className="flex items-center">
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                  </svg>
                                  Phone
                                </span>
                              )}
                              {contact.linkedinUrl && (
                                <span className="flex items-center">
                                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                  </svg>
                                  LinkedIn
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No research yet</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Start tracking research about this company.
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

        {/* Research Modal */}
        {(isResearchModalOpen || editingResearch) && (
          <ResearchForm
            research={editingResearch}
            companyId={id}
            onClose={() => {
              setIsResearchModalOpen(false)
              setEditingResearch(null)
            }}
            onSuccess={() => {
              setIsResearchModalOpen(false)
              setEditingResearch(null)
              queryClient.invalidateQueries({ queryKey: ['research', 'company', id] })
              queryClient.invalidateQueries({ queryKey: ['research'] })
            }}
          />
        )}

        {/* Assign Contact Modal */}
        {isAssignContactModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Assign Contact</h2>
                <button
                  onClick={() => setIsAssignContactModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6">
                {!availableContacts?.length ? (
                  <div className="text-center py-8">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-5.5a6 6 0 01-6 6" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No available contacts</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      All your contacts are already assigned to companies or you don't have any contacts yet.
                    </p>
                    <Link
                      to="/contacts/new"
                      onClick={() => setIsAssignContactModalOpen(false)}
                      className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      Create New Contact
                    </Link>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-600 mb-4">
                      Select a contact to assign to {company?.name}:
                    </p>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {availableContacts.map((contact: any) => (
                        <button
                          key={contact.id}
                          onClick={() => assignContactMutation.mutate(contact.id)}
                          disabled={assignContactMutation.isPending}
                          className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{contact.name}</p>
                              {contact.email && (
                                <p className="text-sm text-gray-500">{contact.email}</p>
                              )}
                              {contact.position && (
                                <p className="text-sm text-gray-500">{contact.position}</p>
                              )}
                            </div>
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}