/**
 * Типы для системы крафтинга
 */

export interface RecipeIngredient {
  id: number;
  count: number;
}

export interface CraftingRecipe {
  result: { id: number; count: number };
  ingredients?: RecipeIngredient[];
  pattern?: string[];
  keys?: Record<string, number>;
}

export interface SmeltingRecipe {
  input: number;
  output: number;
  count: number;
}

export interface FuelItem {
  id: number;
  burnTime: number;
}
