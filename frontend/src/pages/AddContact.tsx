import { useSearchParams, Link } from 'react-router-dom'
import Layout from '@/components/Layout'
import ContactForm from '@/components/ContactForm'

export default function AddContact() {
  const [searchParams] = useSearchParams()
  const defaultCompanyId = searchParams.get('company')

  return (
    <Layout>
      <div className="p-6">
        <div className="flex items-center mb-6">
          <Link
            to="/contacts"
            className="mr-4 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add Contact</h1>
            <p className="text-gray-600 mt-1">Create a new contact</p>
          </div>
        </div>

        <ContactForm
          mode="page"
          defaultCompanyId={defaultCompanyId || undefined}
          onClose={() => window.history.back()}
          onSuccess={() => window.history.back()}
        />
      </div>
    </Layout>
  )
}