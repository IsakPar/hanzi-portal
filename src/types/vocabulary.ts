export interface Vocabulary {
  id: string;
  hanzi: string;
  pinyin: string;
  english: string;
  category: string;
  hskLevel: number;
  tags?: string[]; // JSON string in DB, parsed to array here
}

