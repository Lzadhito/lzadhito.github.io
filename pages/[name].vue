<script setup lang="ts">
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

  <div v-if="isAuthenticated" class="prose container text-white">
    <h1 class="text-white">
      <UButton
        icon="i-lucide-chevron-left"
        size="xl"
        variant="ghost"
        class="text-white"
        @click="$router.back()"
      />
      {{ data?.title }}
    </h1>
    <ContentRenderer v-if="data" :value="data" />
    <div v-else>Blog not found</div>
  </div>
</template>
