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
  let replyTextMap: Record<string, string> = {};
  let replyingTo: string | null = null;

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
  async function deleteComment(commentId: string) {
    try {
      const res = await fetch(`http://localhost:8000/api/comments/${commentId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (res.ok) {
        const result = await res.json();
        console.log(`Deleted ${result.deleted_count} comments`);

        // Update the comment in-place
        comments = comments.map(comment => {
          if (comment._id === commentId) {
            return { ...comment, text: 'comment was removed by moderator' };
          }
          // Also check replies
          if (comment.replies) {
            comment.replies = comment.replies.map(reply =>
              reply._id === commentId
                ? { ...reply, text: 'comment was removed by moderator' }
                : reply
            );
          }
          return comment;
        });

      } else {
        const error = await res.json();
        alert(`Failed to delete: ${error.error}`);
      }
    } catch (err) {
      console.error('Error deleting comment:', err);
      alert('Error deleting comment.');
    }
  }

  async function submitReply(commentId: string) {
    const text = replyTextMap[commentId]?.trim();
    if (!text) return;

    const payload = {
      article_id: articleId,
      parent_id: commentId,
      text
    };

    try {
      const res = await fetch("http://localhost:8000/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        replyTextMap[commentId] = '';
        await fetchComments(); // Refresh comments
      } else {
        alert(`Failed to add reply: ${data.error || JSON.stringify(data)}`);
      }
    } catch (err) {
      console.error('Error submitting reply:', err);
      alert('Error submitting reply.');
    }
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
        {#if comment.text !== 'comment was removed by moderator'}
          <div style="margin-top: 5px;">
            {#if user}
              <button on:click={() => replyingTo = comment._id}>Reply</button>
            {/if}
            {#if userType === "moderator"}
              <button on:click={() => deleteComment(comment._id)}>Delete</button>
            {/if}
          </div>
        {/if}

        {#if replyingTo === comment._id}
          <div style="margin-top: 10px;">
            <textarea
              bind:value={replyTextMap[comment._id]}
              placeholder="Write your reply..."
              rows="2"
              style="width: 100%;"
            ></textarea>
            <div style="margin-top: 5px;">
              <button on:click={() => submitReply(comment._id)}>Reply</button>
              <button on:click={() => { replyingTo = null; replyTextMap[comment._id] = ''; }}>Cancel</button>
            </div>
          </div>
        {/if}

        {#if comment.replies && comment.replies.length > 0}
          <ul style="margin-left: 20px; border-left: 1px solid #ccc; padding-left: 10px; margin-top: 10px;">
            {#each comment.replies as reply}
              <li style="margin-top: 5px;">
              <strong>{reply.user?.email || 'Anonymous'}:</strong> {reply.text}
              {#if reply.text !== 'comment was removed by moderator' && userType === 'moderator'}
                <button on:click={() => deleteComment(reply._id)}>Delete</button>
              {/if}
            </li>
            {/each}
          </ul>
        {/if}
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
