import SiteHeader from 'src/components/SiteHeader'

const MainLayout = ({ children }) => {
  return (
    <main className="bg-color-red">
      <SiteHeader />
      {children}
    </main>
  )
}

export default MainLayout
