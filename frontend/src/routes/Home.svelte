<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { fetchArticles } from '../fetchArticles';
    import './home.css';
  
    let apiKey: string = '';
    let articles: string | any[] = [];
    let query = 'davis/sacramento';
    let page = 0;
    let loading = false;
    let mainLayoutClass = '';
  
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = today.toLocaleDateString('en-US', options);
  
    function updateLayout() {
      const width = window.innerWidth;
      if (width < 768) {
        mainLayoutClass = 'main-mobile';
      } else if (width < 1024) {
        mainLayoutClass = 'main-tablet';
      } else {
        mainLayoutClass = 'main-desktop';
      }
    }
  
    async function loadArticles() {
      if (loading) return;
      loading = true;
      try {
        const newArticles = await fetchArticles(query, apiKey, page);
        articles = [...articles, ...newArticles];
        page += 1;
      } catch (error) {
        console.error('Failed to fetch articles:', error);
      } finally {
        loading = false;
      }
    }
  
    function handleScroll() {
      const bottom = Math.ceil(window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 100;
      if (bottom) { // if bottom of screen, load more articles
        loadArticles();
      }
    }
  
    onMount(async () => {
      updateLayout(); // get initial layout class
      window.addEventListener('resize', updateLayout);
      try {
        const res = await fetch('/api/key');
        const data = await res.json();
        apiKey = data.apiKey;
  
        if (apiKey) {
          // fetch articles
          await loadArticles();
          window.addEventListener('scroll', handleScroll);
        }
      } catch (error) {
        console.error('Failed to fetch API key:', error);
      }
    });
  
    onDestroy(() => {
      window.removeEventListener('resize', updateLayout);
      window.removeEventListener('scroll', handleScroll);
    });
  
</script>
<header>
    <div class="date">
        <p id="todaysDate" data-testid="todaysDate">{formattedDate}</p>
        <p>Today's Paper</p>
    </div>
    <div class="login-button">
        <a href="#/login">LOG IN</a>
    </div>
    <img src="./logo.svg" alt="New York Times logo" id="logo">
</header>
<!-- horizontal line dividing header and main section -->
<hr>
<main class="{mainLayoutClass}">

    {#if articles.length === 0}
        <p>Loading articles...</p>
    {:else}
        {#each articles as article}
        <div class="articles-wrapper">
            <article>
                <!-- each article has a title & description (and an optional image) -->
                {#if article.image}
                <img src={article.image} alt={article.headline} width="300" />
                {/if}
                <h2 class="title">{article.headline}</h2>
                <p class="description">{article.snippet}</p>
            </article>
        </div>
        {/each}
        {#if loading}
        <p>Loading more articles...</p>
        {/if}
    {/if}
</main>
