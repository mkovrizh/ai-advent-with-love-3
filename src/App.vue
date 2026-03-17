<template>
    <q-layout view="hHh lpR fFf">
        <q-page-container>
            <RouterView />
        </q-page-container>
    </q-layout>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<style>
html, body, #app {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    background: var(--bg-page);
}
</style>