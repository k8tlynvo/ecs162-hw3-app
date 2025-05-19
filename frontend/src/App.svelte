<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { fetchArticles } from './fetchArticles';
    import AccountPanel from './lib/AccountPanel.svelte';
    import CommentsPanel from './lib/CommentsPanel.svelte';
    import { initUser, userStore } from './stores/user';
    import { get } from 'svelte/store';

    type User = { email: string } | null;
  
    let apiKey: string = '';
    let articles: any[] = [];
    let query = 'davis/sacramento';
    let page = 0;
    let loading = false;
    let mainLayoutClass = '';
    let user: User | null;
    let userType: string = 'guest'; // default to guest
    let selectedArticle: any = null // the current article id to show comments for
  
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
        const newArticles = await fetchArticles(query, page);
        // convert _id to string for each article
        const cleanedArticles = newArticles.map(article => ({
          ...article,
          _id: article._id?.toString() || article._id
        }));
        articles = [...articles, ...cleanedArticles];
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

    function openComments(article: any) {
      selectedArticle = article;
    }

    function closeComments() {
      selectedArticle = null;
    }


    function updateCommentCount(e:any) {
    const { articleId, count } = e.detail;
    articles = articles.map((a) =>
      a._id === articleId ? { ...a, commentCount: count } : a);
    }

  async function loadCommentCounts() {
    const counts = await Promise.all(
      articles.map(async (a) => {
        try {
          const res = await fetch(`/api/articles/${encodeURIComponent(a._id)}/comments`, {
            credentials: 'include'
          });
          if (!res.ok) throw new Error();
            const list = (await res.json()) as any[];
            return list.length;
        } catch (error) {
          console.error('Failed to load comments:', error);
        }
      })
    );
    // update the articles with the comment counts
    articles = articles.map((article, index) => ({ ...article, commentCount: counts[index] }));
  }
  
    onMount(async () => {
      updateLayout(); // get initial layout class
      window.addEventListener('resize', updateLayout);

      // initialize user session
      await initUser();
      user = get(userStore);
      if (!user) {
        userType = 'guest';
      }
      else {
        userType = user.email === 'user@hw3.com' ? 'user' : 'moderator';
      }
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

<header class="nyt-header">
    <div class="date">
        <p id="todaysDate" data-testid="todaysDate">{formattedDate}</p>
        <p>Today's Paper</p>
    </div>
    {#if user?.email}
      <AccountPanel {user} />
    {:else}
    <div class="login-button">
        <a href="http://localhost:8000/login">LOG IN</a>
    </div>
    {/if}
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
                <button on:click={() => openComments(article)}>
                  💬 {article.commentCount ?? 0} Comments
                </button>
            </article>
        </div>
        {/each}
        {#if loading}
        <p>Loading more articles...</p>
        {/if}
    {/if}
    <!-- Comments panel -->
    {#if selectedArticle}
      <CommentsPanel
        articleId={selectedArticle._id}
        title={selectedArticle.headline}
        user={user}
        userType={userType}
        on:close={closeComments}
        on:updateCount={updateCommentCount}
      />
    {/if}
</main>
