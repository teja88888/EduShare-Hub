import { useEffect } from 'react';

export default function App() {
  useEffect(() => {
    const token = localStorage.getItem('edushare_token');
    if (token) {
      window.location.replace('/dashboard.html');
    } else {
      window.location.replace('/register.html');
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-800">
      <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg mb-4 animate-bounce">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">EduShare Hub</h1>
      <p className="text-slate-500 mb-4">Redirecting to Student Knowledge Sharing Platform...</p>
      <div className="flex gap-4 text-sm font-medium">
        <a href="/register.html" className="text-blue-600 hover:underline">Student Registration</a>
        <span className="text-slate-300">&bull;</span>
        <a href="/dashboard.html" className="text-blue-600 hover:underline">Dashboard</a>
        <span className="text-slate-300">&bull;</span>
        <a href="/materials.html" className="text-blue-600 hover:underline">Study Library</a>
      </div>
    </div>
  );
}
