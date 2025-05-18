<script lang="ts">
    export let user: { email: string } | null;
    let isPanelOpen = false;
    
    function togglePanel() {
        isPanelOpen = !isPanelOpen;
    }
    
    function closePanel() {
        isPanelOpen = false;
    }
    
    function getGreeting() {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning.";
        if (hour < 18) return "Good afternoon.";
        return "Good evening.";
    }
</script>

<button class="acc-button" on:click={togglePanel}>
    <div>Account</div>
    <img src="./arrow.svg" alt="downwards arrow" id="arrow"/>
</button>

<!-- Side panel that slides in from the right -->
<div class="side-panel" class:open={isPanelOpen}>
    <div class="panel-header">
        <div class="user-email">{user?.email}</div>
        <button class="close-button" on:click={closePanel}>X</button>
    </div>

    <div class="panel-content">
        <p class="greeting">{getGreeting()}</p>
            
        <div class="logout-option">
            <a href="http://localhost:8000/logout">
                Log out
            </a>
        </div>
    </div>
</div>
  
<!-- Overlay that appears behind the panel when open -->
{#if isPanelOpen}
    <button class="overlay" on:click={closePanel} aria-label="overlay"></button>
{/if}


<style>

  .acc-button {
    position: absolute;
    right: 2rem;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    border: none;
    background-color: white;
    cursor: pointer;
  }

  #arrow {
    height: 20px;
  }

  .acc-button div {
    display: inline-block;
    background-color: white;
    color: black;
    padding: 4px;
    text-decoration: none;
    font-family: Arial, sans-serif;
    font-size: 14px;
    font-weight: bold;
  }
  
  .side-panel {
    position: fixed;
    top: 0;
    right: -30vw;
    width: 30vw;
    height: 100vh;
    background-color: white;
    box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    transition: right 0.3s ease;
    display: flex;
    flex-direction: column;
  }
  
  .side-panel.open {
    right: 0;
  }
  
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid #e0e0e0;
  }
  
  .user-email {
    font-weight: bold;
    font-size: 14px;
  }
  
  .close-button {
    background: none;
    border: none;
    font-size: 16px;
    cursor: pointer;
    color: #333;
  }
  
  .panel-content {
    padding: 20px;
    flex: 1;
    justify-content: space-between;
    display: flex;
    flex-direction: column;
  }
  
  .greeting {
    font-size: 24px;
    font-family: Georgia, 'Times New Roman', Times, serif;
    margin-bottom: 40px;
  }
  
  .logout-option {
    padding: 10px 0;
    margin-top: auto;
    font-weight: bold;
    cursor: pointer;
    width: fit-content;
    margin-bottom: 30px;
    border: none;
    background-color: white;
    font-family: Georgia, 'Times New Roman', Times, serif;
  }

  .logout-option a {
    text-decoration: none;
    color: black;
  }

  .logout-option:hover {
    text-decoration: underline;
  }
  
  
  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.3);
    z-index: 999;
  }
  
  /* Responsive adjustments */
  @media (max-width: 767px) {
    .side-panel {
      width: 100%;
      right: -100%;
    }
  }
</style>