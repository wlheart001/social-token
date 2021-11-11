<template>
  <div id="page-error">Not found page</div>
</template>

<script>
export default {
  name: 'Error',
  data() {
    return {}
  },
  methods: {
    t_(key) {
      return this.$t('error.' + key)
    },
  },
}
</script>
<style lang="stylus">
#page-error {
  justify-content: center;
}
</style>
