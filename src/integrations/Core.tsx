// File upload helper backed by Firebase Storage.
// AI features live in src/config/ai.ts (Gemini via /api/ai proxy) — never put API keys in client code.
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const UploadFile = async ({ file }: { file: File }) => {
  const storageRef = ref(storage, `uploads/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  const file_url = await getDownloadURL(storageRef);
  return { file_url };
};
