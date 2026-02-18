// src/utils/PlatformUtils.ts
// Определение платформы — единая точка вместо дублирования regex

let _isMobile: boolean | null = null;

/**
 * Определяет, является ли устройство мобильным.
 * Результат кэшируется при первом вызове.
 */
export function isMobile(): boolean {
    if (_isMobile !== null) return _isMobile;

    _isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent,
        ) ||
        (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);

    return _isMobile;
}

/**
 * Сброс кэша (для тестов)
 */
export function _resetPlatformCache(): void {
    _isMobile = null;
}
