<script setup lang="ts">
import { format } from "date-fns";

const route = useRoute();
const { data } = await useAsyncData(route.params.name as string, () =>
  queryCollection("content").path(`/${route.params.name}`).first()
);

useSeoMeta({
  title: data?.value?.title,
});
definePageMeta({
  layout: "blog",
});

const password = ref("");
const showPassword = ref(false);
const isAuthenticated = ref(false);
const isError = ref(false);

const isOpenPasswordModal = computed(() =>
  Boolean(data.value?.meta?.password && !isAuthenticated.value)
);

function onSubmit() {
  if (password.value === data.value?.meta?.password) {
    isAuthenticated.value = true;
  } else {
    isError.value = true;
  }
}
</script>

<template>
  <UModal
    :title="data?.title"
    v-if="isOpenPasswordModal"
    :open="isOpenPasswordModal"
    :close="false"
  >
    <template #body>
      <UForm :state="password" class="space-y-4" @submit="onSubmit">
        <UFormField
          label="Password"
          :error="isError ? 'Ask Dito for the correct password' : undefined"
        >
          <UInput
            v-model="password"
            placeholder="Password"
            :type="showPassword ? 'text' : 'password'"
            :ui="{ trailing: 'pe-1' }"
          >
            <template #trailing>
              <UButton
                color="neutral"
                variant="link"
                size="sm"
                :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
                :aria-pressed="showPassword"
                aria-controls="password"
                @click="showPassword = !showPassword"
              />
            </template>
          </UInput>
        </UFormField>
        <UButton type="submit">Show</UButton>
      </UForm>
    </template>
  </UModal>

  <div class="m-auto max-w-3xl p-4">
    <div v-if="!isOpenPasswordModal" class="text-white">
      <div class="flex items-center text-white gap-4">
        <!-- <UButton
          icon="i-lucide-chevron-left"
          size="xl"
          variant="ghost"
          class="text-white"
          @click="$router.back()"
        /> -->
        <div>
          <h1 class="text-white mb-0 text-3xl font-bold">{{ data?.title }}</h1>
          <div class="text-neutral-400 text-base font-normal mt-2 space-y-2">
            <div class="font-bold text-sm">
              {{ format(data?.meta?.pubDate, "dd MMMM yyyy") }}
              {{
                data?.meta?.updatedAt
                  ? `, Updated At ${format(
                      data?.meta?.updatedAt,
                      "dd MMMM yyyy"
                    )}`
                  : ""
              }}
            </div>
            <div>
              {{ data?.description }}
            </div>
          </div>
        </div>
      </div>
      <USeparator class="mt-4" />
      <div class="prose text-white">
        <ContentRenderer v-if="data" :value="data" />
      </div>
    </div>
    <div v-if="!data">Blog not found</div>
  </div>
</template>
