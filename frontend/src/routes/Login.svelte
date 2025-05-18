<script lang="ts">
    import './login.css'
</script>
<header>
    <img src="./dex.svg" alt="dex logo" id="logo">
    <hr>
</header>

<div class="content">
    <div class="login-container">
        <p class="login-title">Log in to Your Account</p>

        <form id='form-fields'>
            <div class="form-group">
                <label for="email">Email Address</label>
                <input type="email" id="email" placeholder="email address" required />
            </div>

            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" placeholder="password" required />
            </div>

            <button type="submit" class="login-button-login">Login</button>
        </form>
    </div>
</div>