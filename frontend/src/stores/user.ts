import { writable } from 'svelte/store';

type User = { email: string } | null;

const userStore = writable<User | null>(); // undefined = not checked yet

export async function initUser() {
  try {
    const res = await fetch('/api/user', {
      credentials: 'include'
    });

    if (!res.ok) {
      userStore.set(null); // unauthenticated
      return;
    }

    const user = await res.json();
    userStore.set(user);
  } catch (err) {
    console.error('Error fetching user:', err);
    userStore.set(null);
  }
}

export { userStore };
