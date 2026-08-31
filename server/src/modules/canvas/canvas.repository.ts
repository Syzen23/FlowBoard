import type { Canvas } from "./canvas.types.js";

const canvases: Canvas[] = [];

export const canvasRepository = {
  findAll(): Canvas[] {
    return [...canvases];
  },

  findById(id: string): Canvas | null {
    return canvases.find((canvas) => canvas.id === id) || null;
  },

  create(canvas: Canvas): Canvas {
    canvases.push(canvas);
    return canvas;
  },

  update(id: string, updates: Partial<Omit<Canvas, "id" | "createdAt">>): Canvas | null {
    const index = canvases.findIndex((canvas) => canvas.id === id);
    if (index === -1) return null;

    const updatedCanvas = {
      ...canvases[index],
      ...updates,
      id,
      createdAt: canvases[index].createdAt,
      updatedAt: new Date().toISOString(),
    };

    canvases[index] = updatedCanvas;
    return updatedCanvas;
  },

  remove(id: string): boolean {
    const index = canvases.findIndex((canvas) => canvas.id === id);
    if (index === -1) return false;

    canvases.splice(index, 1);
    return true;
  },
};
