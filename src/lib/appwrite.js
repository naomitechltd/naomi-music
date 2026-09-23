import { Client, Account, TablesDB, Storage, Functions, ID, Query, Permission, Role } from "appwrite";

const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const tablesDB = new TablesDB(client);
export const storage = new Storage(client);
export const functions = new Functions(client);

export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
export const BUCKET_ID = import.meta.env.VITE_APPWRITE_BUCKET_ID;
export const SONGS_TABLE_ID = import.meta.env.VITE_APPWRITE_SONGS_TABLE_ID;
export const LIKES_TABLE_ID = import.meta.env.VITE_APPWRITE_LIKES_TABLE_ID;
export const PLAYLISTS_TABLE_ID = import.meta.env.VITE_APPWRITE_PLAYLISTS_TABLE_ID;
export const PLAYLIST_SONGS_TABLE_ID = import.meta.env.VITE_APPWRITE_PLAYLIST_SONGS_TABLE_ID;

export { ID, Query, Permission, Role };

export function fileUrl(fileId) {
  return `${import.meta.env.VITE_APPWRITE_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${fileId}/view?project=${import.meta.env.VITE_APPWRITE_PROJECT_ID}`;
}
