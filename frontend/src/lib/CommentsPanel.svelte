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

  function handleCancel() {
    newComment = '';
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
    <div class="panel-header">
      <h3>{title}</h3>
      <button class="close-btn" on:click={handleClose}>✕</button>
    </div>

    <hr>
  </header>

  <div>
    <div class="comments-header">
      <h1>Comments</h1>
      <h3>{comments.length}</h3>
    </div>

    {#if user}
      <div class="comment-form">
        <textarea 
          bind:value={newComment} 
          placeholder="Share your thoughts..."
          rows="3"
        ></textarea>
        <div class="form-actions">
          <button class="cancel-btn" on:click={handleCancel}>CANCEL</button>
          <button class="submit-btn" on:click={submitComment}>SUBMIT</button>
        </div>
      </div>
    {:else}
      <p>Please log in to comment.</p>
    {/if}
  </div>

  <div class="comments-list">
    {#each comments as comment}
      <div class="comment">
        <div class="comment-user">
          <div class="comment-avatar">
            <div class="avatar">{comment.user?.email[0]}</div>
          </div>
          <div class="comment-header">
            <span class="username">{comment.user?.email}</span>
          </div>
        </div>
        <div class="comment-content">
          <p class="comment-text">{comment.text}</p>
          {#if comment.text !== 'comment was removed by moderator'}
            <div class="comment-actions">
              {#if user}
                <button class="reply-btn" on:click={() => replyingTo = comment._id}>Reply</button>
              {/if}
              {#if userType === "moderator"}
                <button class="delete-btn" on:click={() => deleteComment(comment._id)}>Delete</button>
              {/if}
            </div>
          {/if}
        </div>

        {#if replyingTo === comment._id}
          <div style="margin-top: 10px;">
            <textarea
              bind:value={replyTextMap[comment._id]}
              placeholder="Write your reply..."
              rows="2"
              style="width: 100%;"
            ></textarea>
            <div style="margin-top: 5px;">
              <button class="reply-btn" on:click={() => submitReply(comment._id)}>Reply</button>
              <button class="cancel-btn" on:click={() => { replyingTo = null; replyTextMap[comment._id] = ''; }}>Cancel</button>
            </div>
          </div>
        {/if}

        {#if comment.replies && comment.replies.length > 0}
          <ul style="margin-left: 20px; border-left: 1px solid #ccc; padding-left: 10px; margin-top: 10px;">
            {#each comment.replies as reply}
              <div class="comment">
                <div class="comment-user">
                  <div class="comment-avatar">
                    <div class="avatar">{comment.user?.email[0]}</div>
                  </div>
                  <div class="comment-header">
                    <span class="username">{comment.user?.email}</span>
                  </div>
                </div>
                <div class="comment-content">
                  <p class="comment-text">{reply.text}</p>
                  <div class="comment-actions">
                    {#if reply.text !== 'comment was removed by moderator' && userType === 'moderator'}
                      <button class="delete-btn" on:click={() => deleteComment(reply._id)}>Delete</button>
                    {/if}
                  </div>
                </div>
              </div>
            {/each}
          </ul>
        {/if}
      </div>
    {/each}
  </div>
</aside>

<style>
  .panel-header {
    display: flex;
    justify-content: space-between;
  }
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

  .comments-header{
    display: flex;
    align-items: baseline;
    gap: 16px;
    border-bottom: 1px solid #f0f0f0;
  }

  .comment-user {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
  }

  .comments-header h3 {
    border-bottom: 1px solid #e0e0e0;
    color: #333333;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #666;
    padding: 0;
    margin: 0;
  }

  .comment-form {
    padding: 16px;
    border-bottom: 1px solid #f0f0f0;
  }

  textarea {
    width: 100%;
    height: 4em;
    margin-top: 1em;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    padding: 12px;
    font-size: 14px;
    margin-bottom: 8px;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .cancel-btn {
    background: none;
    color: #666;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    padding: 8px 12px;
    border: none;
  }

  .submit-btn, .reply-btn {
    background: #6792b4;
    color: white;
    border: solid 1px #666;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    padding: 8px 16px;
    cursor: pointer;
  }

  .submit-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .comments-list {
    overflow-y: auto;
    padding: 16px;
  }

  .comment {
    display: block;
    margin-bottom: 24px;
  }

  .comment-avatar {
    margin-right: 12px;
  }

  .avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background-color: #e0e0e0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 500;
    color: white;
    text-transform: uppercase;
  }

  .comment-content {
    flex: 1;
  }

  .comment-header {
    margin-bottom: 4px;
  }

  .username {
    font-weight: 800;
    font-size: 14px;
  }

  .comment-text {
    margin: 0 0 8px 0;
    color: #333;
    line-height: 1.4;
  }

  .comment-actions {
    display: flex;
    gap: 16px;
  }

  .reply-btn, .delete-btn {
    background: none;
    border: none;
    color: #666;
    font-size: 12px;
    cursor: pointer;
    padding: 0;
  }

  .reply-btn {
    color: #6792b4;
  }
</style>