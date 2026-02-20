<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Conectar Canal — Withmia</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
        .page-card { transition: all 0.15s ease; }
        .page-card:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    </style>
</head>
<body class="bg-gradient-to-br from-slate-50 to-indigo-50/30 min-h-screen flex items-center justify-center p-4">

    @if(!$success)
        {{-- ━━━ Error State ━━━ --}}
        <div class="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
            <div class="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </div>
            <h2 class="text-xl font-bold text-gray-900 mb-2">Error de autorización</h2>
            <p class="text-gray-600 mb-6 text-sm leading-relaxed">{{ $error ?? 'Ocurrió un error inesperado.' }}</p>
            <button
                onclick="window.close()"
                class="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition text-sm"
            >
                Cerrar ventana
            </button>
        </div>

    @else
        {{-- ━━━ Selector ━━━ --}}
        <div class="bg-white rounded-2xl shadow-xl p-6 sm:p-8 max-w-lg w-full">

            {{-- Header --}}
            <div class="text-center mb-6">
                <div class="w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center
                    @if($channel === 'messenger') bg-blue-50
                    @elseif($channel === 'instagram') bg-gradient-to-br from-purple-50 to-pink-50
                    @else bg-green-50 @endif
                ">
                    @if($channel === 'messenger')
                        <svg class="w-7 h-7 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.2 5.42 3.15 7.2.17.15.27.37.28.6l.06 1.87c.02.56.6.93 1.11.7l2.09-.82c.18-.07.38-.09.56-.05.86.24 1.78.37 2.75.37 5.64 0 10-4.13 10-9.7S17.64 2 12 2z"/>
                        </svg>
                    @elseif($channel === 'instagram')
                        <svg class="w-7 h-7 text-pink-600" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                        </svg>
                    @else
                        <svg class="w-7 h-7 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.352 0-4.55-.752-6.337-2.076l-.442-.332-3.17 1.063 1.063-3.17-.332-.442A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                        </svg>
                    @endif
                </div>

                <h2 class="text-xl font-bold text-gray-900">
                    @if($channel === 'messenger')
                        Selecciona una Página de Facebook
                    @elseif($channel === 'instagram')
                        Selecciona una cuenta de Instagram
                    @else
                        Selecciona un número de WhatsApp
                    @endif
                </h2>
                <p class="text-sm text-gray-500 mt-1">
                    MIA recibirá y responderá los mensajes de este canal automáticamente.
                </p>
            </div>

            {{-- List --}}
            <div id="page-list" class="space-y-3 max-h-[400px] overflow-y-auto">

                @if($channel === 'whatsapp-cloud' && !empty($phones))
                    @foreach($phones as $index => $phone)
                        <button
                            onclick="selectPhone({{ $index }})"
                            class="page-card w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-green-400 hover:bg-green-50/50 transition-all group text-left"
                        >
                            <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <span class="text-lg">📱</span>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="font-semibold text-gray-900 truncate">{{ $phone['display_phone_number'] }}</p>
                                @if(!empty($phone['verified_name']))
                                    <p class="text-sm text-gray-500 truncate">{{ $phone['verified_name'] }}</p>
                                @endif
                                @if(!empty($phone['quality_rating']))
                                    <span class="inline-block mt-1 text-xs px-2 py-0.5 rounded-full
                                        {{ $phone['quality_rating'] === 'GREEN' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700' }}
                                    ">
                                        Calidad: {{ $phone['quality_rating'] }}
                                    </span>
                                @endif
                            </div>
                            <span class="text-green-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                                Conectar →
                            </span>
                        </button>
                    @endforeach

                @else
                    @foreach($pages as $index => $page)
                        <button
                            onclick="selectPage({{ $index }})"
                            class="page-card w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl
                                {{ $channel === 'instagram' ? 'hover:border-pink-400 hover:bg-pink-50/50' : 'hover:border-blue-400 hover:bg-blue-50/50' }}
                                transition-all group text-left"
                        >
                            @php
                                $picUrl = $page['picture']['data']['url'] ?? null;
                                $igPic = $page['instagram_business_account']['profile_picture_url'] ?? null;
                                $displayPic = ($channel === 'instagram' && $igPic) ? $igPic : $picUrl;
                            @endphp

                            @if($displayPic)
                                <img
                                    src="{{ $displayPic }}"
                                    alt="{{ $page['name'] }}"
                                    class="w-12 h-12 rounded-full object-cover flex-shrink-0 bg-gray-100"
                                    onerror="this.outerHTML='<div class=\'w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 text-lg\'>📄</div>'"
                                >
                            @else
                                <div class="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 text-lg">📄</div>
                            @endif

                            <div class="flex-1 min-w-0">
                                @if($channel === 'instagram' && !empty($page['instagram_business_account']['username']))
                                    <p class="font-semibold text-gray-900 truncate">
                                        &#64;{{ $page['instagram_business_account']['username'] }}
                                    </p>
                                    <p class="text-sm text-gray-500 truncate">Vía {{ $page['name'] }}</p>
                                @else
                                    <p class="font-semibold text-gray-900 truncate">{{ $page['name'] }}</p>
                                    <p class="text-sm text-gray-400 truncate">ID: {{ $page['id'] }}</p>
                                @endif
                            </div>

                            <span class="text-sm font-medium opacity-0 group-hover:opacity-100 transition flex-shrink-0
                                {{ $channel === 'instagram' ? 'text-pink-600' : 'text-blue-600' }}
                            ">
                                Conectar →
                            </span>
                        </button>
                    @endforeach
                @endif
            </div>

            {{-- Loading state --}}
            <div id="loading" class="hidden text-center py-12">
                <div class="relative w-12 h-12 mx-auto mb-4">
                    <div class="absolute inset-0 rounded-full border-4 border-indigo-100"></div>
                    <div class="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
                </div>
                <p class="text-gray-700 font-medium">Conectando canal...</p>
                <p class="text-sm text-gray-400 mt-1">Esto tomará solo unos segundos</p>
            </div>

            {{-- Cancel --}}
            <div id="cancel-area" class="mt-4 text-center">
                <button onclick="window.close()" class="text-sm text-gray-400 hover:text-gray-600 transition">
                    Cancelar
                </button>
            </div>
        </div>
    @endif

    @if($success)
    <script>
        const pages = @json($pages ?? []);
        const phones = @json($phones ?? []);
        const channel = @json($channel);
        const appUrl = @json($appUrl);
        const wabaId = @json($wabaId ?? '');
        const waAccessToken = @json($accessToken ?? '');
        const userAccessToken = @json($userAccessToken ?? '');

        function showLoading() {
            document.getElementById('page-list').classList.add('hidden');
            document.getElementById('cancel-area').classList.add('hidden');
            document.getElementById('loading').classList.remove('hidden');
        }

        function sendAndClose(data) {
            showLoading();

            if (window.opener) {
                window.opener.postMessage(data, appUrl);
            }

            // Give parent time to process, then close
            setTimeout(() => window.close(), 1500);
        }

        function selectPage(index) {
            const page = pages[index];
            const data = {
                type: 'oauth-page-selected',
                channel: channel,
                page_access_token: page.access_token,
                user_access_token: userAccessToken,
                page_id: page.id,
                page_name: page.name,
            };

            if (channel === 'instagram' && page.instagram_business_account) {
                data.instagram_id = page.instagram_business_account.id;
                data.instagram_username = page.instagram_business_account.username;
            }

            sendAndClose(data);
        }

        function selectPhone(index) {
            const phone = phones[index];
            sendAndClose({
                type: 'oauth-page-selected',
                channel: 'whatsapp-cloud',
                phone_number: phone.display_phone_number,
                phone_number_id: phone.id,
                business_account_id: wabaId,
                api_key: waAccessToken,
                phone_name: phone.verified_name || phone.display_phone_number,
            });
        }

        // Auto-select if only 1 option (best UX — no extra click needed!)
        window.addEventListener('DOMContentLoaded', () => {
            if (channel === 'whatsapp-cloud' && phones.length === 1) {
                setTimeout(() => selectPhone(0), 400);
            } else if (channel !== 'whatsapp-cloud' && pages.length === 1) {
                setTimeout(() => selectPage(0), 400);
            }
        });
    </script>
    @endif

</body>
</html>
