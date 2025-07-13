import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './lib/store'
import LoginPage from './pages/Login'
import DashboardPage from './pages/Dashboard'
import ContactsList from './pages/ContactsList'
import ContactDetail from './pages/ContactDetail'
import AddContact from './pages/AddContact'
import EditContact from './pages/EditContact'
import Companies from './pages/Companies'
import CompanyDetail from './pages/CompanyDetail'
import AddCompany from './pages/AddCompany'
import EditCompany from './pages/EditCompany'
import TasksList from './pages/TasksList'
import UpcomingMeetings from './pages/UpcomingMeetings'

function App() {
  const { isAuthenticated } = useAuthStore()

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />} 
        />
        <Route 
          path="/dashboard" 
          element={isAuthenticated ? <DashboardPage /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/contacts" 
          element={isAuthenticated ? <ContactsList /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/contacts/new" 
          element={isAuthenticated ? <AddContact /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/contacts/:id/edit" 
          element={isAuthenticated ? <EditContact /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/contacts/:id" 
          element={isAuthenticated ? <ContactDetail /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/companies" 
          element={isAuthenticated ? <Companies /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/companies/new" 
          element={isAuthenticated ? <AddCompany /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/companies/:id/edit" 
          element={isAuthenticated ? <EditCompany /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/companies/:id" 
          element={isAuthenticated ? <CompanyDetail /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/tasks" 
          element={isAuthenticated ? <TasksList /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/meetings" 
          element={isAuthenticated ? <UpcomingMeetings /> : <Navigate to="/login" />} 
        />
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  )
}

export default App