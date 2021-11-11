export default function ({ $axios }) {
  $axios.setHeader('Content-Type', 'application/json', ['post'])
  $axios.interceptors.response.use((res) => {
    return res.data
  })
}
