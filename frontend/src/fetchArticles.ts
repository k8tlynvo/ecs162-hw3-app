export async function fetchArticles(searchTerm: string, page: number = 0): Promise<any[]> {
    try {
      const res = await fetch(`/api/articles?q=${encodeURIComponent(searchTerm)}&page=${page}`);
        const articles = await res.json();
        return articles;
    } catch (error) {
        console.error('Failed to fetch articles from backend:', error);
    return [];
  }
}