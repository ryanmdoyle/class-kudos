import SiteHeader from 'src/components/SiteHeader'

const MainLayout = ({ children }) => {
  return (
    <main className="h-screen overflow-y-auto p-4">
      <SiteHeader />
      {children}
    </main>
  )
}

export default MainLayout
