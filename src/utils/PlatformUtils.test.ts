import { describe, it, expect } from "vitest";
import { isMobile } from "./PlatformUtils";

describe("PlatformUtils", () => {
    describe("isMobile", () => {
        it("возвращает boolean", () => {
            const result = isMobile();
            expect(typeof result).toBe("boolean");
        });

        it("в JSDOM (node) возвращает false", () => {
            // JSDOM не имеет мобильного userAgent
            expect(isMobile()).toBe(false);
        });

        it("возвращает одинаковый результат при повторных вызовах (кэширование)", () => {
            const first = isMobile();
            const second = isMobile();
            expect(first).toBe(second);
        });
    });
});
