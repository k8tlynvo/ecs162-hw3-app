<script lang="ts">
  import Router from 'svelte-spa-router';
  import Home from './routes/Home.svelte';
  import Login from './routes/Login.svelte';

  const routes = {
    '/': Home,
    '/login': Login,
  };

</script>

<div>
  <Router {routes} />
</div>
