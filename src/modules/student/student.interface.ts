/** Internal shape of a student inside the app (not exposed directly to clients). */
export interface Student {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
}

export interface StudentDraft {
  name: string;
  email: string;
}
