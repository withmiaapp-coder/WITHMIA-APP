export default function AppLogo() {
    return (
        <div className="flex items-center">
            <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-white border border-gray-200">
                <img
                    src="/logo-withmia.webp"
                    alt="WITHMIA"
                    className="size-6 object-contain"
                />
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-tight font-semibold text-gray-900 dark:text-white">WITHMIA</span>
            </div>
        </div>
    );
}

