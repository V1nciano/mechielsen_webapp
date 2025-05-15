import { cookies as nextCookies } from "next/headers";

export async function cookies() {
  const cookieStore = await nextCookies();
  return {
    ...cookieStore,
    getAll() {
      return Array.from(cookieStore);
    },
  };
} 