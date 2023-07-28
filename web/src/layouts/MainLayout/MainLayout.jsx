import SiteHeader from 'src/components/SiteHeader'

const MainLayout = ({ children }) => {
  return (
    <main className="h-screen p-4">
      <SiteHeader />
      {children}
    </main>
  )
}

export default MainLayout
