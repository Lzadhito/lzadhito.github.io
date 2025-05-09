<script lang="ts" setup>
const { data } = await useAsyncData(() => queryCollection("content").all());
</script>

<template>
  <div class="prose max-w-screen md:-m-6 md:p-4 h-screen">
    <div class="grid grid-cols-1 md:grid-cols-2 items-center h-full md:gap-4">
      <div class="px-4 min-h-screen md:min-h-auto flex flex-col justify-center">
        <h1 class="text-white">Laksamana Adhito</h1>
        <p class="text-neutral-400 text-md">
          Welcome! I am pouring everything I want about what I learn and for
          some point, I hope some could benefited from my writings. Regardless,
          opinions are my own.
        </p>
      </div>
      <div class="md:border-l max-h-96 px-4 min-h-32 grid items-center py-0">
        <NuxtLink v-for="blog in data" :to="blog.stem">
          <UCard class="text-white font-medium">
            {{ blog.title }}
          </UCard>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
