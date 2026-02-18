import { describe, it, expect, beforeEach } from "vitest";
import { GameState } from "./GameState";

describe("GameState", () => {
    let state: GameState;

    beforeEach(() => {
        state = new GameState();
    });

    describe("начальное состояние", () => {
        it("начинается на паузе", () => {
            expect(state.getPaused()).toBe(true);
        });

        it("игра не запущена", () => {
            expect(state.getGameStarted()).toBe(false);
        });

        it("не в процессе возобновления", () => {
            expect(state.getIsResuming()).toBe(false);
        });

        it("previousMenu = null", () => {
            expect(state.getPreviousMenu()).toBeNull();
        });
    });

    describe("setPaused / getPaused", () => {
        it("устанавливает паузу", () => {
            state.setPaused(false);
            expect(state.getPaused()).toBe(false);
        });

        it("снимает паузу и устанавливает обратно", () => {
            state.setPaused(false);
            state.setPaused(true);
            expect(state.getPaused()).toBe(true);
        });
    });

    describe("setGameStarted / getGameStarted", () => {
        it("запускает игру", () => {
            state.setGameStarted(true);
            expect(state.getGameStarted()).toBe(true);
        });
    });

    describe("setIsResuming / getIsResuming", () => {
        it("устанавливает флаг возобновления", () => {
            state.setIsResuming(true);
            expect(state.getIsResuming()).toBe(true);
        });
    });

    describe("setPreviousMenu / getPreviousMenu", () => {
        it("устанавливает HTML элемент", () => {
            const el = document.createElement("div");
            state.setPreviousMenu(el);
            expect(state.getPreviousMenu()).toBe(el);
        });

        it("сбрасывает в null", () => {
            const el = document.createElement("div");
            state.setPreviousMenu(el);
            state.setPreviousMenu(null);
            expect(state.getPreviousMenu()).toBeNull();
        });
    });

    describe("reset", () => {
        it("сбрасывает все поля в начальное состояние", () => {
            state.setPaused(false);
            state.setGameStarted(true);
            state.setPreviousMenu(document.createElement("div"));

            state.reset();

            expect(state.getPaused()).toBe(true);
            expect(state.getGameStarted()).toBe(false);
            expect(state.getPreviousMenu()).toBeNull();
        });
    });
});
