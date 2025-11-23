import { Head } from '@inertiajs/react';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import ChatwootWidget from '../components/chatwoot/ChatwootWidget';

interface Props {
  user: any;
  company: any;
}

export default function Conversaciones({ user, company }: Props) {
  const handleBack = () => {
    window.history.back();
  };

  return (
    <>
      <Head title="Conversaciones - WITHMIA" />
      
      <div className="min-h-screen bg-gradient-to-br from-gray-50/50 to-white">
        {/* Header */}
        <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button 
                  onClick={handleBack}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">💬 Conversaciones</h1>
                    <p className="text-sm text-gray-600">Gestiona tus conversaciones con Chatwoot</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="text-sm text-gray-500">
                  <span className="font-medium">{company?.name || 'WITHMIA'}</span>
                </div>
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-amber-700">
                    {user?.name?.charAt(0) || 'W'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contenido Principal */}
        <div className="max-w-7xl mx-auto p-6">
          {/* Info Banner */}
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-1">
                  Chatwoot Integrado
                </h3>
                <p className="text-blue-700 text-sm">
                  Gestiona todas tus conversaciones desde aquí. Conectado a: 
                  <span className="font-mono ml-1 bg-blue-100 px-2 py-1 rounded">
                    chatwoot-admin.withmia.com
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Widget de Chatwoot */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <ChatwootWidget chatwootUrl="https://chatwoot-admin.withmia.com" />
          </div>
        </div>
      </div>
    </>
  );
}