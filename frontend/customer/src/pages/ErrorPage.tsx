import { useNavigate, useRouteError } from 'react-router-dom'

interface RouteError {
  statusText?: string
  message?: string
  status?: number
}

export default function ErrorPage() {
  const error = useRouteError() as RouteError
  const navigate = useNavigate()

  const handleGoBack = () => {
    navigate(-1)
  }

  const handleGoHome = () => {
    navigate('/restaurant/rest_001')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 text-center max-w-md w-full">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-red-500 text-3xl">⚠️</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-2">페이지를 찾을 수 없습니다</h1>
        
        {error?.status === 404 ? (
          <p className="text-gray-600 mb-6">
            요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
          </p>
        ) : (
          <p className="text-gray-600 mb-6">
            {error?.statusText || error?.message || "예상치 못한 오류가 발생했습니다."}
          </p>
        )}

        <div className="space-y-4 mb-6">
          <div className="bg-blue-50 rounded-xl p-4">
            <h3 className="font-semibold text-blue-800 mb-2">💡 도움말</h3>
            <ul className="text-sm text-blue-700 text-left space-y-1">
              <li>• QR 코드를 다시 스캔해보세요</li>
              <li>• URL이 올바른지 확인해보세요</li>
              <li>• 인터넷 연결을 확인해보세요</li>
            </ul>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleGoBack}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
          >
            이전 페이지로
          </button>
          
          <button
            onClick={handleGoHome}
            className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
          >
            메인으로 이동
          </button>
        </div>

        {error?.status && (
          <p className="text-xs text-gray-500 mt-6">
            오류 코드: {error.status}
          </p>
        )}
      </div>
    </div>
  )
}