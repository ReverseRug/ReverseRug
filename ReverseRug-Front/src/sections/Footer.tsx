export const Footer = () => {
  return (
    <footer className="bg-stone-200 border-t-4 border-black py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#06B6D4] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="w-5 h-5 text-black"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 4C12 4 8 6 6 10C4 14 4 16 6 18C8 20 10 20 12 18C12 18 12 16 12 12M12 4C12 4 16 6 18 10C20 14 20 16 18 18C16 20 14 20 12 18C12 18 12 16 12 12M12 4V12"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="text-sm font-black uppercase">
              ReverseRug
            </span>
          </div>
          <p className="text-sm font-bold text-[#475569]">
            © 2024 ReverseRug. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a
              href="#"
              className="text-sm font-black uppercase text-[#0F172A] hover:text-[#06B6D4] transition-colors"
            >
              Twitter
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
