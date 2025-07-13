import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginForm = z.infer<typeof loginSchema>
type RegisterForm = z.infer<typeof registerSchema>

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRegisterMode, setIsRegisterMode] = useState(false)

  const loginForm = useForm<LoginForm>()
  const registerForm = useForm<RegisterForm>()

  const onLogin = async (data: LoginForm) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await api.post('/auth/login', data)
      const { user, token } = response.data
      login(user, token)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const onRegister = async (data: RegisterForm) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await api.post('/auth/register', data)
      const { user, token } = response.data
      login(user, token)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isRegisterMode ? 'Create your account' : 'Sign in to your account'}
          </h2>
        </div>
        
        {isRegisterMode ? (
          <form className="mt-8 space-y-6" onSubmit={registerForm.handleSubmit(onRegister)}>
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  {...registerForm.register('name')}
                  type="text"
                  autoComplete="name"
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="John Doe"
                />
                {registerForm.formState.errors.name && (
                  <p className="mt-1 text-sm text-red-600">{registerForm.formState.errors.name.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  {...registerForm.register('email')}
                  type="email"
                  autoComplete="email"
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="john@example.com"
                />
                {registerForm.formState.errors.email && (
                  <p className="mt-1 text-sm text-red-600">{registerForm.formState.errors.email.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  {...registerForm.register('password')}
                  type="password"
                  autoComplete="new-password"
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="••••••••"
                />
                {registerForm.formState.errors.password && (
                  <p className="mt-1 text-sm text-red-600">{registerForm.formState.errors.password.message}</p>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isLoading ? 'Creating account...' : 'Create account'}
              </button>
            </div>
          </form>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={loginForm.handleSubmit(onLogin)}>
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email" className="sr-only">
                  Email address
                </label>
                <input
                  {...loginForm.register('email')}
                  type="email"
                  autoComplete="email"
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                />
                {loginForm.formState.errors.email && (
                  <p className="mt-1 text-sm text-red-600">{loginForm.formState.errors.email.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  {...loginForm.register('password')}
                  type="password"
                  autoComplete="current-password"
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                />
                {loginForm.formState.errors.password && (
                  <p className="mt-1 text-sm text-red-600">{loginForm.formState.errors.password.message}</p>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>
        )}

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(!isRegisterMode)
              setError(null)
            }}
            className="text-sm text-indigo-600 hover:text-indigo-500"
          >
            {isRegisterMode 
              ? 'Already have an account? Sign in' 
              : "Don't have an account? Create one"}
          </button>
        </div>
      </div>
    </div>
  )
}