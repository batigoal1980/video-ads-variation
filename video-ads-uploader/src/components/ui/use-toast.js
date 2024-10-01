import React from 'react'
import { Toast, ToastTitle, ToastDescription, ToastProvider, ToastViewport } from "@radix-ui/react-toast"

export const ToastContext = React.createContext(null)

export function useToast() {
  const context = React.useContext(ToastContext)
  if (context === null) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export function ToastWrapper({ children }) {
  const [toasts, setToasts] = React.useState([])

  const addToast = React.useCallback((toast) => {
    setToasts((prevToasts) => [...prevToasts, { id: Date.now(), ...toast }])
  }, [])

  const removeToast = React.useCallback((id) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      <ToastProvider>
        {children}
        {toasts.map((toast) => (
          <Toast key={toast.id} onOpenChange={() => removeToast(toast.id)}>
            {toast.title && <ToastTitle>{toast.title}</ToastTitle>}
            {toast.description && <ToastDescription>{toast.description}</ToastDescription>}
          </Toast>
        ))}
        <ToastViewport />
      </ToastProvider>
    </ToastContext.Provider>
  )
}
