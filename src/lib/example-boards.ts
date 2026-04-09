import { Board } from "@/types/board";

export const exampleBoards: Partial<Board>[] = [
  {
    id: "example-1",
    prompt: "Earthy wedding, terracotta + cream, rustic Italian",
    palette: ["#c96442", "#f5f0e8", "#8b6f4e", "#d4a574", "#2c2c2c"],
    fonts: { heading: "Cormorant Garamond", body: "Lato" },
    keywords: ["rustic", "terracotta", "olive", "linen", "vineyard", "golden hour", "clay", "warmth"],
    images: [],
  },
  {
    id: "example-2",
    prompt: "Minimalist Scandinavian living room, light wood + white",
    palette: ["#f7f5f0", "#c4b8a5", "#8a8178", "#d4cfc7", "#3d3833"],
    fonts: { heading: "DM Serif Display", body: "Work Sans" },
    keywords: ["hygge", "clean", "birch", "wool", "fog", "simplicity", "ceramic", "calm"],
    images: [],
  },
  {
    id: "example-3",
    prompt: "Moody botanical greenhouse, dark green + brass",
    palette: ["#2d4a3e", "#8b7355", "#1a1a1a", "#4a6b5a", "#c9b896"],
    fonts: { heading: "Playfair Display", body: "Source Sans Pro" },
    keywords: ["botanical", "moody", "fern", "brass", "glass", "verdant", "shadow", "lush"],
    images: [],
  },
];
