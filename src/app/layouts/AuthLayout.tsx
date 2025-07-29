const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="bg-green-background min-h-screen min-w-screen p-12">
      <div className="grid grid-cols-2 min-h-[calc(100vh-96px)] border-2 border-black shadow-shadow">
        <div className="relative center bg-main-background border-black border-r-2">
          <div className="-top-[100px] relative">
            <img src="/images/students.png" alt="Students Learning" className="mx-auto w-[300px]" />
            <div className="text-5xl text-white font-bold">Class Kudos</div>
          </div>
          <div className="text-white text-sm absolute bottom-0 left-0 right-0 p-10">
            “Easy Class Rewards & Store”
          </div>
        </div>
        <div className="center bg-white relative">
          <div className="w-full">{children}</div>
        </div>
      </div>
    </div>
  );
};

export { AuthLayout };