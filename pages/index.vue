<script lang="ts" setup>
// TODO: https://content.nuxt.com/docs/collections/define#collection-schema

import { format } from "date-fns";
const { data: rawData } = await useAsyncData(() =>
  queryCollection("content").all()
);
const data = (rawData?.value as any).filter((item: any) => item.meta.published);
</script>

<template>
  <div class="max-w-screen md:-m-6 md:p-8 h-screen">
    <div class="grid grid-cols-1 md:grid-cols-2 items-center h-full md:gap-4">
      <div
        class="px-4 min-h-screen md:min-h-auto flex flex-col justify-center space-y-4"
      >
        <h1 class="text-white text-3xl font-bold">Laksamana Adhito</h1>
        <p class="text-neutral-400 text-lg">
          Welcome! I am pouring everything I want about what I learn and for
          some point, <br />
          I hope some could benefited from my writings. Regardless, opinions are
          my own.
        </p>
      </div>
      <div
        class="md:border-l max-h-96 px-4 min-h-32 grid gap-4 items-center py-0.5 overflow-y-auto"
      >
        <NuxtLink v-for="blog in data" :to="blog.stem">
          <UCard class="text-white font-medium">
            <div class="space-y-1">
              <div>{{ blog.title }}</div>
              <div class="text-xs text-neutral-400">
                {{
                  blog.meta?.updatedAt
                    ? `Updated at: ${format(
                        blog.meta?.updatedAt,
                        "dd MMMM yyyy"
                      )}`
                    : format(blog.meta?.pubDate, "dd MMMM yyyy")
                }}
              </div>
              <div class="font-light text-neutral-400 text-sm">
                {{ blog.description }}
              </div>
            </div>
          </UCard>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
