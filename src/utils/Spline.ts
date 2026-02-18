/**
 * Сплайн для нелинейного преобразования значений шума.
 * Позволяет задавать кривую: вход (шум) -> выход (высота/параметр).
 */
export class Spline {
    private points: { x: number; y: number }[];

    constructor(points: { x: number; y: number }[]) {
        this.points = [...points].sort((a, b) => a.x - b.x);
    }

    public get(x: number): number {
        if (this.points.length === 0) return 0;
        if (x <= this.points[0].x) return this.points[0].y;
        if (x >= this.points[this.points.length - 1].x) return this.points[this.points.length - 1].y;

        for (let i = 0; i < this.points.length - 1; i++) {
            const p1 = this.points[i];
            const p2 = this.points[i + 1];
            if (x >= p1.x && x <= p2.x) {
                const t = (x - p1.x) / (p2.x - p1.x);
                return p1.y + t * (p2.y - p1.y);
            }
        }
        return 0;
    }
}
