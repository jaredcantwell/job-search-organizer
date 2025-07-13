import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import Layout from '@/components/Layout'
import ContactForm from '@/components/ContactForm'

interface Contact {
  id: string
  name: string
  linkedinUrl: string | null
  notes: string | null
  company: string | null
  position: string | null
  lastContact: string | null
  createdAt: string
  updatedAt: string
  communications?: Array<{
    followUpActions: Array<{
      completed: boolean
    }>
  }>
}

export default function ContactsList() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [sortBy, setSortBy] = useState<'name' | 'company' | 'lastContact' | 'created'>('name')

  const { data: contacts, isLoading, error } = useQuery({
    queryKey: ['contacts', searchTerm, sortBy],
    queryFn: async () => {
      const contactsResponse = await api.get('/contacts', {
        params: searchTerm ? { search: searchTerm } : {}
      })
      const contacts = contactsResponse.data as Contact[]
      
      // Fetch communications for each contact to check for pending follow-ups
      const contactsWithCommunications = await Promise.all(
        contacts.map(async (contact) => {
          try {
            const communicationsResponse = await api.get(`/communications/contact/${contact.id}`)
            return {
              ...contact,
              communications: communicationsResponse.data
            }
          } catch (error) {
            // If communications fetch fails, return contact without communications
            return contact
          }
        })
      )
      
      // Sort contacts based on selected sort option
      return contactsWithCommunications.sort((a, b) => {
        switch (sortBy) {
          case 'name':
            return a.name.localeCompare(b.name)
          case 'company':
            const companyA = a.company || ''
            const companyB = b.company || ''
            return companyA.localeCompare(companyB)
          case 'lastContact':
            const dateA = a.lastContact ? new Date(a.lastContact).getTime() : 0
            const dateB = b.lastContact ? new Date(b.lastContact).getTime() : 0
            return dateB - dateA // Most recent first
          case 'created':
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() // Newest first
          default:
            return 0
        }
      })
    },
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`
    return date.toLocaleDateString()
  }

  const hasPendingFollowUps = (contact: Contact) => {
    if (!contact.communications) return false
    
    return contact.communications.some(comm => 
      comm.followUpActions?.some(action => !action.completed)
    )
  }

  return (
    <Layout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            + New Contact
          </button>
        </div>

        {/* Search and Sort */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="flex items-center space-x-2">
            <label htmlFor="sort-select" className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Sort by:
            </label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="name">Name (A-Z)</option>
              <option value="company">Company (A-Z)</option>
              <option value="lastContact">Last Contact</option>
              <option value="created">Recently Added</option>
            </select>
          </div>
        </div>

        {/* Contacts List */}
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading contacts...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-600">Error loading contacts</p>
          </div>
        ) : !contacts?.length ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No contacts</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'No contacts match your search.' : 'Get started by creating a new contact.'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                + New Contact
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-200">
            {contacts.map((contact) => (
              <Link
                key={contact.id}
                to={`/contacts/${contact.id}`}
                className="block px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-medium text-gray-900 truncate">{contact.name}</h3>
                      {hasPendingFollowUps(contact) && (
                        <div className="flex-shrink-0">
                          <div className="w-2 h-2 bg-orange-500 rounded-full" title="Has pending follow-ups"></div>
                        </div>
                      )}
                    </div>
                    <div className="mt-1 flex items-center space-x-3 text-xs text-gray-500">
                      {contact.company && (
                        <span className="truncate">{contact.company}</span>
                      )}
                      {contact.position && (
                        <span className="truncate">{contact.position}</span>
                      )}
                      {contact.linkedinUrl && (
                        <span className="flex items-center flex-shrink-0">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                          </svg>
                          <span className="sr-only">LinkedIn</span>
                        </span>
                      )}
                      {contact.lastContact && (
                        <span className="text-gray-400">
                          Last: {formatDate(contact.lastContact)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ml-3 flex-shrink-0">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Contact Form Modal */}
        {isCreateModalOpen && (
          <ContactForm
            onClose={() => setIsCreateModalOpen(false)}
            onSuccess={() => {
              setIsCreateModalOpen(false)
            }}
          />
        )}
      </div>
    </Layout>
  )
}