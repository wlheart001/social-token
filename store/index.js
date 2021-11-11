// vuex State management
const initState = {
  provider: {
    email: '',
    pubkey: '',
    address: '',
  },
  assets: [],
  lockHash: '',
}
const store = {
  // Strict mode
  strict: false,
  // data
  state() {
    return {
      ...initState,
      query: {
        success_url: '',
        pubkey: '',
        message: '',
        lang: '',
      },
      path: '',
    }
  },
  // get
  getters: {
    getUser(state) {
      return state.user
    },
  },
  // Sync update
  mutations: {
    setUser(state, user) {
      state.user = user
    },
    reload(state) {
      Object.assign(state, initState)
    },
  },
  // Async update
  actions: {
    // setUserAsync({ commit, state }, user) {
    //   commit('setUser', user)
    //   state.token = user
    // },
  },
  // modular
  modules: {},
}
export default store

// get
// this.$store.state.token
// this.$store.getters.getUser
// Sync update
// this.$store.state.token = 'test'
// this.$store.commit('setUser', 'test')
// Async update
// await this.$store.dispatch('setUserAsync', 'test')
