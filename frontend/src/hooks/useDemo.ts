import { useDemoStore } from '@/lib/store'
import { 
  getDemoName, 
  getDemoCompany, 
  getDemoEmail, 
  getDemoPosition,
  anonymizeContent,
  anonymizeText 
} from '@/lib/demoUtils'

export function useDemo() {
  const { isDemoMode } = useDemoStore()

  const demoName = (name: string) => isDemoMode ? getDemoName(name) : name
  const demoCompany = (company: string | null) => isDemoMode ? getDemoCompany(company || '') : company
  const demoEmail = (email: string) => isDemoMode ? getDemoEmail(email) : email
  const demoPosition = (position: string | null) => isDemoMode ? getDemoPosition(position || '') : position
  const demoContent = (content: string | null) => isDemoMode ? anonymizeContent(content || '') : content
  const demoText = (text: string | null) => isDemoMode ? anonymizeText(text || '') : text

  return {
    isDemoMode,
    demoName,
    demoCompany,
    demoEmail,
    demoPosition,
    demoContent,
    demoText
  }
}