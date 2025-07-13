import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import Layout from '@/components/Layout'
import CompanyForm from '@/components/CompanyForm'

export default function EditCompany() {
  const { id } = useParams<{ id: string }>()

  const { data: company, isLoading, error } = useQuery({
    queryKey: ['company', id],
    queryFn: async () => {
      const response = await api.get(`/companies/${id}`)
      return response.data
    },
  })

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
        <div className="flex items-center mb-6">
          <Link
            to={`/companies/${id}`}
            className="mr-4 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Company</h1>
            <p className="text-gray-600 mt-1">Update {company.name}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <CompanyForm company={company} />
        </div>
      </div>
    </Layout>
  )
}