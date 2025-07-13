import { Link } from 'react-router-dom'
import Layout from '@/components/Layout'
import CompanyForm from '@/components/CompanyForm'

export default function AddCompany() {
  return (
    <Layout>
      <div className="p-6">
        <div className="flex items-center mb-6">
          <Link
            to="/companies"
            className="mr-4 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add Company</h1>
            <p className="text-gray-600 mt-1">Create a new company record</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <CompanyForm />
        </div>
      </div>
    </Layout>
  )
}