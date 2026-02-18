// src/utils/PlatformUtils.ts
// Определение платформы — единая точка вместо дублирования regex

let _isMobile: boolean | null = null;

/**
 * Определяет, является ли устройство мобильным.
 * Результат кэшируется при первом вызове.
 */
export function isMobile(): boolean {
    if (_isMobile !== null) return _isMobile;

    const ua = navigator.userAgent;
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isWindows = /Windows/i.test(ua);
    const isTouch = navigator.maxTouchPoints > 0;

    // На Windows считаем мобильным ТОЛЬКО если это явно мобильный браузер
    if (isWindows) {
        _isMobile = isMobileUA;
    } else {
        _isMobile = isMobileUA || (isTouch && window.innerWidth < 1024 && window.innerHeight < 1024);
    }

    return _isMobile;
}

/**
 * Сброс кэша (для тестов)
 */
export function _resetPlatformCache(): void {
    _isMobile = null;
}
