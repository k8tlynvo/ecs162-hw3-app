export async function fetchArticles(query: string, page: number) {
  const res = await fetch(`/api/articles?q=${encodeURIComponent(query)}&page=${page}`);
  if (!res.ok) {
    throw new Error('Failed to fetch articles from backend');
  }
  return await res.json();
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
