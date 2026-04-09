export interface BoardImage {
  url: string;
  sub_prompt: string;
}

export interface BoardFonts {
  heading: string;
  body: string;
}

export interface Board {
  id: string;
  user_id: string;
  prompt: string;
  palette: string[];
  fonts: BoardFonts;
  keywords: string[];
  images: BoardImage[];
  is_public: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  plan: string;
  credits_remaining: number;
  polar_customer_id: string | null;
  created_at: string;
}
