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

<style>
  .nyt-header {
      /* use flexbox to align items in a row and center them */
      display: flex;
      justify-content: center;
      position: relative;
      width: 100%;
      height: 10vh;
      margin: 2rem 0;
  }
    
  .date {
      /* use a different font for the date and adjust the size */
      font-size: 0.7rem;
      font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;

      /* positioning the date to the left side of the screen */
      position: absolute;
      left: 2rem;
      top: 50%;
      transform: translateY(-50%);   
  }

  #logo {
      /* adjust the size of the logo */
      height: 110%;
      max-width: 65%;
  }

  #todaysDate {
      /* bold the date */
      font-weight: 800;
  }

  main {
      /* display the articles in a 2x3 grid */
      display: grid;
      gap: 0 2rem;
      margin: 0 2rem;
      padding: 1rem 0;
      align-items: stretch;
  }

  .main-mobile {
      grid-template-areas:
          "a"
          "b"
          "c";
      grid-template-columns: 1fr;
  }

  .main-tablet {
      grid-template-areas:
          "a b";
      grid-template-columns: 1.5fr 1fr;
  }

  .main-desktop {
      grid-template-areas:
          "a b c";
      grid-template-columns: 1fr 1.5fr 1fr;
  }

  article img {
      /* resize the article images to take up the full width of the column */
      width: 100%;
  }

  article {
      /* add space to the top and bottom of each article */
      padding: 2rem 0;
      border-bottom: 1px solid var(--gray);
      height: 90%;
  }


  h2 {
      /* adjust size and weight of side column article titles */
      font-weight: 600;
      font-size: 2rem;
      line-height: 1.15;
  }

  .description {
      /* adjust size and color of article descriptions*/
      color: var(--gray);
      font-size: 1rem;
  }

  /* Login Button Styles */
  .login-button {
      position: absolute;
      right: 2rem;
      top: 0;
      z-index: 10;
  }

  .login-button a {
      display: inline-block;
      background-color: #6e7f91;
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      text-decoration: none;
      font-family: Arial, sans-serif;
      font-size: 14px;
      font-weight: bold;
      transition: background-color 0.3s ease;
  }

  .login-button a:hover {
      background-color: #5a6a7e;
  }

  /* Tablet view: show two columns when screen width is between 768px and 1024px */
  @media only screen and (min-width: 768px) {

  /* add right borders to the first column */
  .articles-wrapper:nth-child(2n+1) {
          padding-right: 2rem;
          border-right: 1px solid var(--gray);
      }
  }

  /* Desktop view: show one column when screen width goes over 1024px */
  @media only screen and (min-width: 1024px) {
      /* remove previous borders */
      .articles-wrapper:nth-child(2n+1) {
          padding-right: 0;
          border-right: none;
      }

      /* add borders to the middle column */
      .articles-wrapper:nth-child(3n+2) {
          border-left: 1px solid var(--gray);
          border-right: 1px solid var(--gray);
          padding: 0 2rem;
      }
  }

  /* Tablet and Mobile view: do not display todays date when screen width goes below 1024px */
  @media only screen and (max-width: 1024px) {
      .date {
          display: none;
      }
  }
</style>

<header class="nyt-header">
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
