/** Internal shape of a user inside the app (not exposed directly to clients). */
export interface User {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
}
