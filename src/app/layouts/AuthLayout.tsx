const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="bg-green-background min-h-screen min-w-screen p-12">
      <div className="grid grid-cols-[40%_60%] min-h-[calc(100vh-96px)] border-2 border-black shadow-shadow">
        <div className="relative center bg-main-background border-black border-r-2">
          <div className="-top-[100px] relative max-w-4/5">
            <img
              src="/images/students.png"
              alt="Students Learning"
              className="mx-auto max-w-4/5 h-auto"
            />
            <div className="text-5xl text-white font-bold text-center">Class Kudos</div>
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