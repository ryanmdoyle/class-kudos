import React, { createContext, useContext, useState } from 'react'

// Create the context
const SelectedEnrolledContext = createContext(null)
SelectedEnrolledContext.displayName = 'Selected Enrolled Context'

// Create a provider component (for highest parent component)
export const SelectedEnrolledProvider = ({ children }) => {
  const [selectedUsers, setSelectedUsers] = useState([])

  const toggleSelectedUser = (enrollment) => {
    // check if currently selected, based on userIds
    const selectedIds = selectedUsers.map((enrollment) => enrollment.userId)
    if (selectedIds.includes(enrollment.userId)) {
      const currentSelected = [...selectedUsers]
      const removed = currentSelected.filter(
        (userEnrolled) => userEnrolled.userId !== enrollment.userId
      )
      setSelectedUsers(removed)
    } else {
      setSelectedUsers([...selectedUsers, enrollment])
    }
  }

  return (
    <SelectedEnrolledContext.Provider
      value={{ selectedUsers, toggleSelectedUser }}
    >
      {children}
    </SelectedEnrolledContext.Provider>
  )
}

// Create a custom hook to use the context (Import the hook and access methods from there)
export const useSelectedContext = () => {
  return useContext(SelectedEnrolledContext)
}
