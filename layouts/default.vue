<template>
  <div class="min-h-screen bg-gray-50">
    <AppSidebar />
    <div class="ml-64">
      <AppHeader />
      <main class="p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
