<template>
  <div class="min-h-screen flex items-center justify-center bg-background">
    <div class="w-full max-w-md p-8 space-y-6 bg-card rounded-lg border border-border shadow-lg">
      <div class="text-center">
        <h1 class="text-2xl font-bold text-foreground">Real Estate Management</h1>
        <p class="text-muted-foreground mt-2">Sign in to your account</p>
      </div>

      <!-- TODO: Implement login form -->
      <form class="space-y-4" @submit.prevent="handleLogin">
        <div>
          <label for="email" class="block text-sm font-medium text-foreground mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            class="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-foreground mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            class="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <button
          type="submit"
          class="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors"
        >
          Sign In
        </button>
      </form>

      <p class="text-center text-sm text-muted-foreground">
        Don't have an account?
        <a href="#" class="text-primary hover:underline">Contact administrator</a>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
// TODO: Import useAuth composable when implemented

const handleLogin = () => {
  // TODO: Implement login logic
  console.log('Login not implemented yet')
}
</script>
