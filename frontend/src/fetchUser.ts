export async function fetchUser(): Promise<{ email: string } | null> {
  try {
    const res = await fetch('/api/user', {
      credentials: 'include'
    });

    if (!res.ok) {
      return null;
    }

    const user = await res.json();
    return user;
  } catch (error) {
    console.error('Failed to fetch user from backend:', error);
    return null;
  }
}