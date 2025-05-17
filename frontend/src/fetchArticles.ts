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

//   const nytRes = await fetch(
//     `https://api.nytimes.com/svc/search/v2/articlesearch.json?q=${encodeURIComponent(searchTerm)}&page=${page}&api-key=${apiKey}`
//   );
//   const nytData = await nytRes.json();

//   return nytData.response.docs.map((doc: any) => ({
//       headline: doc.headline.main,
//       url: doc.web_url,
//       snippet: doc.snippet,
//       published_date: doc.pub_date,
//       image: doc.multimedia.default.url,
//   }));
