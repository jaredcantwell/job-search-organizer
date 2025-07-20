import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import Layout from '@/components/Layout'

interface Company {
  id: string
  name: string
  website: string | null
  industry: string | null
  size: string | null
  location: string | null
  description: string | null
  status: string
  _count: {
    applications: number
    contacts: number
  }
  createdAt: string
  updatedAt: string
}

export default function Companies() {
  const [search, setSearch] = useState('')
  const [industryFilter, setIndustryFilter] = useState('')
  const [sizeFilter, setSizeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data: companies, isLoading } = useQuery({
    queryKey: ['companies', search, industryFilter, sizeFilter, statusFilter],
    queryFn: async (): Promise<Company[]> => {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (industryFilter) params.append('industry', industryFilter)
      if (sizeFilter) params.append('size', sizeFilter)
      if (statusFilter) params.append('status', statusFilter)
      
      const response = await api.get(`/companies?${params.toString()}`)
      return response.data
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

  const getSizeBadgeColor = (size: string | null) => {
    switch (size) {
      case 'STARTUP': return 'bg-purple-100 text-purple-800'
      case 'SMALL': return 'bg-blue-100 text-blue-800'
      case 'MEDIUM': return 'bg-green-100 text-green-800'
      case 'LARGE': return 'bg-yellow-100 text-yellow-800'
      case 'ENTERPRISE': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'OPPORTUNITY': return 'Opportunity'
      case 'TARGET': return 'Target'
      case 'RESEARCH': return 'Research'
      case 'WATCHING': return 'Watching'
      case 'ARCHIVED': return 'Archived'
      default: return status
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'OPPORTUNITY': return 'bg-green-100 text-green-800'
      case 'TARGET': return 'bg-blue-100 text-blue-800'
      case 'RESEARCH': return 'bg-yellow-100 text-yellow-800'
      case 'WATCHING': return 'bg-purple-100 text-purple-800'
      case 'ARCHIVED': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const uniqueIndustries = [...new Set(companies?.map(c => c.industry).filter(Boolean))]
  const uniqueSizes = [...new Set(companies?.map(c => c.size).filter(Boolean))]
  const uniqueStatuses = [...new Set(companies?.map(c => c.status).filter(Boolean))]

  return (
    <Layout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
            <p className="text-gray-600 mt-1">
              Manage and track companies in your job search
            </p>
          </div>
          <Link
            to="/companies/new"
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            + Add Company
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search companies..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Statuses</option>
                {uniqueStatuses.map(status => (
                  <option key={status} value={status || ''}>{getStatusLabel(status)}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Industry
              </label>
              <select
                value={industryFilter}
                onChange={(e) => setIndustryFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Industries</option>
                {uniqueIndustries.map(industry => (
                  <option key={industry} value={industry || ''}>{industry}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Size
              </label>
              <select
                value={sizeFilter}
                onChange={(e) => setSizeFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Sizes</option>
                {uniqueSizes.map(size => (
                  <option key={size} value={size || ''}>{getSizeLabel(size)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Companies Grid */}
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading companies...</p>
          </div>
        ) : !companies?.length ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No companies yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              {search || industryFilter || sizeFilter || statusFilter
                ? 'No companies match your filters.'
                : 'Get started by adding your first company.'
              }
            </p>
            {!search && !industryFilter && !sizeFilter && !statusFilter && (
              <Link
                to="/companies/new"
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                + Add Company
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((company) => (
              <Link
                key={company.id}
                to={`/companies/${company.id}`}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {company.name}
                    </h3>
                    {company.industry && (
                      <p className="text-sm text-gray-600 mt-1">{company.industry}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(company.status)}`}>
                      {getStatusLabel(company.status)}
                    </span>
                    {company.size && (
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSizeBadgeColor(company.size)}`}>
                        {getSizeLabel(company.size)}
                      </span>
                    )}
                  </div>
                </div>

                {company.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {company.description}
                  </p>
                )}

                {company.location && (
                  <div className="flex items-center text-sm text-gray-500 mb-4">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {company.location}
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {company._count.applications} {company._count.applications === 1 ? 'application' : 'applications'}
                    </span>
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-5.5a6 6 0 01-6 6" />
                      </svg>
                      {company._count.contacts} {company._count.contacts === 1 ? 'contact' : 'contacts'}
                    </span>
                  </div>
                  
                  {company.website && (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-indigo-600 hover:text-indigo-700"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}