/** Internal shape of a mark inside the app (not exposed directly to clients). */
export interface Mark {
  id: number;
  studentId: number;
  subject: string;
  marks: number;
  createdAt: Date;
}

export interface MarkDraft {
  studentId: number;
  subject: string;
  marks: number;
}

export interface MarkListFilter {
  studentId?: number;
  subject?: string;
}

export interface SubjectMarkValue {
  subject: string;
  marks: number;
}
