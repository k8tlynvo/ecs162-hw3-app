<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';

  export let articleId: string;
  export let title: string;
  export let user: { email: string } | null;
  export let userType: string;

  const dispatch = createEventDispatcher();

  function handleClose() {
    dispatch('close');
  }

  let comments: any[] = [];
  let newComment = '';

  async function fetchComments() {
    const res = await fetch(`http://localhost:8000/articles/comments/${articleId}`, { credentials: 'include' });
    if (res.ok) {
      comments = await res.json();
    }
  }
  

  async function postComment() {
    if (!newComment.trim()) return;

    const res = await fetch('http://localhost:8000/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        article_id: articleId,
        text: newComment,
        parent_id: null
      }),
    });

    if (res.ok) {
      newComment = '';
      await fetchComments();
    }
  }

  function deleteComment(commentId: string) {
    fetch(`/comments/${commentId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
  }

  $: if (articleId) fetchComments();
</script>

<aside class="comments-sidebar">
  <header>
    <h3>{title}</h3>
    <button class="close-btn" on:click={handleClose}>✕</button>
    <hr>
  </header>

  <div>
    <h1>Comments {articleId}</h1>
    <p>{comments.length}</p>
    {#if user}
      <textarea bind:value={newComment} placeholder="Share your thoughts..."></textarea>
      <button on:click={postComment}>Submit</button>
    {:else}
      <p>Please log in to comment.</p>
    {/if}
  </div>
  

  <div class="comments-list">
    {#each comments as comment}
      <div class="comment">
        <strong>{comment.user?.email || 'Anonymous'}:</strong>
        <p>{comment.text}</p>
        <div>
          <p>Reply</p>
          {#if userType === "moderator"}
            <button on:click={() => deleteComment(comment._id)}>Delete</button>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</aside>

<style>
  .comments-sidebar {
    position: fixed;
    right: 0;
    top: 0;
    width: 400px;
    height: 100%;
    background: #fff;
    border-left: 1px solid #ccc;
    padding: 1rem;
    overflow-y: auto;
    box-shadow: -2px 0 5px rgba(0,0,0,0.1);
    z-index: 1000;
  }
  .close-btn {
    float: right;
  }
  textarea {
    width: 100%;
    height: 4em;
  }
</style>
