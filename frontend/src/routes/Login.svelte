<script lang="ts">
    import './login.css'
</script>
<style>
    .dex-header {
        display: block;
        height: 50px;
        background-color: white;
    }

    #dex-logo {
        height: 40px;
    }

    .content {
        flex: 1;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 20px;
        font-family: Arial, Helvetica, sans-serif;
    }

    .login-container {
        background-color: white;
        border-radius: 4px;
        border: solid gray;
        padding: 30px;
        width: 100%;
        max-width: 400px;
        display: flex;
        flex-direction: column;
        gap: 15px;
        align-items: center;
    }

    .login-title {
        text-align: center;
        color: #333;
        font-size: 20px;
        margin: 0;
    }

    .form-group {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding-bottom: 10px;
    }

    label {
        margin-bottom: 5px;
        color: #333;
        font-size: 14px;
        font-weight: bold;
    }

    input[type="email"],
    input[type="password"] {
        padding: 10px;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 14px;
        box-sizing: border-box;
        width: 230px;
    }

    .login-button-login {
        padding: 10px;
        background-color: #333;
        color: white;
        border: none;
        border-radius: 4px;
        font-size: 14px;
        cursor: pointer;
        width: 180px;
    }

    .login-button-login:hover {
        background-color: #444;
    }

    #form-fields {
        align-items: center;
        display: flex;
        flex-direction: column;
    }
</style>
<header class="dex-header">
    <img src="./dex.svg" alt="dex logo" id="dex-logo">
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