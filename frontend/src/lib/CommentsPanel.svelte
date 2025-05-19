<script lang="ts">
  import { createEventDispatcher } from 'svelte';

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

  // Fetch comments from backend
  async function fetchComments() {
    try {
      const res = await fetch(`http://localhost:8000/api/articles/${articleId}/comments`, {
        credentials: 'include',
      });
      if (res.ok) {
        comments = await res.json();
      } else {
        console.error('Failed to fetch comments:', await res.text());
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  }

  // Submit a comment using the tested working logic
  async function submitComment() {
    if (!newComment.trim()) return;
    
    const payload = {
      article_id: articleId,
      parent_id: null,
      text: newComment
    };
    console.log(payload)
    try {
      const res = await fetch("http://localhost:8000/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        newComment = '';
        await fetchComments(); // Refresh comments after posting
      } else {
        alert(`Failed to add comment: ${data.error || JSON.stringify(data)}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error submitting comment.");
    }
  }

  // Delete comment (only available for moderators)
  function deleteComment(commentId: string) {
    fetch(`/comments/${commentId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
  }

  // Fetch comments when article ID changes
  $: if (articleId) fetchComments();
</script>

<aside class="comments-sidebar">
  <header>
    <h3>{title}</h3>
    <button class="close-btn" on:click={handleClose}>✕</button>
    <hr>
  </header>

  <div>
    <h1>Comments for Article ID: {articleId}</h1>
    <p>Total: {comments.length}</p>

    {#if user}
      <textarea bind:value={newComment} placeholder="Share your thoughts..."></textarea>
      <button on:click={submitComment}>Submit</button>
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
    box-shadow: -2px 0 5px rgba(0, 0, 0, 0.1);
    z-index: 1000;
  }
  .close-btn {
    float: right;
  }
  textarea {
    width: 100%;
    height: 4em;
    margin-top: 1em;
  }
  .comments-list {
    margin-top: 1em;
  }
  .comment {
    border-top: 1px solid #eee;
    padding-top: 0.5em;
    margin-top: 0.5em;
  }
</style>
